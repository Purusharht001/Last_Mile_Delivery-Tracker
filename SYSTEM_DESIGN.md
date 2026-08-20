# System Design — Last-Mile Delivery Tracker

## Rate calculation engine

The engine lives in `rate-engine.ts` as a pure function with no database
access and no side effects: `(input, rateCard, codConfig) → breakdown`. Every
coefficient it uses — base fare, rate per kg, minimum charge, COD surcharge
type and value — is a parameter, sourced from the `RateCard` and
`CodSurchargeConfig` tables that admins manage through the API. Nothing is
hardcoded; changing a price is a data update, not a deploy.

The calculation follows the spec directly: volumetric weight is
`(L×B×H)/5000`; billable weight is the greater of actual and volumetric
weight, so oversized-but-light packages are billed fairly; the rate category
is `INTRA_ZONE` when pickup and drop resolve to the same zone and
`INTER_ZONE` otherwise; the matching `RateCard` is looked up by the unique
key `(orderType, category)` — four rows cover B2B/B2C × intra/inter, per the
spec's wording, rather than a combinatorial zone-pair table that isn't asked
for. Base charge is `max(baseFare + ratePerKg×billableWeight, minCharge)`,
so light packages never fall below a floor. COD orders add a surcharge — flat
or percentage-of-base, admin's choice — computed off the base charge, not
the total, so surcharge logic doesn't compound with itself.

Because the function is pure, it's unit-tested directly with no database or
HTTP mocking (20 cases covering both weight-billing directions, the minimum
charge floor, and each surcharge type). It's also reused twice: once behind
`POST /orders/quote`, which runs the full calculation with zero persistence
so the frontend can show a price before the customer commits, and again
inside `POST /orders` at creation time. The server always recomputes the
price from current rate cards; the client never gets to supply one. This
closes an obvious integrity gap — a customer confirming a quote and a stale
or tampered price reaching the database are structurally the same bug if the
client is trusted, so it isn't.

## Zone detection

Zones are admin-defined regions; `Area` rows map individual pincodes to a
zone. This is deliberately a flat lookup table rather than geocoding or
polygon math — it matches how logistics rate cards are actually built (by
serviceable pincode), it's trivial for admins to manage and audit, and it
makes zone detection an O(1) unique-key lookup with no external geocoding
dependency or failure mode. Both quote and order creation resolve pickup and
drop pincodes to their `Area`/`Zone` up front; the resolved zone IDs drive
both the rate category decision and, for pickup, the auto-assignment zone
preference. An address with no matching `Area` fails the quote with a 422
rather than guessing a zone — a wrong zone silently produces a wrong price,
which is worse than an explicit "admin hasn't configured this pincode yet."

## Auto-assignment logic

Agent availability is modeled explicitly: `DeliveryAgent.status` is
`AVAILABLE`/`BUSY`/`OFFLINE`, set by the agent or admin, independent of order
state — an agent isn't implicitly "busy" just because they have one active
delivery, since real agents often carry several. The assignment engine
(`assignment-engine.ts`, also a pure function over a candidate list) filters
to `AVAILABLE` agents, prefers ones whose home zone matches the pickup zone,
and within that pool ranks by Haversine distance when both agent and pickup
coordinates are known, falling back to zone match alone otherwise since exact
GPS isn't always available. Ties break on each agent's current count of
non-terminal orders, so load balances across a zone's agents rather than
piling onto whoever ranks first. If no agent is available, the order stays
unassigned and visible to admin instead of raising an error that would abort
order creation — placing an order and finding an agent are separate
concerns, and a temporary agent shortage shouldn't block the former.

## Failed delivery handling

`FAILED` is a first-class status, not an error path bolted onto the state
machine. Reaching it via `PUT /orders/:id/status` fires the same notification
hook as every other transition, so the customer is emailed automatically.
Reschedule is a distinct, explicit action (`POST /orders/:id/reschedule`)
rather than a status the agent sets directly, because it captures data the
agent doesn't have — the customer's new preferred date — and because keeping
it customer/admin-initiated matches who actually decides when redelivery
happens. It records a `RescheduleRequest` linked to the specific failed
attempt, clears the stale agent assignment, and moves the order to
`RESCHEDULED`, from which the same auto/manual assignment path used for new
orders re-runs — the second attempt isn't special-cased logic, it's the
existing pipeline re-entered. Every attempt's history stays in one ordered,
append-only timeline, so support or the customer can see the full story:
first agent, failure reason, reschedule date, second agent, final outcome.
