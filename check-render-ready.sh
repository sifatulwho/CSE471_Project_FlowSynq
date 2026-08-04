#!/bin/bash
# Render Deployment Verification Script
# This script checks if your project is ready for Render deployment

echo "================================"
echo "Flowsynq Render Deployment Check"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
checks_passed=0
checks_failed=0
checks_warning=0

# Function to check file exists
check_file() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description exists"
    ((checks_passed++))
    return 0
  else
    echo -e "${RED}✗${NC} $description missing: $file"
    ((checks_failed++))
    return 1
  fi
}

# Function to check content in file
check_content() {
  local file=$1
  local content=$2
  local description=$3
  
  if grep -q "$content" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $description found in $file"
    ((checks_passed++))
    return 0
  else
    echo -e "${YELLOW}⚠${NC} $description not found in $file"
    ((checks_warning++))
    return 1
  fi
}

echo "1. Checking Project Structure..."
echo "================================"
check_file "package.json" "Root package.json"
check_file "server.js" "server.js"
check_file "frontend/package.json" "Frontend package.json"
check_file ".gitignore" ".gitignore file"
check_file "frontend/vite.config.js" "Frontend Vite config"
echo ""

echo "2. Checking Node Dependencies..."
echo "================================"
if [ -f "package.json" ]; then
  if grep -q "express" package.json; then
    echo -e "${GREEN}✓${NC} Express found"
    ((checks_passed++))
  fi
  if grep -q "mongoose" package.json; then
    echo -e "${GREEN}✓${NC} Mongoose found"
    ((checks_passed++))
  fi
  if grep -q "cors" package.json; then
    echo -e "${GREEN}✓${NC} CORS found"
    ((checks_passed++))
  fi
  if grep -q "socket.io" package.json; then
    echo -e "${GREEN}✓${NC} Socket.io found"
    ((checks_passed++))
  fi
else
  echo -e "${RED}✗${NC} package.json not found"
  ((checks_failed++))
fi
echo ""

echo "3. Checking Environment Variables Setup..."
echo "============================================"
if [ -f ".env.example" ]; then
  echo -e "${GREEN}✓${NC} .env.example exists"
  ((checks_passed++))
  
  if grep -q "MONGODB_URI" .env.example; then
    echo -e "${GREEN}✓${NC} MONGODB_URI template found"
    ((checks_passed++))
  fi
  if grep -q "JWT_SECRET" .env.example; then
    echo -e "${GREEN}✓${NC} JWT_SECRET template found"
    ((checks_passed++))
  fi
else
  echo -e "${YELLOW}⚠${NC} .env.example not found"
  ((checks_warning++))
fi

if [ -f ".env" ]; then
  echo -e "${YELLOW}⚠${NC} .env file exists - make sure it's in .gitignore"
  ((checks_warning++))
fi
echo ""

echo "4. Checking Server Configuration..."
echo "===================================="
if [ -f "server.js" ]; then
  check_content "server.js" "process.env.PORT" "Environment variable PORT usage"
  check_content "server.js" "process.env.MONGODB_URI" "Environment variable MONGODB_URI usage"
  check_content "server.js" "process.env.CLIENT_URL" "Environment variable CLIENT_URL usage"
  check_content "server.js" "app.get('/health'" "Health check endpoint"
else
  echo -e "${RED}✗${NC} server.js not found"
  ((checks_failed++))
fi
echo ""

echo "5. Checking Frontend Build Setup..."
echo "===================================="
if [ -f "frontend/vite.config.js" ]; then
  echo -e "${GREEN}✓${NC} Vite config exists"
  ((checks_passed++))
fi

if [ -d "frontend/src" ]; then
  echo -e "${GREEN}✓${NC} Frontend source directory exists"
  ((checks_passed++))
fi

if grep -q "build" frontend/package.json 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Build script found in frontend package.json"
  ((checks_passed++))
fi
echo ""

