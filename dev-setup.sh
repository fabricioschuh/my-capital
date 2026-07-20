#!/usr/bin/env bash
# dev-setup.sh — One-command local dev bootstrap (without Docker Compose)
set -e

echo "╔══════════════════════════════════════════╗"
echo "║     My Capital — Dev Setup Script        ║"
echo "╚══════════════════════════════════════════╝"

# ─── Check prerequisites ────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required"; exit 1; }

echo ""
echo "1. Starting DynamoDB Local..."
docker rm -f my-capital-dynamodb 2>/dev/null || true
docker run -d \
  --name my-capital-dynamodb \
  -p 8000:8000 \
  amazon/dynamodb-local \
  -jar DynamoDBLocal.jar -sharedDb 2>/dev/null

sleep 2

echo ""
echo "2. Creating DynamoDB tables..."

AWS_ARGS="--endpoint-url http://localhost:8000 --region us-east-1 \
  --no-cli-pager"
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local
export AWS_DEFAULT_REGION=us-east-1

aws dynamodb create-table \
  --table-name my-capital-categories \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  $AWS_ARGS 2>/dev/null && echo "  ✓ Categories table" || echo "  ⚠ Categories table already exists"

aws dynamodb create-table \
  --table-name my-capital-assets \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=categoryId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "categoryId-index",
      "KeySchema": [{"AttributeName":"categoryId","KeyType":"HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  $AWS_ARGS 2>/dev/null && echo "  ✓ Assets table" || echo "  ⚠ Assets table already exists"

echo ""
echo "3. Installing backend dependencies..."
cd backend && npm install --silent
echo "  ✓ Backend dependencies installed"

echo ""
echo "4. Seeding database with sample data..."
npm run seed
cd ..

echo ""
echo "5. Installing frontend dependencies..."
cd frontend && npm install --silent
echo "  ✓ Frontend dependencies installed"
cd ..

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║              Setup Complete!             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "To start development:"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd backend && npm run start:dev"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  URLs:"
echo "    Frontend:  http://localhost:3000"
echo "    Backend:   http://localhost:3001/api"
echo "    Swagger:   http://localhost:3001/api/docs"
