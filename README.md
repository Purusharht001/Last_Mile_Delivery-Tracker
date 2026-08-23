# Last-Mile Delivery Tracker

A full-stack delivery management platform that lets customers place orders and calculates their shipping charges automatically. It also includes an admin dashboard for managing delivery zones and pricing, plus an app for delivery agents to update statuses on the go.

> **Note:** This project is fully deployable. To get it running you will need to set up your own PostgreSQL database, configure your own SMTP email credentials, and provide your own admin account details and JWT secret. Everything is driven by environment variables — see the detailed setup guide below.

## What I used to build it

- **Backend**: Node.js with Express, TypeScript, and Prisma ORM.
- **Database**: PostgreSQL.
- **Frontend**: React (Vite) and Tailwind CSS. I built a single dark-mode UI that adapts depending on whether you log in as a customer, agent, or admin.
- **Auth**: JWT and bcrypt for passwords.
- **Notifications**: Nodemailer for sending emails whenever a package updates.

---

## Prerequisites

Before you begin, make sure you have the following installed on your machine:

- **Node.js** (v18 or later) — [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker & Docker Compose** — [Download here](https://docs.docker.com/get-docker/) (needed for the local PostgreSQL database)
- **Git** — [Download here](https://git-scm.com/downloads)

---

## How to run it locally (step by step)

### Step 1 — Clone the repository

```bash
git clone https://github.com/Purusharht001/Last_Mile_Delivery-Tracker.git
cd Last_Mile_Delivery-Tracker
```

### Step 2 — Start the PostgreSQL database

The project includes a `docker-compose.yml` that spins up a local PostgreSQL 16 instance. Run:

```bash
docker compose up -d
```

This creates a database called `last_mile_tracker` with username `postgres` and password `postgres` on port `5432`. You can change these in `docker-compose.yml` if you like — just make sure the `DATABASE_URL` in your `.env` file matches.

To check that the database is running:
```bash
docker compose ps
```

### Step 3 — Set up the Backend

Open a terminal, navigate to the `backend` folder, and follow these steps:

```bash
cd backend
```

#### 3a. Create your environment file

```bash
cp .env.example .env
```

Now open `backend/.env` in any text editor and **fill in your own values**. Here is a reference for every variable:

| Variable | What it does | Example value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string. If you're using the included Docker Compose, the default works as-is. | `postgresql://postgres:postgres@localhost:5432/last_mile_tracker?schema=public` |
| `JWT_SECRET` | A long random string used to sign authentication tokens. **Change this to something unique and secret.** | `my-super-secret-random-key-12345` |
| `JWT_EXPIRES_IN` | How long a login session lasts. | `7d` |
| `PORT` | The port the backend API runs on. | `4000` |
| `CORS_ORIGIN` | The URL of your frontend (so the backend allows requests from it). | `http://localhost:5173` |
| `SMTP_HOST` | Your email provider's SMTP server. Brevo (free tier) or Gmail App Passwords both work. | `smtp-relay.brevo.com` |
| `SMTP_PORT` | SMTP port (usually 587 for TLS). | `587` |
| `SMTP_USER` | Your SMTP username / email. | `your-email@example.com` |
| `SMTP_PASS` | Your SMTP password or app-specific password. | `your-smtp-password` |
| `SMTP_FROM` | The "From" address that appears on notification emails. | `Last Mile Tracker <no-reply@yourdomain.com>` |
| `SEED_ADMIN_EMAIL` | The email for the initial admin account created by the seed script. **Use your own email.** | `admin@yourdomain.com` |
| `SEED_ADMIN_PASSWORD` | The password for the initial admin account. **Choose a strong password.** | `YourStrongPassword!` |

> **Important:** If you don't have an SMTP provider yet, you can leave `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` empty. The app will still work — it will just log email events to the terminal instead of actually sending them.

#### 3b. Install dependencies

```bash
npm install
```

#### 3c. Run database migrations

This creates all the tables and enums in your PostgreSQL database:

```bash
npm run prisma:migrate
```

#### 3d. Apply the immutable audit trail trigger

This adds a Postgres trigger that prevents anyone from editing or deleting order status history records:

```bash
npm run db:harden
```

#### 3e. Seed the database with test data

This populates your database with sample zones (North/South), pricing rate cards, areas with pincodes, and the admin + agent accounts you configured in your `.env`:

```bash
npm run seed
```

After seeding, you can log in with:
- **Admin**: the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`
- **Agent**: `agent1@example.com` / `Agent123!`

#### 3f. Start the backend server

```bash
npm run dev
```

The API will be available at `http://localhost:4000`. You can verify it's running by visiting `http://localhost:4000/health` in your browser — you should see `{"status":"ok"}`.

### Step 4 — Set up the Frontend

Open a **separate terminal**, navigate to the `frontend` folder:

```bash
cd frontend
```

#### 4a. Create your environment file

```bash
cp .env.example .env
```

Open `frontend/.env` and make sure it points to your backend:

```
VITE_API_URL=http://localhost:4000/api
```

If you changed the backend `PORT` in step 3a, update the URL here to match.

#### 4b. Install dependencies and start

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`. Open it in your browser to start using the app.

### Step 5 — Running Tests

I wrote some Jest tests for the pricing and assignment math. You can run them from the backend folder:

```bash
cd backend
npm test
```

---

## How the pricing works

All the pricing logic is in `backend/src/modules/orders/rate-engine.ts`. None of the prices are hardcoded — everything comes from the rate cards that the admin sets up.

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

---

## Deployment Guide

This project is fully deployable and can be hosted on any platform that supports Node.js and PostgreSQL. Below is a general guide, along with a specific example using **Vercel** (which has a generous free tier).

### What you will need for deployment

1. **A PostgreSQL database** — You can use any managed PostgreSQL service:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (free tier available)
   - [Neon](https://neon.tech/) (free tier available)
   - [Supabase](https://supabase.com/) (free tier available)
   - [Railway](https://railway.app/)
   - [AWS RDS](https://aws.amazon.com/rds/postgresql/), [Google Cloud SQL](https://cloud.google.com/sql), or any other provider

2. **An SMTP email service** for sending delivery notifications:
   - [Brevo](https://www.brevo.com/) (free tier — 300 emails/day)
   - [Gmail App Passwords](https://support.google.com/accounts/answer/185833) (for testing)
   - [SendGrid](https://sendgrid.com/), [Mailgun](https://www.mailgun.com/), etc.

3. **Your own secrets and credentials**:
   - A strong `JWT_SECRET` for signing authentication tokens
   - Your admin email and password for the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
   - Your SMTP credentials

### Example: Deploying to Vercel

#### Deploy the Backend

1. Create a new Vercel project and point it to this repository.
2. Set the **Root Directory** to `backend`.
3. Add all the environment variables from the table in Step 3a above. Use your production database URL instead of the local Docker one.
4. Set the **Build Command** to:
   ```
   npm run prisma:deploy && npm run db:harden
   ```
5. Deploy. The `vercel.json` file in the backend folder handles all the serverless routing automatically.
6. After the first deploy, run the seed command once (you can do this from the Vercel CLI or a local terminal connected to your production database):
   ```bash
   DATABASE_URL="your-production-database-url" npm run seed
   ```

#### Deploy the Frontend

1. Create another Vercel project using the same repository.
2. Set the **Root Directory** to `frontend`.
3. Add the environment variable `VITE_API_URL` pointing to your deployed backend URL (e.g., `https://your-backend.vercel.app/api`).
4. Deploy — that's it!

### Deploying to other platforms

This project can also be deployed to:
- **Railway** — supports both the backend and PostgreSQL in one place
- **Render** — free tier for web services + managed PostgreSQL
- **Fly.io** — great for containerized deployments
- **AWS / GCP / Azure** — for production-grade infrastructure
- **Any VPS** (DigitalOcean, Linode, etc.) — run Docker Compose in production

The key steps are always the same:
1. Provision a PostgreSQL database and get the connection URL.
2. Set all the environment variables listed in the table above.
3. Run `npm run prisma:deploy && npm run db:harden` to set up the database schema.
4. Run `npm run seed` once to populate initial data.
5. Build and serve the backend (`npm run build && npm start`).
6. Build the frontend (`npm run build`) and serve the `dist/` folder with any static hosting.

---

## System Design

Check out the `SYSTEM_DESIGN.md` file if you want to read more about how I built the zone mapping and assignment logic.
