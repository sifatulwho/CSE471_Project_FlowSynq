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

