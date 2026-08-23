# Last-Mile Delivery Tracker

A delivery management platform: customers and admins create orders with
auto-calculated charges, agents are assigned intelligently (manually or
automatically), and customers are notified by email at every step of the
delivery journey, including failed-delivery reschedules.

## Tech stack

- **Backend**: Node.js, TypeScript, Express, Prisma ORM
- **Database**: PostgreSQL
- **Frontend**: React (Vite), TypeScript, React Router, Tailwind CSS â€” one
  consistent dark glassmorphic design system across every page, for both
  admin and customer roles (`components/ui/` holds the shared primitives:
  `Card`, `Button`, `Input`/`Select`, `PageHeader`, `StatusBadge`)
- **Auth**: JWT, bcrypt password hashing, role-based (`CUSTOMER` / `AGENT` / `ADMIN`)
- **Notifications**: Email via SMTP (Nodemailer). SMS is a stubbed, swappable
  channel â€” see [Notifications](#notifications) below.

## Repo structure

```
/backend
  /prisma/schema.prisma       # data model
  /prisma/seed.ts             # zones, rate cards, admin + agent seed data
  /prisma/immutable-history.sql  # DB-level append-only trigger
  /src/modules/orders/rate-engine.ts        # pure charge calculation
  /src/modules/orders/assignment-engine.ts  # pure nearest-agent selection
  /src/modules/orders/order.service.ts      # orchestrates both + persistence
  /tests                      # Jest unit tests for both engines
/frontend
  /src/pages                  # customer / agent / admin screens
docker-compose.yml             # local Postgres for development
```

## Setup

### Prerequisites

- Node.js 18+
- Docker (for local Postgres) â€” or point `DATABASE_URL` at any Postgres 14+ instance

### 1. Database

```bash
docker compose up -d          # starts Postgres on localhost:5432
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # edit if your DB/SMTP creds differ
npm install
npm run prisma:migrate        # creates schema (prompts for a migration name first run)
npm run db:harden             # applies the append-only trigger on OrderStatusHistory
npm run seed                  # seeds zones, rate cards, admin + a demo agent
npm run dev                   # http://localhost:4000
```

Seeded logins (from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env`):
- Admin: `admin@example.com` / `Admin123!`
- Demo agent: `agent1@example.com` / `Agent123!` (home zone: North)

Seeded zones/pincodes: North (`110001`, `110002`), South (`560001`, `560002`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env          # VITE_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev                   # http://localhost:5173
```

### 4. Tests

```bash
cd backend
npm test                      # Jest: rate-engine.test.ts, assignment-engine.test.ts
```

## Rate calculation logic

Implemented as a pure function in
[`backend/src/modules/orders/rate-engine.ts`](backend/src/modules/orders/rate-engine.ts),
with **zero hardcoded rates** â€” every coefficient is read from the `RateCard`
and `CodSurchargeConfig` tables, which admins manage via the API/UI.

1. **Volumetric weight** = `(length Ã- breadth Ã- height) / 5000`
2. **Billable weight** = `max(actualWeight, volumetricWeight)`
3. **Category** = `INTRA_ZONE` if pickup and drop resolve to the same zone,
   else `INTER_ZONE`
4. **Rate card lookup**: `RateCard` is looked up by the unique key
   `(orderType, category)` â€” e.g. a B2B intra-zone shipment and a B2C
   inter-zone shipment hit different rows. If admin hasn't configured that
   combination, order creation fails with a 422 rather than silently
   defaulting.
5. **Base charge** = `max(rateCard.baseFare + rateCard.ratePerKg Ã- billableWeight, rateCard.minCharge)`
6. **COD surcharge** (only if `paymentType = COD`): looked up from
   `CodSurchargeConfig` by `orderType`, either a flat amount or a percentage
   of the base charge.
7. **Total charge** = `baseCharge + codSurcharge`

`POST /api/orders/quote` runs this with no side effects, so the frontend
shows the price before the customer confirms. `POST /api/orders` re-runs the
identical function server-side at creation time â€” the client never supplies
a price directly.

## Zone detection

Admin maintains `Zone` records and `Area` records (pincode â†’ zone). At quote
or order time, the pickup and drop pincodes are resolved to their `Area`,
which carries the `zoneId` used for both the intra/inter-zone rate decision
and (for pickup) the agent auto-assignment.

## Auto-assignment logic

Implemented in
[`backend/src/modules/orders/assignment-engine.ts`](backend/src/modules/orders/assignment-engine.ts):

1. Filter agents with `status = AVAILABLE`
2. Prefer agents whose `homeZoneId` matches the pickup zone (falls back to
   all available agents if none match)
3. Among that pool, if agent and pickup coordinates are both known, rank by
   Haversine distance
4. Tie-break by the agent's current active-order count, for load balancing
5. If no agent is available, the order stays unassigned (`CREATED`/`RESCHEDULED`)
   and is surfaced to admin, who can retry or assign manually

Manual assignment (`PUT /api/orders/:id/assign`) skips straight to step 5
with an admin-chosen agent.

## Order status lifecycle & immutable history

`CREATED â†’ ASSIGNED â†’ PICKED_UP â†’ IN_TRANSIT â†’ OUT_FOR_DELIVERY â†’ DELIVERED`,
with a `FAILED` branch that leads to `RESCHEDULED â†’ ASSIGNED` (re-entering
the pipeline for the new attempt). Agents can only move an order along the
transitions valid from its current status; admins can override to any status
directly.

Every transition â€” agent-driven or admin-override â€” writes a row to
`OrderStatusHistory` with the status, actor, actor role, optional notes, and
a timestamp. The application only ever `INSERT`s into this table. On top of
that, `prisma/immutable-history.sql` installs a Postgres trigger that raises
an exception on any `UPDATE` or `DELETE` against `OrderStatusHistory`, so the
audit trail can't be altered even by a bug or a future migration â€” verified
manually:

```sql
UPDATE "OrderStatusHistory" SET notes='x'; -- ERROR: append-only: UPDATE is not permitted
```

## Failed delivery & reschedule flow

1. Agent sets status to `FAILED` with a reason in `notes`
2. Customer is emailed a failed-delivery notification
3. Customer (or admin) calls `POST /api/orders/:id/reschedule` with a new
   date â†’ creates a `RescheduleRequest`, order moves to `RESCHEDULED`, the
   previous agent assignment is cleared
4. Admin re-runs auto-assignment (or assigns manually) â†’ order moves to
   `ASSIGNED` again, possibly with a different agent
5. The full history across both attempts remains visible in one timeline

## Notifications

`NotificationChannel` ([`backend/src/modules/notifications/notification.channel.ts`](backend/src/modules/notifications/notification.channel.ts))
is a small interface (`send(message): Promise<{success}>`). `EmailChannel`
is the production implementation (SMTP via Nodemailer â€” works with any
free-tier relay, e.g. Brevo, or a Gmail App Password for local testing). If
no SMTP credentials are configured, it logs instead of throwing, so the rest
of the order flow still works in local dev without email set up.

`SmsChannel` implements the same interface but logs instead of sending â€”
reliable free-tier SMS delivery isn't available without a paid provider.
Swapping in Twilio (or similar) means implementing `NotificationChannel`
and wiring it into `notification.service.ts`; no call sites change.

Every status transition (including reschedule) calls
`notifyOrderStatusChange`, which sends the email and persists a
`Notification` row recording whether delivery succeeded.

## Database schema

| Table | Purpose |
|---|---|
| `User` | customer / agent / admin accounts, role-based |
| `Zone` | admin-defined delivery zones |
| `Area` | pincode â†’ zone mapping (zone detection) |
| `DeliveryAgent` | 1:1 with a `User` (role=AGENT); home zone, live lat/lng, availability |
| `RateCard` | unique per `(orderType, category)`; base fare, rate/kg, minimum charge |
| `CodSurchargeConfig` | unique per `orderType`; flat or percentage COD surcharge |
| `Order` | full order record: addresses, dimensions/weight, computed charges, current status, assigned agent |
| `OrderStatusHistory` | append-only audit trail, one row per transition |
| `RescheduleRequest` | one row per reschedule, links back to the failed attempt |
| `Notification` | one row per notification attempt, channel + delivery status |

Full field-level detail is in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

## API reference

All routes are under `/api`. Authenticated routes require
`Authorization: Bearer <token>`.

### Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | â€” | Creates a `CUSTOMER` account |
| POST | `/auth/login` | â€” | Returns `{ token, user }` |
| GET | `/auth/me` | any | Current user |

### Zones & areas (admin manages, all roles can read)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/zones` | any | |
| POST | `/zones` | ADMIN | `{ name, code }` |
| PUT | `/zones/:id` | ADMIN | |
| GET | `/zones/areas` | any | |
| POST | `/zones/areas` | ADMIN | `{ name, pincode, zoneId }` |
| PUT | `/zones/areas/:id` | ADMIN | |

### Rate cards & COD config
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/rate-cards` | any | |
| PUT | `/rate-cards` | ADMIN | Upsert by `(orderType, category)` |
| GET | `/rate-cards/cod-surcharge` | any | |
| PUT | `/rate-cards/cod-surcharge` | ADMIN | Upsert by `orderType` |

### Agents
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/agents` | ADMIN | |
| POST | `/agents` | ADMIN | Creates a `User(role=AGENT)` + `DeliveryAgent` |
| PUT | `/agents/:id/status` | ADMIN or the agent themself | `{ status?, currentLat?, currentLng? }` |

### Orders
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders/quote` | any | No side effects â€” price preview |
| POST | `/orders` | any | Customer creates their own; admin may pass `customerId` to order on behalf of a customer |
| GET | `/orders` | any | Role-scoped (own orders for customer/agent); admin gets `?status=&zoneId=&agentId=` filters |
| GET | `/orders/:id` | any (owner or admin/agent) | Includes full `statusHistory` timeline |
| PUT | `/orders/:id/assign` | ADMIN | `{ agentId }` â€” manual assignment |
| POST | `/orders/:id/auto-assign` | ADMIN | Nearest-available-agent assignment |
| PUT | `/orders/:id/status` | AGENT (own orders) or ADMIN (any order, any status â€” override) | `{ status, notes? }` |
| POST | `/orders/:id/reschedule` | customer (own order) or ADMIN | `{ newDeliveryDate }` â€” only valid from `FAILED` |

## Live 3D tracking view

`/track/:id` (linked from the order detail page as "Live 3D track") is a
full-screen WebGL delivery visualization â€” animated low-poly vehicle on a
glowing route, glassmorphic HUD (ETA, distance, EV battery/speed/cargo temp,
a scrubbable timeline, three camera modes: Drone / Chase / Destination).

**This is a simulation layer, not real telemetry** â€” there's no GPS/IoT
backend behind it (Area rows only carry a pincode + zone, not lat/lng).
Position and telemetry are deterministic functions of `(order.status,
statusHistory timestamps, current time)`, implemented in
[`frontend/src/lib/geo-sim.ts`](frontend/src/lib/geo-sim.ts) and
[`frontend/src/lib/delivery-progress.ts`](frontend/src/lib/delivery-progress.ts) â€”
the same order always renders the same route, and scrubbing to a given
timeline position always shows the same numbers, rather than fabricating
fresh random values every time.

Built with `three` / `@react-three/fiber` / `@react-three/drei` +
`framer-motion`, styled with the same Tailwind design system as the rest of
the app. The route is lazy-loaded (`React.lazy` in `App.tsx`) since three.js
adds ~1MB to the bundle â€” it only downloads for users who open a live
tracking link.

Known scope limits: the header's tracking-ID field requires the full order
UUID (no backend prefix-search endpoint exists); "stops" always reads "1 of
1" since this app's order model is single-pickup/single-drop, not fabricated
multi-stop data; `navigator.vibrate` milestone haptics have no effect on iOS
Safari or desktop browsers.

## Deployment

- **Database**: Render PostgreSQL free tier (note: free instances expire
  after 90 days â€” Supabase's free tier is a longer-lived alternative if
  needed)
- **Backend**: Render Web Service â€” `npm install && npm run build && npm run prisma:deploy && npm run db:harden`
  as the build command, `npm start` to run; set `DATABASE_URL`, `JWT_SECRET`,
  `CORS_ORIGIN` (the Vercel URL), and SMTP env vars
- **Frontend**: Vercel â€” set `VITE_API_URL` to the Render backend's `/api` URL

## Design write-up

See [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md).
