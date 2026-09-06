# FlowSynq

FlowSynq is a port operations and trade logistics platform built for managing demand data, inventory, shipment workflows, import approvals, sanctions screening, forecasting, and operational decision support. The project combines a Node.js/Express backend, a React + Vite frontend, and a Python optimization and forecasting service to support day-to-day running of port and supply-chain operations.

This repository is structured as a full-stack application for operational teams, analysts, organizations, and administrators. It includes real-time notifications, role-based access, subscription and billing flows, and deployment configuration for Render.

## Overview

FlowSynq supports the full operational lifecycle of a port or logistics hub:

- Inventory and tank monitoring
- Demand recording and approval workflows
- Shipment and import request management
- Sanction checks and compliance validation
- Forecasting and planning recommendations
- Real-time dispatch and operator alerts
- Cost analytics and operational performance reporting
- Organization subscription and demo access management

## Core features

### Port and inventory operations
- Tank asset tracking and management
- Daily port operations dashboards
- Dock and berth management views
- Operational recommendations and action queues

### Demand and planning
- Demand entry for analysts and operational users
- Admin approval and rejection flows
- Forecasting dashboards using predictive models
- Supply planning and historical planning views

### Shipment and import workflows
- Organization shipment request submission
- Operator and admin review and sanction verification
- Import request generation and response handling
- Notification-driven status updates

### Compliance and risk controls
- Sanctioned list management
- Shipment risk monitoring jobs
- Compliance enforcement before approval
- Demo and restricted access protections for read-only workflows

### Real-time collaboration
- Socket.IO live updates and notifications
- Emergency and operational alerts
- Notification center for user activity and status updates

### Billing and access
- Stripe-based demo payment flow
- Organization subscription billing
- Role-based access and operational gating
- Health and email verification endpoints for deployment monitoring

## User roles

The application supports multiple access roles:

- Admin: full operational and approval access
- Analyst: demand entry and analytics access
- Operator: shipment and import operations and monitoring
- Organization: shipment request and billing workflows

## Tech stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO
- JWT authentication
- Stripe integration
- Nodemailer-based email handling

### Frontend
- React
- Vite
- React Router
- Recharts for dashboards
- Leaflet and react-leaflet for location-aware views
- Axios for API calls

### AI and optimization services
- Python service(s) under optimization_service/
- Forecasting and predictive analytics support
- Recommendation and optimization processing

## Repository structure

```text
.
├── .api/                     # Local API contract and documentation files
├── controllers/             # Express controllers for business logic
├── docs/                    # Workflow documentation and operational notes
├── frontend/                # React front-end application
│   ├── src/                 # Frontend source code and pages
│   ├── package.json         # Frontend dependencies and scripts
│   └── .env.example         # Sample frontend environment file
├── jobs/                    # Background jobs and scheduled tasks
├── middleware/              # Authentication, uploads, and request middleware
├── models/                  # MongoDB schemas and data models
├── optimization_service/    # Python forecasting and optimization services
│   ├── main.py              # Optimization service entry point
│   ├── analytics_service.py # Analytics recommendation service
│   └── requirements.txt     # Python dependencies
├── routes/                  # Express route definitions
├── scripts/                 # Data generation, migration, and seed scripts
├── services/                # Shared business services for forecasting, sanctions, planning, and routing
├── uploads/                 # Uploaded files and media assets
├── utils/                   # Utility functions and helpers
├── .gitignore               # Git ignore rules
├── .env                     # Local environment config, not committed in production repos
├── package.json             # Backend dependencies and root scripts
├── render.yaml              # Render deployment blueprint
├── server.js                # Express server bootstrap
├── seed.js                  # Seed script for demo data
├── README.md                # Project documentation
└── package-lock.json        # Dependency lock file
```

## Key application flows

### Authentication and onboarding
- Email-based and OTP-assisted registration flow
- Login and logout via JWT
- Google login integration
- Profile updates and approval handling

