# System Design

## How Pricing Works

You'll find the core pricing logic inside `rate-engine.ts`. I designed it to be completely standalone, so it doesn't talk directly to the database. Instead, you just pass it the inputs, and it calculates the final cost. Every single number it uses - like the base fare, per kg rate, minimums, and COD fees - is pulled from the admin-controlled rate cards. This means admins can change prices on the fly without needing a code deployment, and absolutely nothing is hardcoded.

The math follows the requirements closely. First, we figure out the volumetric weight using `(L x B x H)/5000`. Then, we compare that to the actual weight and bill the customer for whichever is higher, which keeps things fair for large but light packages. 
If the pickup and drop-off locations are in the exact same zone, it gets tagged as `INTRA_ZONE`. Otherwise, it's `INTER_ZONE`. We use this category plus the order type (B2B or B2C) to find the right rate card. I chose this approach over a massive table mapping every zone to every other zone because it's much simpler to manage.
The base charge uses a minimum floor to ensure we don't lose money on tiny packages. If it's a COD order, we add the surcharge right at the end based on the base charge. 

Because the code doesn't rely on the database, I was able to write a bunch of unit tests for it pretty easily. The app uses this exact same function in two places: once when you get a quote on the frontend, and again when the order is actually saved. By re-calculating it on the server during creation, we make sure nobody can tamper with the price on the frontend.

## Zone Mapping

Zones are just regions that the admin sets up. We link specific pincodes to these zones using an `Area` table. I went with a simple database lookup for this instead of dealing with complex GPS polygons or third-party geocoding APIs. It's how a lot of real logistics companies do it, and it makes finding a zone super fast. 
When someone tries to place an order, we check their pickup and drop pincodes right away. If a pincode isn't mapped to a zone yet, the system blocks the order and tells them, rather than guessing and charging the wrong amount.

## Finding the Right Agent

We track whether an agent is `AVAILABLE`, `BUSY`, or `OFFLINE`. This is a manual toggle because a delivery driver might be carrying three packages at once but still be available to pick up a fourth.

The assignment logic lives in `assignment-engine.ts`. When an order needs a driver, the code first looks for anyone who is `AVAILABLE`. Then, it tries to prioritize agents whose "home zone" matches the pickup location. If we have exact GPS coordinates, it sorts them by who is physically closest. 
If there's a tie, it gives the order to whoever currently has the fewest active deliveries so that one person doesn't get swamped. If literally no one is available, the order just stays in the queue. I didn't want the whole checkout process to crash just because drivers are busy, so the admin can just assign someone later.

## Handling Failed Deliveries

Sometimes deliveries fail, so `FAILED` is an actual status in the system, just like `DELIVERED`. When a driver marks a package as failed, the system sends out an email to the customer letting them know.

From there, the customer (or the admin) can pick a new date to try again. I made this a separate reschedule action instead of just letting the driver guess a new date, since the customer is the one who knows when they'll be home. 
When they reschedule, the old driver is removed, the order goes into a `RESCHEDULED` state, and it basically goes back into the pool to get assigned to someone else. The cool part is that the history timeline tracks everything. You can look at an order and see exactly what happened on the first attempt, why it failed, and who handled the second attempt.
