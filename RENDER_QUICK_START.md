# Quick Start: Render Deployment Commands

## 1. Local Testing Before Deployment

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Test locally with production settings
NODE_ENV=production PORT=5001 npm start
```

## 2. Prepare for Deployment

```bash
# Clean up unnecessary files
rm -f "(2).env"
rm -f "(2).gitignore"  
rm -f "package-lock (2).json"

# Verify .gitignore is correct
cat .gitignore

# Check that sensitive files are ignored
git status

# Push to GitHub
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## 3. MongoDB Atlas Setup (One-time)

Visit https://cloud.mongodb.com:
1. Create cluster (free tier available)
2. Create database user
3. Whitelist IP: `0.0.0.0/0`
4. Get connection string
5. Keep the MONGODB_URI ready

## 4. Create Render Account

Visit https://render.com:
1. Sign up (free account available)
2. Connect GitHub repository
3. Go to Dashboard: https://dashboard.render.com

## 5. Deploy Services (In Order)

### Backend Service

```
Service: flowsynq-backend (Web Service)
Environment: Node
Build Command: npm install
Start Command: npm start
Region: Choose closest to users
Instance: Free (test) → Standard (production)

Environment Variables:
MONGODB_URI=<from MongoDB Atlas>
JWT_SECRET=<generate random string 32+ chars>
SESSION_SECRET=<generate random string 32+ chars>
ADMIN_EMAIL=admin@flowsynq.org
NODE_ENV=production
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
OPENWEATHER_API_KEY=<from OpenWeather>
SEAROUTES_API_KEY=<from SeaRoutes>
CLIENT_URL=<will update after frontend deployed>
OPTIMIZATION_SERVICE_URL=<will update after service deployed>
ANALYTICS_SERVICE_URL=<will update after service deployed>
```

**Wait for deployment ✓**

### Frontend Service

```
Service: flowsynq-frontend (Static Site)
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/dist
Environment Variables:
VITE_API_URL=https://flowsynq-backend.onrender.com
```

**Wait for deployment ✓**

### Update Backend Environment

Go back to backend service and update:
```
CLIENT_URL=https://flowsynq-frontend.onrender.com
GOOGLE_CALLBACK_URL=https://flowsynq-backend.onrender.com/api/auth/google/callback
```

### Optimization Service

```
Service: flowsynq-optimization (Web Service)
Environment: Python 3
Build Command: pip install -r optimization_service/requirements.txt
Start Command: cd optimization_service && python main.py
```

**Get the service URL, wait for deployment ✓**

### Analytics Service

```
Service: flowsynq-analytics (Web Service)
Environment: Python 3
Build Command: pip install -r optimization_service/requirements.txt
Start Command: cd optimization_service && python analytics_service.py
```

**Get the service URL, wait for deployment ✓**

### Final Backend Update

Go back to backend service environment and update:
```
OPTIMIZATION_SERVICE_URL=https://flowsynq-optimization.onrender.com/optimize/dock-assignment
ANALYTICS_SERVICE_URL=https://flowsynq-analytics.onrender.com/analytics/recommendations
```

## 6. Verify Deployment

```bash
# Check backend health
curl https://flowsynq-backend.onrender.com/health

# Check frontend loads
Visit: https://flowsynq-frontend.onrender.com

# Check logs (on Render dashboard)
# Service → Logs → Look for errors
```

## 7. Test Application

1. **Login/Registration Test:**
   - Visit frontend URL
   - Try register → Check if works
   - Try login → Check if works
   - Check user appears in MongoDB

2. **API Test:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Perform actions in app
   - Verify API calls go to backend URL
   - Check responses are valid

3. **Real-time Test:**
   - Open app in 2 browser windows
   - Perform action in one
   - Verify real-time update in other (Socket.io)

4. **Database Test:**
   - In MongoDB Atlas → Collections
   - Verify data is being stored
   - Check user records, shipments, etc.

## 8. Troubleshooting Commands

```bash
# View backend logs (via Render Dashboard)
Service → Logs → View all logs

# Check environment variables are set
Service → Environment → Verify all variables

# Redeploy service if needed
Service → Deploy → Latest Commit → Manual Deploy

# Check build errors
Service → Events → View build details
```

## 9. Common Issues & Fixes

### Frontend shows blank screen
```
1. Check browser console (F12 → Console)
2. Verify VITE_API_URL is set in Static Site environment
3. Check Network tab - are API calls reaching backend?
4. Rebuild: Service → Deploy → Manual Deploy
```

### Backend service crashes on start
```
1. Check logs for MongoDB error
2. Verify MONGODB_URI is correct
3. Verify MongoDB user password is correct
4. Whitelist Render IPs in MongoDB Atlas
5. Check all required env variables are set
```

### CORS errors in browser
```
1. Update CLIENT_URL in backend to match frontend URL
2. Verify CORS settings in server.js
3. Restart backend service
4. Clear browser cache
```

### Python services not starting
```
1. Check Python version (should be 3.8+)
2. Verify requirements.txt has all imports
3. Check main.py has PORT configuration
4. Look at logs for import/syntax errors
```

### API calls return 503 or gateway errors
```
1. Check if backend service is running
2. Verify OPTIMIZATION_SERVICE_URL is correct
3. Verify ANALYTICS_SERVICE_URL is correct
4. Restart services if needed
```

## 10. Environment Variables Cheat Sheet

```
BACKEND ENVIRONMENT VARIABLES:
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong_random_string_32_chars_or_more
SESSION_SECRET=strong_random_string_32_chars_or_more
ADMIN_EMAIL=admin@flowsynq.org
CLIENT_URL=https://flowsynq-frontend.onrender.com
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://flowsynq-backend.onrender.com/api/auth/google/callback
OPENWEATHER_API_KEY=xxx
SEAROUTES_API_KEY=xxx
OPTIMIZATION_SERVICE_URL=https://flowsynq-optimization.onrender.com/optimize/dock-assignment
ANALYTICS_SERVICE_URL=https://flowsynq-analytics.onrender.com/analytics/recommendations

FRONTEND ENVIRONMENT VARIABLES (Static Site):
VITE_API_URL=https://flowsynq-backend.onrender.com

OPTIMIZATION SERVICE:
(No special env vars needed unless service requires)

ANALYTICS SERVICE:
(No special env vars needed unless service requires)
```

## 11. Performance Tips

- Use Standard instance for production (better CPU, memory)
- Enable auto-scaling if needed
- Optimize images in frontend
- Monitor database query performance
- Set up caching headers

## 12. Security Checklist

✓ All secrets in environment variables
✓ No secrets in git repository
✓ CORS restricted to frontend domain
✓ MongoDB whitelist configured
✓ SSL/HTTPS enabled (default)
✓ Strong JWT and session secrets
✓ Google OAuth properly configured
✓ API keys from trusted sources

---

**Support:**
- Render Docs: https://render.com/docs
- Common Issues: https://render.com/docs/troubleshooting
- GitHub Issues: Check your repo for issues

**You're all set! Your Flowsynq app should now be live on Render.**
