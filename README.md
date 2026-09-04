# FlowSynq - Port Analytics & Operations Hub

FlowSynq is a comprehensive MVC web application designed for port analytics, inventory forecasting, and operator hub management. It is built using the MERN stack (MongoDB, Express, React, Node.js).

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

### Email Service Configuration

FlowSynq supports multiple email transports with automatic priority and fallback:

#### 1. Local Run (Gmail SMTP)
Pre-configured and works immediately out of the box in `.env`:
```env
EMAIL_PROVIDER=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=REDACTED_EMAIL
EMAIL_PASS=REDACTED_PASSWORD
EMAIL_FROM=REDACTED_EMAIL
```
*Note:* Gmail requires an **App Password** (16 characters without spaces) generated from Google Account -> Security -> 2-Step Verification -> App Passwords.

#### 2. Render Run (Cloud Deployment)
> **Important:** Render Free Tier blocks outbound SMTP traffic on ports **25, 465, and 587**. Direct SMTP connections will timeout or fail. For production emails on Render, use an HTTPS API (Port 443):

- **Option A: Resend (Recommended)**
  1. Sign up free at [resend.com](https://resend.com) (free 3,000 emails/month).
  2. Create an API key (`re_...`).
  3. In Render Dashboard -> Environment Variables, add:
     - `RESEND_API_KEY`: your Resend API key
     - `EMAIL_FROM`: `onboarding@resend.dev` (or your verified domain sender)

- **Option B: Brevo HTTPS API**
  1. Sign up at [brevo.com](https://brevo.com).
  2. Go to **SMTP & API -> API Keys** and generate an API key (starts with `xkeysib-`).
     *(Note: this is different from the Brevo SMTP key which starts with `xsmtpsib-`)*.
  3. In Render Dashboard -> Environment Variables, add:
     - `BREVO_API_KEY`: your Brevo API key
     - `EMAIL_FROM`: your verified Brevo sender email

- **Graceful Fallback Mode:**
  If running on Render or locally without external email credentials, the email service automatically prints formatted email messages (including verification OTPs, approval links, and demo passwords) directly into the server logs/stdout. User registration, OTP verification, and approvals will succeed smoothly without hanging or returning 500 errors!

#### 3. Verification & Health Checks
- Open `https://<backend-url>/health` to check general service and email configuration status.
- Open `https://<backend-url>/health/email` to perform an active email transport verification test.

Configure Stripe webhooks to:

- `https://<backend>.onrender.com/api/demo-requests/webhook`
- `https://<backend>.onrender.com/api/billing/webhook`

Use separate Stripe signing secrets for the two endpoints. Render environment variables are injected at
runtime/build time, so redeploy after changing them. Test the frontend from its
Render URL, not localhost. When changing any `VITE_*` value, trigger a new frontend deploy because Vite
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