### Demand and approvals
- Analyst enters demand data
- Admin reviews submissions
- Approvals or rejections are tracked within the app
- Approved records become part of downstream planning and analytics

### Shipment and import processing
- Organizations submit shipment requests
- Operators or admin users verify and approve requests
- Sanctions screening prevents unsafe or unauthorized approvals
- Import requests are tied to commodity and organization validation

### Forecasting and recommendation engine
- Demand and operational data feed forecasting logic
- Recommendation services surface planning insights
- Optimization service supports analytics and suggested decisions

### Notifications and alerts
- Live event-based real-time alerts
- User notification inbox and read status
- Background operational notices for response workflows

### Billing and demo access
- Stripe-powered demo payment flow
- Organization recurring billing and subscription tracking
- Restricted demo-user access for read-only workflows

## Environment setup

Create a root `.env` file before starting the app. Keep secrets in local environment variables and do not commit real credentials to version control.

Example:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/flowsynq
JWT_SECRET=replace_with_a_long_random_string
SESSION_SECRET=replace_with_a_long_random_string
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com

# Email / SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM=your_email@example.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# External APIs
OPENWEATHER_API_KEY=your_openweather_key
SEAROUTES_API_KEY=your_searoutes_key
PYTHON_AI_URL=http://localhost:8000
OPTIMIZATION_SERVICE_URL=http://localhost:8000
ANALYTICS_SERVICE_URL=http://localhost:8000/analytics/recommendations

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_demo_webhook_secret
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=your_subscription_webhook_secret

# Demo configuration
DEMO_DURATION_DAYS=7
DEMO_PORT_NAME=FlowSynq Demo Port

# OS / geography data
NOMINATIM_USER_AGENT=your_app_name
```

The frontend also uses a Vite environment file:

```env
VITE_API_URL=http://localhost:5001
```

See `frontend/.env.example` for the default local frontend sample.

## Local development

### 1) Install dependencies

```bash
npm install
cd frontend
npm install
cd ..
```

### 2) Install Python dependencies for forecasting services

```bash
python -m pip install -r optimization_service/requirements.txt
```

### 3) Start the application

Run the full stack in development mode:

```bash
npm run dev
```

This starts:

- Backend API on `http://localhost:5001`
- Frontend app on `http://localhost:5173`

You can also run each side separately:

```bash
npm start
```

```bash
cd frontend
npm run dev
```

## Useful project scripts

From the repository root:

```bash
npm run seed                 # Seed base application data
npm run generate:demand365   # Generate 365 days of demand data
npm run generate:shipment365 # Generate 365 days of shipment data
npm run fix:user-ports       # Repair user port assignments
npm run seed:emergency       # Seed emergency test records
npm run migrate:shipment-risk # Update shipment risk related fields
```

## Health checks and operational endpoints

The backend exposes monitoring endpoints:

- `GET /health` — basic service health and environment status
- `GET /health/email` — verify email connectivity
- `GET /health/email/test` — dispatch a test email to a configured address

These are useful for deployment verification and troubleshooting.

## Deployment

The repository includes a Render deployment configuration in `render.yaml`.

It provisions:

- backend web service
- Vite frontend static site
- Python optimization service
- Python analytics service

For production deployment, configure environment variables securely in Render or your hosting platform and do not check real credentials into the repository.

## Security and confidentiality notes

- Do not commit `.env` files or production secrets.
- Keep API keys, SMTP credentials, Stripe keys, and OAuth client secrets in the deployment platform secret store.
- Use placeholder values in documentation and examples.
- Validate that health checks and public docs do not expose internal credentials, private links, or sensitive customer data.

## Notes for contributors

- Backend logic lives under `controllers/`, `routes/`, and `services/`.
- Frontend pages and dashboard flow live in `frontend/src/pages/`.
- Data models are defined in `models/` and are central to schema changes.
- Use the Python service for forecasting-heavy work, while the Node backend handles API, auth, and operational workflows.
- If you add new environment variables, update both deployment configuration and this README.

## License

This project currently uses the ISC license as declared in the root `package.json` file.
