# Manual Test Guide

Concrete inputs and pre-computed expected outputs for verifying the app end
to end, for both roles. Assumes a freshly-seeded database (`npm run seed` in
`backend/`) — the seeded zones, rate cards, and agent referenced below are
exactly what `prisma/seed.ts` creates. Checkboxes are there so this can
double as an actual run sheet — check each off (and jot a note) as you go.

App: **http://localhost:5173** · API: **http://localhost:4000/api**

**Contents**: [Quick smoke test](#quick-smoke-test-5-min) (start here) ·
[Seeded reference data](#seeded-reference-data) ·
[Part 1 — Admin](#part-1--admin-flows) ·
[Part 2 — Customer](#part-2--customer-flows) ·
[Part 3 — Cross-role lifecycle](#part-3--cross-role-lifecycle) ·
[Part 4 — Negative tests](#part-4--negative--access-control-tests) ·
[DB immutability check](#direct-db-check-immutability)

---

## Quick smoke test (5 min)

Run this first for a fast "is everything alive" pass. Full detail with
worked math is in Parts 1–3 below.

- [ ] Admin logs in, lands on `/admin/orders`
- [ ] Customer registers, lands on `/orders` (empty)
- [ ] Customer places one order (Test A, below) → quote shows **₹50** before confirming
- [ ] Order appears in customer's `/orders` and in admin's `/admin/orders`
- [ ] Admin auto-assigns the order → status `ASSIGNED`, agent populated
- [ ] Agent logs in, sees the order in `/orders`, marks it through to `DELIVERED`
- [ ] Order's tracking timeline shows all transitions with timestamps + actor
- [ ] `/track/:id` opens for that order, shows the 3D scene with no console errors
- [ ] Backend terminal shows an `[email:skipped-no-smtp]` line for each status change

If all nine pass, the core system is working end to end.

---

## Seeded reference data

| | |
|---|---|
| Admin login | `admin@example.com` / `Admin123!` |
| Agent login | `agent1@example.com` / `Agent123!` (home zone: **North**, status: Available) |
| North Zone | pincodes `110001` (Connaught Place), `110002` (Daryaganj) |
| South Zone | pincodes `560001` (MG Road), `560002` (Shivajinagar) |

| Rate card | Base fare | Rate/kg | Min charge |
|---|---|---|---|
| B2C intra-zone | ₹30 | ₹10 | ₹40 |
| B2C inter-zone | ₹50 | ₹15 | ₹70 |
| B2B intra-zone | ₹60 | ₹8 | ₹80 |
| B2B inter-zone | ₹90 | ₹12 | ₹120 |

| COD surcharge | Type | Value |
|---|---|---|
| B2C | Flat | ₹25 |
| B2B | Percentage | 2% |

---

## Part 1 — Admin flows

### 1. Login
- [ ] **Input**: `admin@example.com` / `Admin123!` at `/login`
      **Expected**: redirected to `/admin/orders`; top nav shows Orders/Zones/Rate cards/Agents/Place order + "Admin · ADMIN" chip.

### 2. Zones & Areas (`/admin/zones`)
- [ ] **Input**: Zone name `East Zone`, code `EAST` → Add zone
      **Expected**: appears in the Zones table immediately.
- [ ] **Input**: Area name `Test Area`, pincode `700001`, zone `East Zone` → Add area
      **Expected**: appears in the Areas table with zone = "East Zone". This pincode is now usable as a pickup/drop point.

### 3. Rate cards & COD (`/admin/rate-cards`)
- [ ] **Input**: Order type `B2C`, Category `Intra-zone`, Base fare `35`, Rate/kg `12`, Min charge `45` → Save rate card
      **Expected**: the B2C/Intra-zone row updates in place (upsert, not a duplicate row).
      **Verify the effect**: re-quote Test A in Part 2 — total should now be 35 + 12×2 = **₹59**, not ₹50.
      **Then revert** to 30/10/40 so the rest of this guide's worked examples stay valid.

### 4. Agents (`/admin/agents`)
- [ ] **Input**: Name `Agent Two`, Email `agent2@example.com`, Password `Agent123!`, Home zone `South Zone` → Add agent
      **Expected**: new row, status `AVAILABLE`. (Keep this agent — Part 3's zone-preference test needs it.)
- [ ] **Input**: change Agent Two's status dropdown to `Offline`, then back to `Available`
      **Expected**: badge updates immediately each time; while Offline, this agent is excluded from auto-assignment.

### 5. Orders (`/admin/orders`)
- [ ] **Input**: Status filter = `CREATED`
      **Expected**: only unassigned orders show.
- [ ] **Input**: Zone filter = `South Zone`
      **Expected**: only orders whose pickup *or* drop is in South Zone show.
- [ ] **Input**: Order on behalf of a customer — go to `/orders/new`, enter a customer's user ID in the "Customer ID" field (grab one from a registered customer, or from `GET /api/auth/me` while logged in as that customer), fill the rest as normal, confirm
      **Expected**: order is created with that customer as owner, `createdBy` = the admin; it shows up in that customer's `/orders`, not the admin's.

---

## Part 2 — Customer flows

### 1. Register
- [ ] **Input**: Name `Test Customer`, Email any unused address, Password 8+ chars → Register
      **Expected**: auto-logged-in, redirected to `/orders` (empty state: "No orders yet").

### 2. Place an order — worked examples

Go to `/orders/new`, fill the form, click **Get quote**, verify the breakdown *before* clicking confirm.

- [ ] **Test A — B2C, Prepaid, intra-zone, actual weight dominates**
  | Field | Value |
  |---|---|
  | Pickup / Drop pincode | `110001` / `110002` (same zone → intra) |
  | L × B × H | 30 × 20 × 15 cm |
  | Actual weight | 2 kg |
  | Order type / Payment | B2C / Prepaid |

  volumetric = 30×20×15/5000 = **1.8 kg** → billable = max(2, 1.8) = **2 kg** → category **INTRA ZONE** → base = 30 + 10×2 = **₹50** → COD surcharge **₹0** → **total ₹50**

- [ ] **Test B — B2C, COD, inter-zone, volumetric dominates**
  | Field | Value |
  |---|---|
  | Pickup / Drop pincode | `110001` / `560001` (different zones → inter) |
  | L × B × H | 40 × 30 × 20 cm |
  | Actual weight | 3 kg |
  | Order type / Payment | B2C / COD |

  volumetric = 40×30×20/5000 = **4.8 kg** → billable = max(3, 4.8) = **4.8 kg** → category **INTER ZONE** → base = 50 + 15×4.8 = **₹122** → COD surcharge (flat) **₹25** → **total ₹147**

- [ ] **Test C — B2B, COD, inter-zone, percentage surcharge**
  | Field | Value |
  |---|---|
  | Pickup / Drop pincode | `110001` / `560001` |
  | L × B × H | 50 × 40 × 30 cm |
  | Actual weight | 5 kg |
  | Order type / Payment | B2B / COD |

  volumetric = 50×40×30/5000 = **12 kg** → billable = max(5, 12) = **12 kg** → category **INTER ZONE** → base = 90 + 12×12 = **₹234** → COD surcharge (2% of base) = **₹4.68** → **total ₹238.68**

- [ ] **Test D — minimum charge floor**
  | Field | Value |
  |---|---|
  | Pickup / Drop pincode | `110001` / `110001` (same pincode → intra) |
  | L × B × H | 5 × 5 × 5 cm |
  | Actual weight | 0.1 kg |
  | Order type / Payment | B2C / Prepaid |

  volumetric = 125/5000 = **0.025 kg** → billable = **0.1 kg** → raw base = 30 + 10×0.1 = 31, below the ₹40 floor → base = **₹40** → **total ₹40** (floor applied)

- [ ] **Test E — unconfigured combination (negative test)**
      Use pickup pincode `700001` (the East Zone area you added in Part 1.2) with drop `110001`, order type B2B.
      **Expected**: **"No rate card configured for B2B / INTER_ZONE..."** error (422), since no one has configured that combination — confirms the engine never silently guesses a price.

- [ ] Click **Confirm & place order** on Test A → redirected to order detail, status `CREATED`. Keep this order for Part 3.

### 3. My orders / Order detail
- [ ] **Input**: `/orders`
      **Expected**: table lists only this customer's orders, correct total charge and status badge.
- [ ] **Input**: click into the order from Test A
      **Expected**: hero card shows pickup/drop/dimensions/charge exactly as computed; "Live 3D track" button top-right; tracking timeline shows one `CREATED` entry.

### 4. Live 3D tracking
- [ ] **Input**: click "Live 3D track" on the `CREATED` order
      **Expected**: full-screen 3D scene; banner reads "... — route preview, live motion begins once picked up"; vehicle idle at the pickup marker; all six telemetry cards visible (ETA/distance/stops/battery/speed/temp).
- [ ] **Input**: click each of Drone / Chase / Destination
      **Expected**: camera smoothly flies to each view (top-down, behind-the-vehicle, orbiting the destination ring) — no jump cuts.
- [ ] **Input**: drag the bottom scrubber to the middle
      **Expected**: "Go live" button appears, vehicle jumps to that point on the route, telemetry numbers update to match; dragging to the *same* spot twice shows the *same* numbers both times (deterministic, not random). Click "Go live" to resume.

---

## Part 3 — Cross-role lifecycle

### Golden path
1. [ ] **Customer**: place an order (Test A) → status `CREATED`
2. [ ] **Admin** (`/admin/orders`): Auto-assign → status `ASSIGNED`, agent populated
3. [ ] **Agent** (log in as `agent1@example.com`, open the order from `/orders`): **Mark PICKED UP** → `PICKED_UP`
4. [ ] Repeat: **Mark IN TRANSIT** → `IN_TRANSIT`, then **Mark OUT FOR DELIVERY** → `OUT_FOR_DELIVERY`, then **Mark DELIVERED** → `DELIVERED`
5. [ ] **Any role**: open Live 3D track → destination ring is emerald green, ETA reads "Arrived", scrubber is fully blue→green
6. [ ] **Backend terminal**: an `[email:skipped-no-smtp]` line appears for every transition above (no SMTP configured locally, so it logs instead of sending — expected, see README)
7. [ ] **SMS stub**: still in the backend terminal, look for an `[sms:stub]` line if you've wired any SMS-triggering path — by default this app only sends email, so absence of `[sms:stub]` lines is correct unless you've customized `SmsChannel` usage

### Zone-preference auto-assignment (needs Agent Two from Part 1.4) ✅ verified live
With Agent One (North, Available) and Agent Two (South, Available) both present:
1. [ ] **Customer**: place an order with pickup pincode `110001` (North) → **Admin**: Auto-assign
       **Expected**: assigned to **Agent One** (home-zone match beats the other agent)
2. [ ] **Customer**: place an order with pickup pincode `560001` (South) → **Admin**: Auto-assign
       **Expected**: assigned to **Agent Two** — proves zone-based preference, not just "whichever agent is available"

### Failed delivery + reschedule path
1. [ ] Get an order to `ASSIGNED` (golden path steps 1–2)
2. [ ] **Agent**: **Mark FAILED**, with a reason in Notes (e.g. "Customer not available") → `FAILED`
3. [ ] **Customer**: a "Reschedule delivery" card appears on the order page → pick a future date → Reschedule
       **Expected**: status → `RESCHEDULED`, previous agent assignment cleared
4. [ ] **Admin**: Auto-assign again
       **Expected**: status → `ASSIGNED` (agent chosen by the same zone-preference logic as above)
5. [ ] Walk it to `DELIVERED` as in the golden path
       **Expected**: tracking timeline shows *both* attempts in full — `CREATED → ASSIGNED → FAILED → RESCHEDULED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED` — nothing overwritten or lost

### Responsive check
- [ ] Shrink the browser to ~390px wide (or open devtools device toolbar)
      **Expected**: standard pages (tables, forms) reflow to single-column; `/track/:id` collapses its telemetry cards into a horizontally-scrollable shelf above the scrubber, camera toggle moves under it.

---

## Part 4 — Negative / access-control tests

| # | Action | Expected |
|---|---|---|
| 1 | Agent updates a status not valid from the order's current state (e.g. skip straight to DELIVERED) | 422 "Invalid transition from X to Y" |
| 2 | Agent updates an order not assigned to them | 403 "Order not assigned to you" |
| 3 | Customer opens another customer's order URL directly | 403 "Not your order" |
| 4 | Customer tries to place an order with someone else's `customerId` | 403 "Only admins can create orders on behalf of another customer" |
| 5 | Admin overrides status to anything, any time | Always succeeds (no transition check), history row tagged "Admin override" |
| 6 | Admin triggers auto-assign when zero agents are `AVAILABLE` | 409 "No available agents to auto-assign" ✅ verified live |
| 7 | Reschedule attempted on a non-`FAILED` order | 422 "Only failed deliveries can be rescheduled" ✅ verified live |

Rows 6–7 were confirmed against the running API while writing this guide;
1–5 follow directly from the route/service code (`order.routes.ts`,
`order.service.ts`) — worth a live pass too if you're doing formal sign-off.

---

## Direct DB check (immutability)

```bash
docker exec -i last_mile_tracker-postgres-1 psql -U postgres -d last_mile_tracker \
  -c "UPDATE \"OrderStatusHistory\" SET notes='x';"
```
- [ ] **Expected**: `ERROR: OrderStatusHistory is append-only: UPDATE is not permitted` — the trigger blocks it even with direct DB access, not just through the API.