echo "6. Checking Python Services..."
echo "=============================="
if [ -d "optimization_service" ]; then
  echo -e "${GREEN}✓${NC} optimization_service directory exists"
  ((checks_passed++))
  
  if [ -f "optimization_service/requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} optimization_service requirements.txt exists"
    ((checks_passed++))
  fi
  
  if [ -f "optimization_service/main.py" ]; then
    echo -e "${GREEN}✓${NC} optimization_service main.py exists"
    ((checks_passed++))
  fi
else
  echo -e "${YELLOW}⚠${NC} optimization_service directory not found"
  ((checks_warning++))
fi

if [ -f "optimization_service/analytics_service.py" ]; then
  echo -e "${GREEN}✓${NC} analytics_service.py exists"
  ((checks_passed++))
fi
echo ""

echo "7. Checking Deployment Files..."
echo "==============================="
if [ -f "RENDER_DEPLOYMENT_GUIDE.md" ]; then
  echo -e "${GREEN}✓${NC} RENDER_DEPLOYMENT_GUIDE.md exists"
  ((checks_passed++))
fi

if [ -f "DEPLOYMENT_CHECKLIST.md" ]; then
  echo -e "${GREEN}✓${NC} DEPLOYMENT_CHECKLIST.md exists"
  ((checks_passed++))
fi

if [ -f "RENDER_QUICK_START.md" ]; then
  echo -e "${GREEN}✓${NC} RENDER_QUICK_START.md exists"
  ((checks_passed++))
fi

if [ -f "render.yaml" ]; then
  echo -e "${GREEN}✓${NC} render.yaml exists"
  ((checks_passed++))
fi
echo ""

echo "8. Checking Git Setup..."
echo "======================="
if [ -d ".git" ]; then
  echo -e "${GREEN}✓${NC} Git repository initialized"
  ((checks_passed++))
  
  if [ -f ".gitignore" ]; then
    if grep -q "node_modules" .gitignore 2>/dev/null; then
      echo -e "${GREEN}✓${NC} node_modules is in .gitignore"
      ((checks_passed++))
    else
      echo -e "${RED}✗${NC} node_modules NOT in .gitignore"
      ((checks_failed++))
    fi
    
    if grep -q "\.env" .gitignore 2>/dev/null; then
      echo -e "${GREEN}✓${NC} .env is in .gitignore"
      ((checks_passed++))
    else
      echo -e "${RED}✗${NC} .env NOT in .gitignore"
      ((checks_failed++))
    fi
  fi
else
  echo -e "${YELLOW}⚠${NC} Not a Git repository"
  ((checks_warning++))
fi
echo ""

echo "9. Checking npm Scripts..."
echo "========================="
if grep -q "start" package.json 2>/dev/null; then
  echo -e "${GREEN}✓${NC} npm start script exists"
  ((checks_passed++))
fi

if grep -q "dev" package.json 2>/dev/null; then
  echo -e "${GREEN}✓${NC} npm run dev script exists"
  ((checks_passed++))
fi
echo ""

echo "================================"
echo "Deployment Readiness Summary"
echo "================================"
echo -e "${GREEN}Passed: $checks_passed${NC}"
echo -e "${YELLOW}Warnings: $checks_warning${NC}"
echo -e "${RED}Failed: $checks_failed${NC}"
echo ""

if [ $checks_failed -eq 0 ] && [ $checks_warning -le 2 ]; then
  echo -e "${GREEN}✓ Your project is ready for Render deployment!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Push your code to GitHub"
  echo "2. Follow RENDER_QUICK_START.md"
  echo "3. Create services on Render dashboard"
  exit 0
elif [ $checks_failed -eq 0 ]; then
  echo -e "${YELLOW}⚠ Your project has some warnings but can be deployed${NC}"
  echo "Review the warnings above before deploying"
  exit 1
else
  echo -e "${RED}✗ Your project has issues that need to be fixed first${NC}"
  echo "Please resolve the failed checks above"
  exit 1
fi
