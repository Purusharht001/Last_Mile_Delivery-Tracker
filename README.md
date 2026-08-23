# Last-Mile Delivery Tracker

This is a delivery management platform that lets customers place orders and calculates their shipping charges automatically. It also includes an admin dashboard for managing delivery zones and pricing, plus an app for delivery agents to update statuses on the go.

## What I used to build it

- **Backend**: Node.js with Express, TypeScript, and Prisma ORM.
- **Database**: PostgreSQL.
- **Frontend**: React (Vite) and Tailwind CSS. I built a single dark-mode UI that adapts depending on whether you log in as a customer, agent, or admin.
- **Auth**: JWT and bcrypt for passwords.
- **Notifications**: Nodemailer for sending emails whenever a package updates.

## How to run it locally

You'll need Node.js and Docker installed.

### 1. Database
Spin up the local Postgres database:
```bash
docker compose up -d
```

### 2. Backend API
Open a terminal, go to the `backend` folder, and run:
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run db:harden
npm run seed
npm run dev
```
The `seed` command sets up some test zones, pricing rules, and a couple of user accounts so you don't have to start from scratch.
You can log in with `admin@example.com` (password: `Admin123!`) or as an agent using `agent1@example.com` (password: `Agent123!`).

### 3. Frontend App
Open another terminal for the React app:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Running Tests
I wrote some Jest tests for the pricing and assignment math. You can run them in the backend folder:
```bash
cd backend
npm test
```

## How the pricing works

All the pricing logic is in `backend/src/modules/orders/rate-engine.ts`. None of the prices are hardcoded - everything comes from the rate cards that the admin sets up.

1. It calculates the volumetric weight: `(L x B x H) / 5000`.
2. It compares that to the actual weight and bills you for whichever is heavier.
3. It checks if the pickup and drop-off are in the same zone (Intra-zone) or different zones (Inter-zone).
4. It looks up the right rate card based on the order type (like B2B vs B2C).
5. It calculates the base charge (with a minimum floor so we don't undercharge).
6. If the customer picked Cash on Delivery (COD), it tacks on the extra fee.

You get to see this price on the frontend before you hit confirm. Once you confirm, the server recalculates it from scratch just to be safe.

## Order tracking and history

Orders move through a standard flow: Created -> Assigned -> Picked Up -> In Transit -> Out for Delivery -> Delivered (or Failed).

Every single time the status changes, the database logs it in the `OrderStatusHistory` table. I even added a Postgres trigger that blocks anyone from editing or deleting those history logs, so there's a permanent, tamper-proof audit trail.

If a delivery fails, the customer gets an email and can log in to pick a new date. When they do, the system clears the old driver and puts it back in the queue to be reassigned.

## 3D Live Tracking

If you click "Live 3D track" on an order, it opens a really cool WebGL visualization built with three.js. It shows a low-poly truck driving along a route. 
Just a heads up: this is a visual simulation based on the order's timestamps and status. There are no actual GPS trackers on the drivers, so the truck's position is just calculated on the fly to give the user something nice to look at while they wait.

## Deployment (100% Vercel)

You can host this whole thing for free on Vercel. Here is how I set it up:

### 1. Database
- Make a free **Vercel Postgres** database in your Vercel dashboard.
- Grab the `POSTGRES_URL` from the settings.

### 2. Backend
- Create a new Vercel project and select this repo.
- Set the **Root Directory** to `backend`.
- Add your environment variables (like the database URL, JWT secret, and email SMTP details).
- For the build command, use `npm run prisma:deploy && npm run db:harden`.
- Deploy it. The `vercel.json` file handles all the serverless routing.

### 3. Frontend
- Create another Vercel project using the same repo.
- Set the **Root Directory** to `frontend`.
- Add `VITE_API_URL` pointing to the backend you just deployed.
- Hit deploy and you're done!

## System Design
Check out the `SYSTEM_DESIGN.md` file if you want to read more about how I built the zone mapping and assignment logic.
