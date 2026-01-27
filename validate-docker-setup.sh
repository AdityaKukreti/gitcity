#!/bin/bash

echo "Validating Docker Setup..."
echo "=========================="
echo ""

errors=0

# Check Dockerfiles exist
echo "1. Checking Dockerfiles..."
if [ -f "backend/Dockerfile" ]; then
    echo "   ✓ backend/Dockerfile exists"
else
    echo "   ✗ backend/Dockerfile missing"
    errors=$((errors + 1))
fi

if [ -f "frontend/Dockerfile" ]; then
    echo "   ✓ frontend/Dockerfile exists"
else
    echo "   ✗ frontend/Dockerfile missing"
    errors=$((errors + 1))
fi

# Check docker compose.yml
echo ""
echo "2. Checking docker compose.yml..."
if [ -f "docker compose.yml" ]; then
    echo "   ✓ docker compose.yml exists"
    
    # Validate YAML syntax
    if grep -q "version:" docker compose.yml && grep -q "services:" docker compose.yml; then
        echo "   ✓ Basic structure is valid"
    else
        echo "   ✗ Invalid YAML structure"
        errors=$((errors + 1))
    fi
    
    # Check required services
    if grep -q "mongodb:" docker compose.yml; then
        echo "   ✓ MongoDB service defined"
    else
        echo "   ✗ MongoDB service missing"
        errors=$((errors + 1))
    fi
    
    if grep -q "backend:" docker compose.yml; then
        echo "   ✓ Backend service defined"
    else
        echo "   ✗ Backend service missing"
        errors=$((errors + 1))
    fi
    
    if grep -q "frontend:" docker compose.yml; then
        echo "   ✓ Frontend service defined"
    else
        echo "   ✗ Frontend service missing"
        errors=$((errors + 1))
    fi
else
    echo "   ✗ docker compose.yml missing"
    errors=$((errors + 1))
fi

# Check .dockerignore files
echo ""
echo "3. Checking .dockerignore files..."
if [ -f ".dockerignore" ]; then
    echo "   ✓ Root .dockerignore exists"
else
    echo "   ⚠ Root .dockerignore missing (optional)"
fi

if [ -f "backend/.dockerignore" ]; then
    echo "   ✓ backend/.dockerignore exists"
else
    echo "   ⚠ backend/.dockerignore missing (optional)"
fi

if [ -f "frontend/.dockerignore" ]; then
    echo "   ✓ frontend/.dockerignore exists"
else
    echo "   ⚠ frontend/.dockerignore missing (optional)"
fi

# Check environment files
echo ""
echo "4. Checking environment configuration..."
if [ -f ".env.example" ]; then
    echo "   ✓ .env.example exists"
else
    echo "   ✗ .env.example missing"
    errors=$((errors + 1))
fi

# Check startup script
echo ""
echo "5. Checking startup script..."
if [ -f "start.sh" ]; then
    echo "   ✓ start.sh exists"
    if [ -x "start.sh" ]; then
        echo "   ✓ start.sh is executable"
    else
        echo "   ⚠ start.sh is not executable (run: chmod +x start.sh)"
    fi
else
    echo "   ✗ start.sh missing"
    errors=$((errors + 1))
fi

# Check documentation
echo ""
echo "6. Checking documentation..."
if [ -f "README.md" ]; then
    echo "   ✓ README.md exists"
else
    echo "   ⚠ README.md missing"
fi

if [ -f "DEPLOYMENT.md" ]; then
    echo "   ✓ DEPLOYMENT.md exists"
else
    echo "   ⚠ DEPLOYMENT.md missing"
fi

if [ -f "DATABASE_INFO.md" ]; then
    echo "   ✓ DATABASE_INFO.md exists"
else
    echo "   ⚠ DATABASE_INFO.md missing"
fi

# Check nginx config for frontend
echo ""
echo "7. Checking nginx configuration..."
if [ -f "frontend/nginx.conf" ]; then
    echo "   ✓ frontend/nginx.conf exists"
else
    echo "   ✗ frontend/nginx.conf missing"
    errors=$((errors + 1))
fi

# Summary
echo ""
echo "=========================="
if [ $errors -eq 0 ]; then
    echo "✅ All critical files are present!"
    echo ""
    echo "You're ready to deploy:"
    echo "  ./start.sh"
    exit 0
else
    echo "❌ Found $errors error(s)"
    echo ""
    echo "Please fix the issues above before deploying."
    exit 1
fi
