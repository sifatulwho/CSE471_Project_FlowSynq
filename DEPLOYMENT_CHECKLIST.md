# Flowsynq Deployment Checklist for Render

## Pre-Deployment Setup

### 1. Repository Preparation
- [ ] Code is pushed to GitHub (main/production branch)
- [ ] Unnecessary files are removed:
  - [ ] Remove `(2).env`
  - [ ] Remove `(2).gitignore`
  - [ ] Remove `package-lock (2).json`
- [ ] .gitignore excludes sensitive files:
  - [ ] `.env` (never commit this)
  - [ ] `node_modules/`
  - [ ] `uploads/`
  - [ ] `.env.local`

### 2. MongoDB Atlas Setup
- [ ] MongoDB Atlas account created
- [ ] Database cluster created (free or paid)
- [ ] Database user created with strong password
- [ ] Connection string obtained (MONGODB_URI)
- [ ] Network access configured:
  - [ ] IP whitelist includes `0.0.0.0/0` for development
  - [ ] Or specific Render IP ranges

### 3. API Keys & Credentials Gathered
- [ ] Google OAuth credentials:
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
- [ ] OpenWeather API key:
  - [ ] OPENWEATHER_API_KEY
- [ ] SeaRoutes API key:
  - [ ] SEAROUTES_API_KEY
- [ ] JWT Secret generated (strong random string)
- [ ] Session Secret generated (strong random string)

### 4. Domain & URL Planning
- [ ] Plan backend service URL: `https://flowsynq-backend.onrender.com`
- [ ] Plan frontend service URL: `https://flowsynq-frontend.onrender.com`
- [ ] Plan optimization service URL: `https://flowsynq-optimization.onrender.com`
- [ ] Plan analytics service URL: `https://flowsynq-analytics.onrender.com`

## Render Account Setup

- [ ] Render account created at https://render.com
- [ ] GitHub repository connected to Render
- [ ] Render dashboard accessed at https://dashboard.render.com

## Service Deployment Order

### Step 1: Deploy Backend Service
- [ ] Create Web Service:
  - [ ] Name: `flowsynq-backend`
  - [ ] Environment: Node
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`
  - [ ] Instance Type: Free (for testing) or Standard (for production)
- [ ] Add Environment Variables:
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET
  - [ ] SESSION_SECRET
  - [ ] CLIENT_URL (leave empty for now, update after frontend URL is known)
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] GOOGLE_CALLBACK_URL
  - [ ] OPENWEATHER_API_KEY
  - [ ] SEAROUTES_API_KEY
  - [ ] OPTIMIZATION_SERVICE_URL (leave empty for now)
  - [ ] ANALYTICS_SERVICE_URL (leave empty for now)
  - [ ] NODE_ENV=production
- [ ] Wait for deployment to complete
- [ ] Test health endpoint: `curl https://<backend-url>/health`

### Step 2: Deploy Frontend (Static Site)
- [ ] Create Static Site:
  - [ ] Name: `flowsynq-frontend`
  - [ ] Build Command: `cd frontend && npm install && npm run build`
  - [ ] Publish Directory: `frontend/dist`
- [ ] Add Environment Variables:
  - [ ] VITE_API_URL=`https://<backend-url>`
- [ ] Wait for deployment to complete
- [ ] Visit `https://<frontend-url>` to verify

### Step 3: Update Backend with Frontend URL
- [ ] Go to Backend Service → Environment
- [ ] Update `CLIENT_URL` to `https://<frontend-url>`
- [ ] Update `GOOGLE_CALLBACK_URL` to `https://<backend-url>/api/auth/google/callback`
- [ ] Save and redeploy backend

### Step 4: Deploy Optimization Service
- [ ] Create Web Service:
  - [ ] Name: `flowsynq-optimization`
  - [ ] Environment: Python 3
  - [ ] Build Command: `pip install -r optimization_service/requirements.txt`
  - [ ] Start Command: `python optimization_service/main.py`
  - [ ] Instance Type: Free
- [ ] Wait for deployment to complete
- [ ] Note the service URL

### Step 5: Deploy Analytics Service
- [ ] Create Web Service:
  - [ ] Name: `flowsynq-analytics`
  - [ ] Environment: Python 3
  - [ ] Build Command: `pip install -r optimization_service/requirements.txt`
  - [ ] Start Command: `python optimization_service/analytics_service.py`
  - [ ] Instance Type: Free
- [ ] Wait for deployment to complete
- [ ] Note the service URL

### Step 6: Update Backend with Service URLs
- [ ] Go to Backend Service → Environment
- [ ] Update `OPTIMIZATION_SERVICE_URL` to `https://<optimization-url>/optimize/dock-assignment`
- [ ] Update `ANALYTICS_SERVICE_URL` to `https://<analytics-url>/analytics/recommendations`
- [ ] Save and redeploy backend

## Verification & Testing

### Backend Verification
- [ ] Health check passes: `curl https://<backend-url>/health`
- [ ] MongoDB connection works (check service logs)
- [ ] All environment variables are loaded (check logs)
- [ ] Socket.io is running properly

### Frontend Verification
- [ ] Frontend loads without errors
- [ ] Can access dashboard
- [ ] Can see API calls in network tab (F12 → Network)
- [ ] API calls are going to correct backend URL

### Full Integration Testing
- [ ] Can register/login
- [ ] Can view dashboard
- [ ] Can create shipments
- [ ] Can create tanks
- [ ] Can view analytics
- [ ] Real-time updates work (Socket.io)
- [ ] Email notifications send (if configured)

### Service Integration Testing
- [ ] Optimization service responds correctly
- [ ] Analytics service responds correctly
- [ ] Recommendation engine works
- [ ] Forecast data loads

## Security Verification
- [ ] No sensitive data in git history
- [ ] All API keys are environment variables
- [ ] CORS is properly configured
- [ ] JWT secrets are strong (32+ characters)
- [ ] MongoDB connection uses strong password
- [ ] SSL/HTTPS is enabled (default on Render)
- [ ] Database backups are configured

## Production Optimization
- [ ] Instance types updated to Standard/Premium if needed
- [ ] Auto-scaling enabled if using paid instances
- [ ] Error monitoring set up (optional)
- [ ] Performance metrics monitored
- [ ] Email service properly configured
- [ ] Cronjobs are running (shipment risk job, etc.)

## Monitoring & Maintenance
- [ ] Set up alerts for service failures
- [ ] Check logs regularly for errors
- [ ] Monitor database usage
- [ ] Monitor API quota usage (OpenWeather, SeaRoutes)
- [ ] Plan for scaling if needed

## Custom Domain (Optional)
- [ ] Register custom domain
- [ ] Add custom domain to Render services
- [ ] Update CORS and callback URLs for custom domain
- [ ] Verify SSL certificate works

## Common Issues to Watch For

- [ ] MongoDB connection timeout → Check whitelist IP
- [ ] CORS errors → Check CLIENT_URL matches frontend domain
- [ ] API keys not working → Verify API keys are correct and service is up
- [ ] Frontend shows blank → Check build output, verify API_URL
- [ ] Socket.io not working → Check CORS configuration
- [ ] Python services crash → Check Python version (3.8+), check logs

---

**Estimated Deployment Time: 30-45 minutes**

Once all steps are complete, your Flowsynq application will be live on Render!
