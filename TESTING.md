# Manual Test Guide

Concrete inputs and pre-computed expected outputs for verifying the app end
to end, for both roles. Assumes a freshly-seeded database (`npm run seed` in
`backend/`) — the seeded zones, rate cards, and agent referenced below are
exactly what `prisma/seed.ts` creates.

App: **http://localhost:5173** · API: **http://localhost:4000/api**

## Seeded reference data

| | |
|---|---|
| Admin login | `admin@example.com` / `Admin123!` |
| Agent login | `agent1@example.com` / `Agent123!` (home zone: North, status: Available) |
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
**Input**: `admin@example.com` / `Admin123!` at `/login`
**Expected**: redirected to `/admin/orders`; top nav shows Orders/Zones/Rate cards/Agents/Place order + "Admin · ADMIN" chip.

### 2. Zones & Areas (`/admin/zones`)
**Input**: Zone name `East Zone`, code `EAST` → Add zone
**Expected**: appears in the Zones table immediately.

**Input**: Area name `Test Area`, pincode `700001`, zone `East Zone` → Add area
**Expected**: appears in the Areas table with zone = "East Zone". This pincode is now usable as a pickup/drop point.

### 3. Rate cards & COD (`/admin/rate-cards`)
**Input**: Order type `B2C`, Category `Intra-zone`, Base fare `35`, Rate/kg `12`, Min charge `45` → Save rate card
**Expected**: the B2C/Intra-zone row updates in place (upsert, not a duplicate row). Any *new* quote for B2C intra-zone now uses these numbers — re-run Test 1 in Part 2 after this and confirm the total changes accordingly. Revert to the original values (30/10/40) afterward if you want the worked examples below to stay valid.

### 4. Agents (`/admin/agents`)
**Input**: Name `Agent Two`, Email `agent2@example.com`, Password `Agent123!`, Home zone `South Zone` → Add agent
**Expected**: new row in the agent table, status `AVAILABLE`.

**Input**: change Agent Two's status dropdown to `Offline`
**Expected**: badge updates to `OFFLINE` immediately; this agent is now excluded from auto-assignment (verify via Part 3).

### 5. Orders (`/admin/orders`)
**Input**: Status filter = `CREATED`
**Expected**: only unassigned orders show.

**Input**: Zone filter = `South Zone`
**Expected**: only orders whose pickup *or* drop is in South Zone show.

**Input**: click "Auto-assign" on a `CREATED` order
**Expected**: status flips to `ASSIGNED`; Agent column populates. With only Agent One (North, Available) seeded, every auto-assign picks Agent One regardless of pickup zone (zone-match preferred, falls back to any available agent).

---

## Part 2 — Customer flows

### 1. Register
**Input**: Name `Test Customer`, Email any unused address, Password 8+ chars → Register
**Expected**: auto-logged-in, redirected to `/orders` (empty state: "No orders yet").

### 2. Place an order — worked examples

Go to `/orders/new`, fill the form, click **Get quote**, verify the breakdown *before* clicking confirm.

**Test A — B2C, Prepaid, intra-zone, actual weight dominates**
| Field | Value |
|---|---|
| Pickup / Drop pincode | `110001` / `110002` (same zone → intra) |
| L × B × H | 30 × 20 × 15 cm |
| Actual weight | 2 kg |
| Order type / Payment | B2C / Prepaid |

Expected: volumetric = 30×20×15/5000 = **1.8 kg**; billable = max(2, 1.8) = **2 kg**; category **INTRA ZONE**; base = 30 + 10×2 = **₹50**; COD surcharge **₹0**; **total ₹50**.

**Test B — B2C, COD, inter-zone, volumetric dominates**
| Field | Value |
|---|---|
| Pickup / Drop pincode | `110001` / `560001` (different zones → inter) |
| L × B × H | 40 × 30 × 20 cm |
| Actual weight | 3 kg |
| Order type / Payment | B2C / COD |

Expected: volumetric = 40×30×20/5000 = **4.8 kg**; billable = max(3, 4.8) = **4.8 kg**; category **INTER ZONE**; base = 50 + 15×4.8 = **₹122**; COD surcharge (flat) **₹25**; **total ₹147**.

**Test C — B2B, COD, inter-zone, percentage surcharge**
| Field | Value |
|---|---|
| Pickup / Drop pincode | `110001` / `560001` |
| L × B × H | 50 × 40 × 30 cm |
| Actual weight | 5 kg |
| Order type / Payment | B2B / COD |

Expected: volumetric = 50×40×30/5000 = **12 kg**; billable = max(5, 12) = **12 kg**; category **INTER ZONE**; base = 90 + 12×12 = **₹234**; COD surcharge (2% of base) = **₹4.68**; **total ₹238.68**.

