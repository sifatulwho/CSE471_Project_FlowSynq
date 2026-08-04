# Flowsynq - Render Deployment Guide

This guide will walk you through deploying your Flowsynq application on Render.

## Prerequisites
- Render account (sign up at https://render.com)
- GitHub repository with your code pushed
- MongoDB Atlas account (or use existing MongoDB)
- All necessary API keys ready

## Step 1: Prepare Your Project

### 1.1 Clean Up Your Repository
Remove unnecessary files from git tracking:
```bash
# Make sure .gitignore is properly set up
# Remove duplicate files if present
rm -f "(2).env"
rm -f "(2).gitignore"
rm -f "package-lock (2).json"
```

### 1.2 Create Production .env File
Create a `.env` file (don't commit it, but keep one locally for reference):
```
MONGODB_URI=<your-mongodb-atlas-uri>
JWT_SECRET=<your-jwt-secret>
SESSION_SECRET=<your-session-secret>
ADMIN_EMAIL=admin@flowsynq.org
CLIENT_URL=https://your-domain.onrender.com
GOOGLE_CLIENT_ID=<your-google-oauth-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-secret>
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/auth/google/callback
OPENWEATHER_API_KEY=<your-openweather-api-key>
SEAROUTES_API_KEY=<your-searoutes-api-key>
OPTIMIZATION_SERVICE_URL=https://your-optimization-service.onrender.com/optimize/dock-assignment
ANALYTICS_SERVICE_URL=https://your-analytics-service.onrender.com/analytics/recommendations
NOMINATIM_USER_AGENT=Flowsynq-Port-Geocoder/1.0 your-email@example.com
NODE_ENV=production
PORT=10000
```

### 1.3 Update Frontend Configuration
Edit [frontend/vite.config.js](frontend/vite.config.js) to use environment variables:
```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
}
```

Create [frontend/.env.production](frontend/.env.production):
```
VITE_API_URL=https://your-backend.onrender.com
```

### 1.4 Update Server Configuration
Ensure [server.js](server.js) uses correct environment variables:
- CLIENT_URL should accept RENDER_EXTERNAL_URL
- Add health check endpoint for Render

Add this to [server.js](server.js) after middleware setup:
```javascript
// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

## Step 2: Set Up MongoDB Atlas

If not already done:

1. Go to https://cloud.mongodb.com
2. Create a new cluster (free tier is available)
3. Create a database user with strong password
4. Get connection string and add to .env
5. Whitelist Render IP ranges (0.0.0.0/0 for development)

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 4: Create Services on Render

### 4.1 Deploy Backend (Node.js Express)

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `flowsynq-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Paid (recommended: Standard for production)
   - **Region**: Choose closest to your users

5. Click **Create Web Service**
6. Go to **Environment** tab and add all variables from .env:
   ```
   MONGODB_URI=<your-uri>
   JWT_SECRET=<your-secret>
   SESSION_SECRET=<your-secret>
   CLIENT_URL=https://<your-frontend-domain>.onrender.com
   GOOGLE_CLIENT_ID=<id>
   GOOGLE_CLIENT_SECRET=<secret>
   GOOGLE_CALLBACK_URL=https://<your-backend-domain>.onrender.com/api/auth/google/callback
   OPENWEATHER_API_KEY=<key>
   SEAROUTES_API_KEY=<key>
   OPTIMIZATION_SERVICE_URL=https://<optimization-service>.onrender.com/optimize/dock-assignment
   ANALYTICS_SERVICE_URL=https://<analytics-service>.onrender.com/analytics/recommendations
   NODE_ENV=production
   ```

7. Render will automatically deploy when you save environment variables

### 4.2 Deploy Frontend (Static Site / Using Build Service)

**Option A: Static Site (Simpler, Recommended)**

1. Go to **Dashboard** → **New +** → **Static Site**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `flowsynq-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. Click **Create Static Site**
5. Render will build and deploy automatically
6. Update backend `CLIENT_URL` to point to your frontend domain

**Option B: Using Web Service (if you need dynamic features)**

1. Go to **Dashboard** → **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `flowsynq-app`
   - **Environment**: `Node`
   - **Build Command**: 
     ```bash
     npm install && cd frontend && npm install && npm run build && cd ..
     ```
   - **Start Command**: `npm start` (modify server.js to serve frontend)
   - **Instance Type**: Standard

### 4.3 Deploy Python Services (Optimization & Analytics)

**For optimization_service:**

1. Go to **Dashboard** → **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `flowsynq-optimization`
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r optimization_service/requirements.txt
     ```
   - **Start Command**: 
     ```bash
     python optimization_service/main.py
     ```
   - **Region**: Same as backend

4. Click **Create Web Service**
5. Note the URL (e.g., https://flowsynq-optimization.onrender.com)

**For analytics_service:**

Repeat the same steps for analytics_service with:
- **Start Command**: `python optimization_service/analytics_service.py`
- **Name**: `flowsynq-analytics`

## Step 5: Update Environment Variables Across Services

### Backend Environment Variables
Update all services with:
- `OPTIMIZATION_SERVICE_URL=https://flowsynq-optimization.onrender.com/optimize/dock-assignment`
- `ANALYTICS_SERVICE_URL=https://flowsynq-analytics.onrender.com/analytics/recommendations`
- `CLIENT_URL=https://flowsynq-frontend.onrender.com` (from Static Site)

### Frontend Configuration
Create [frontend/.env.production](frontend/.env.production):
```
VITE_API_URL=https://flowsynq-backend.onrender.com
```

## Step 6: Configure CORS

Update [server.js](server.js) CORS configuration:
```javascript
app.use(cors({ 
  origin: [
    process.env.CLIENT_URL,
    'https://flowsynq-frontend.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

## Step 7: Update API Keys and Secrets

For each environment variable on Render:
1. Go to Service → Environment
2. Add/update all sensitive variables:
   - Google OAuth credentials
   - OpenWeather API key
   - SeaRoutes API key
   - JWT secrets
   - MongoDB URI

## Step 8: Verify Deployment

### Check Backend Health
```
curl https://flowsynq-backend.onrender.com/health
```
Expected response: `{"status":"ok"}`

### Check Frontend
Visit `https://flowsynq-frontend.onrender.com`

### Check Services in Action
1. Try login/registration
2. Test API calls
3. Check database connections
4. Verify Socket.io connections

## Troubleshooting

### Issue: Backend won't start
- Check logs: Service → Logs
- Verify MongoDB URI is correct
- Ensure all required environment variables are set
- Check Node version compatibility

### Issue: Frontend not loading API
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration in backend
- Check browser console for errors (F12)

### Issue: Python services not running
- Check Python version: `python --version` should be 3.8+
- Verify requirements.txt has all dependencies
- Check logs for import errors

### Issue: Database connection failing
- Whitelist Render IP: Add `0.0.0.0/0` to MongoDB Atlas network access
- Verify MongoDB URI includes correct credentials
- Test URI locally first

### Issue: Static site not building
- Check build command for typos
- Verify frontend/package.json exists
- Check frontend/dist is being generated
- Look at build logs for errors

## Performance Optimization

1. **Use Standard Instance** for paid tier in production
2. **Enable auto-scaling** if needed
3. **Optimize images** in frontend
4. **Use caching headers** for static assets
5. **Monitor logs** regularly for errors

## Security Checklist

- [ ] All API keys are environment variables (not hardcoded)
- [ ] JWT_SECRET is strong and unique
- [ ] MongoDB Atlas has IP whitelist configured
- [ ] CORS origin is restricted to your domain
- [ ] Google OAuth callback URL matches backend URL
- [ ] SSL/HTTPS is enabled (default on Render)
- [ ] No sensitive data in .env file committed to git

## Next Steps

1. Set up monitoring and alerts
2. Configure custom domain
3. Set up continuous deployment from GitHub
4. Monitor performance metrics
5. Plan backup strategy for MongoDB

---

**Need Help?**
- Render Documentation: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Express.js: https://expressjs.com/
- React: https://react.dev/
