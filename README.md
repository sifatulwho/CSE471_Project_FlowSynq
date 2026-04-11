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