**Test D — minimum charge floor**
| Field | Value |
|---|---|
| Pickup / Drop pincode | `110001` / `110001` (same pincode → intra) |
| L × B × H | 5 × 5 × 5 cm |
| Actual weight | 0.1 kg |
| Order type / Payment | B2C / Prepaid |

Expected: volumetric = 125/5000 = **0.025 kg**; billable = **0.1 kg**; raw base = 30 + 10×0.1 = 31, below the ₹40 floor → base = **₹40**; **total ₹40** (floor applied).

**Test E — unconfigured combination (negative test)**
Use a pincode you added to a *new* zone (e.g. `700001` from Part 1.2) as pickup, paired with `110001` as drop, order type B2B.
Expected: **"No rate card configured for B2B / INTER_ZONE..."** error (422) if you haven't configured that combination — confirms the engine never silently guesses a price.

Click **Confirm & place order** on any of A–D → redirected to the order detail page, status `CREATED`.

### 3. My orders / Order detail
**Input**: `/orders`
**Expected**: table lists only this customer's orders, with the correct total charge and status badge from step 2.

**Input**: click into an order
**Expected**: hero card shows pickup/drop/dimensions/charge exactly as computed; "Live 3D track" button top-right; tracking timeline shows one `CREATED` entry.

### 4. Live 3D tracking
**Input**: click "Live 3D track" on a `CREATED` order
**Expected**: full-screen 3D scene, banner reads "... — route preview, live motion begins once picked up", vehicle idle at the pickup marker, all telemetry cards visible (ETA/distance/battery/speed/temp), camera mode buttons (Drone/Chase/Destination) all switch views.

---

## Part 3 — Cross-role lifecycle

### Golden path
1. **Customer**: place an order (any Test A–D above) → status `CREATED`
2. **Admin** (`/admin/orders`): Auto-assign → status `ASSIGNED`, Agent One assigned
3. **Agent** (log in as `agent1@example.com`, go to `/orders`, open the order): click **Mark PICKED UP** → `PICKED_UP`
4. Repeat: **Mark IN TRANSIT** → `IN_TRANSIT`, then **Mark OUT FOR DELIVERY** → `OUT_FOR_DELIVERY`, then **Mark DELIVERED** → `DELIVERED`
5. **Any role**: open Live 3D track → destination ring is emerald green, ETA reads "Arrived", scrubber is full blue→green
6. **Customer**: check email notifications weren't sent for real (no SMTP configured) but were logged — see backend terminal output for `[email:skipped-no-smtp]` lines for every transition above, and check `Notification` rows exist (`status: FAILED` since delivery itself failed, not the order — see README's Notifications section)

### Failed delivery + reschedule path
1. Get an order to `ASSIGNED` (steps 1–2 above)
2. **Agent**: click **Mark FAILED**, type a reason in Notes (e.g. "Customer not available") → status `FAILED`
3. **Customer**: on the order page, a "Reschedule delivery" card appears → pick a future date → Reschedule
   **Expected**: status → `RESCHEDULED`, previous agent assignment cleared
4. **Admin**: Auto-assign again on this order
   **Expected**: status → `ASSIGNED` (same or different agent — with only one seeded agent it'll be Agent One again)
5. Walk it to `DELIVERED` as in the golden path
   **Expected**: the tracking timeline now shows *both* attempts in order — `CREATED → ASSIGNED → FAILED → RESCHEDULED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED` — nothing overwritten

---

## Part 4 — Negative / access-control tests

| Action | Expected |
|---|---|
| Agent tries to update a status not in `AGENT_NEXT_STATUS` for the order's current state (e.g. skip straight to DELIVERED) | 422 "Invalid transition from X to Y" |
| Agent tries to update an order not assigned to them | 403 "Order not assigned to you" |
| Customer opens another customer's order URL directly | 403 "Not your order" |
| Customer tries to place an order with someone else's `customerId` | 403 "Only admins can create orders on behalf of another customer" |
| Admin overrides status to anything, any time | Always succeeds (no transition check), history row tagged "Admin override" |
| Admin triggers auto-assign when zero agents are `AVAILABLE` | 409 "No available agents to auto-assign" |
| Reschedule attempted on a non-`FAILED` order | 422 "Only failed deliveries can be rescheduled" |

## Direct DB check (immutability)

```bash
docker exec -i last_mile_tracker-postgres-1 psql -U postgres -d last_mile_tracker \
  -c "UPDATE \"OrderStatusHistory\" SET notes='x';"
```
**Expected**: `ERROR: OrderStatusHistory is append-only: UPDATE is not permitted` — the trigger blocks it even with direct DB access, not just through the API.
