# Flowsynq - Port Analytics & Operations Hub

Flowsynq is a comprehensive MVC web application designed for port analytics, inventory forecasting, and operator hub management. It is built using the MERN stack (MongoDB, Express, React, Node.js).

## Project Structure
- `frontend/`: React + Vite front-end application
- `controllers/`, `routes/`, `models/`, `middleware/`: Express.js MVC Backend

## Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB (Local instance or MongoDB Atlas cluster)

## Setup & Execution Guide

### 1. Environment Configuration
Ensure your environment variables are configured. Create or edit the `.env` file in the root directory to match your environment:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/flowsync
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@flowsynq.org

```

Configure the Stripe webhook endpoint as
`https://your-backend-host/api/demo-requests/webhook` and subscribe to
`checkout.session.completed`. Demo payments are always created server-side
for exactly USD 100; card details never pass through this application.
For Render, configure a second webhook endpoint at
`https://your-backend-host/api/billing/webhook` for organization subscription
events. Set its signing secret as `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`.

## Paid read-only demos

Unregistered visitors can request a demo at `/demo-request`. After Stripe
confirms the USD 100 payment, an administrator can approve the request from
`/dashboard/admin/demo-requests`. The applicant receives temporary credentials
by email. Demo accounts are server-enforced read-only accounts, isolated by
their demo flag and fixed demo port, and expire after `DEMO_DURATION_DAYS`.

## Organization subscriptions

Registered organizations must maintain an active recurring Stripe subscription
of **USD 100 per month** before submitting new shipment requests. Configure a
Stripe webhook for `/api/billing/webhook` with
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`, and
`invoice.payment_failed`, using `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`.
Organizations can subscribe or manage payment methods at
`/dashboard/billing`. Operators continue to receive and process requests
through sanction checking; expired organizations retain access to existing
requests but cannot create new ones.

### 2. Install Dependencies
Run the following commands to install all required packages for both the backend and frontend.

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Start the Application
You can run both the frontend and backend concurrently from the root directory using the configured `concurrently` script:

```bash
npm run dev
```

The application components will be available at:
- **Backend API & Socket.IO**: http://localhost:5001
- **Frontend Dashboard**: http://localhost:5173

### Render deployment

The repository includes `render.yaml` for the Node backend, Vite static
frontend, and both Python services. After creating the Blueprint, set every
`sync: false` variable on the corresponding service:

- Backend: `MONGODB_URI`, `JWT_SECRET`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `EMAIL_HOST`, `EMAIL_PORT`,
  `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `ADMIN_EMAIL`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`.
- Frontend: `VITE_GOOGLE_CLIENT_ID`.

Use the exact deployed frontend URL for `CLIENT_URL`, the backend URL for the
frontend `VITE_API_URL`, and the same Google OAuth client ID in both
`GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Add the deployed frontend
origin to Google Cloud Authorized JavaScript origins. Add the backend callback
URL only if using the OAuth callback flow.

For SMTP, set `EMAIL_PROVIDER=smtp`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`,
`EMAIL_PASS`, and `EMAIL_FROM`. For Brevo, use
`EMAIL_PROVIDER=brevo`, `EMAIL_HOST=smtp-relay.brevo.com`, `EMAIL_PORT=587`
(the application automatically retries Brevo on port 2525 if 587 is blocked),
your Brevo login email as `EMAIL_USER`, and the Brevo SMTP key as
`EMAIL_PASS`. `EMAIL_FROM` must be a verified Brevo sender. This is used by
registration OTP, approval emails, demo credentials, and operational
notifications.
If Render cannot connect to Gmail SMTP, use Resend instead: create and verify a
sender domain at `resend.com`, set `RESEND_API_KEY` and `EMAIL_FROM` in the
backend, and leave the SMTP variables present or remove them. When
`RESEND_API_KEY` is set, the application uses Resend's HTTPS API and bypasses
SMTP networking restrictions.

Configure Stripe webhooks to:

- `https://<backend>.onrender.com/api/demo-requests/webhook`
- `https://<backend>.onrender.com/api/billing/webhook`

Use separate Stripe signing secrets for the two endpoints. Configure Gmail
SMTP with an app password (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`); do not
use the Gmail account password. Render environment variables are injected at
runtime/build time, so redeploy after changing them.

After deployment, verify `https://<backend>.onrender.com/health` returns
`{"status":"ok"}` and `emailConfigured: true`. Then open
`https://<backend>.onrender.com/health/email`; it must return
`{"status":"ok","emailConfigured":true}`. Test the frontend from its
Render URL, not localhost. If `emailConfigured` is false, save the missing
SMTP variables in the Render backend service and redeploy.
When changing any `VITE_*` value, trigger a new frontend deploy because Vite
embeds those values at build time.

### 4. Database Seeding (Optional)
To populate the database with demonstration data for testing the dashboards and forecasting modules, open a new terminal and run:

```bash
# Seed initial users and base records
npm run seed

# Generate 365 days of demo demand and shipment data
npm run generate:demand365
npm run generate:shipment365
```

## Features
- **Operator Hub**: Real-time shipment tracking and emergency alerts via Socket.IO.
- **AI Forecasting**: Predictive inventory leveling and analytics.
- **Demand Approvals**: Admin interfaces for managing container throughput.
