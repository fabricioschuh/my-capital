# My Capital — Investment Portfolio Manager

A full-stack web application for managing and visualizing an investment portfolio across multiple asset classes. Built with **Next.js 15**, **NestJS**, **DynamoDB**, and deployed on **AWS**.

---

## Features

- **Multi-asset class tracking** — 9 configurable investment categories
- **Automatic currency conversion** — USD and EUR assets converted to BRL in real time
- **Portfolio allocation** — Visual comparison of current vs. target allocation
- **Color-coded differences** — Green (overweight), Red (underweight)
- **Dark mode** — System-aware with manual toggle
- **Responsive** — Mobile-first design
- **Serverless-ready** — ECS Fargate + DynamoDB PAY_PER_REQUEST

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React, TypeScript, TailwindCSS, shadcn/ui |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Backend | NestJS, TypeScript, REST |
| Database | AWS DynamoDB |
| Infrastructure | AWS CDK v2 (ECS Fargate, ALB, DynamoDB, ECR) |
| Local Dev | Docker Compose + DynamoDB Local |

---

## Project Structure

```
my-capital/
├── backend/                    # NestJS REST API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── categories/    # Category CRUD
│   │   │   ├── assets/        # Asset CRUD
│   │   │   ├── portfolio/     # Portfolio calculations
│   │   │   └── exchange/      # Currency conversion
│   │   └── shared/
│   │       ├── config/        # App/AWS/Exchange config
│   │       ├── domain/        # Interfaces and errors
│   │       ├── application/   # Global filters
│   │       ├── infrastructure/ # DynamoDB module
│   │       └── scripts/       # Seed script
│   └── test/                  # Unit tests
│
├── frontend/                   # Next.js 15 App
│   ├── app/                   # App Router pages
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Portfolio dashboard
│   │   ├── assets/           # Asset management
│   │   └── layout/           # Navbar
│   ├── hooks/                # TanStack Query hooks
│   ├── services/             # API clients
│   ├── types/                # TypeScript types
│   └── lib/                  # Utilities
│
├── infrastructure/             # AWS CDK stacks
│   ├── lib/
│   │   ├── dynamodb-stack.ts # DynamoDB tables
│   │   └── backend-stack.ts  # ECS Fargate + ALB
│   └── bin/my-capital.ts     # CDK entrypoint
│
├── docker-compose.yml          # Local development
├── DYNAMODB_SCHEMA.md          # Database design docs
└── README.md
```

---

## Quick Start (Docker Compose)

The fastest way to run everything locally:

```bash
# Clone and enter directory
cd my-capital

# Start all services (DynamoDB Local + Backend + Frontend)
docker compose up -d

# Seed the database with default categories and sample assets
docker compose exec backend npm run seed

# Open the app
open http://localhost:3000
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger docs: http://localhost:3001/api/docs
- DynamoDB Local: http://localhost:8000

---

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- AWS CLI (for DynamoDB Local)
- Docker (for DynamoDB Local container)

### 1. Start DynamoDB Local

```bash
docker run -d -p 8000:8000 amazon/dynamodb-local
```

### 2. Create DynamoDB Tables

```bash
# Categories table
aws dynamodb create-table \
  --table-name my-capital-categories \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

# Assets table (with GSI)
aws dynamodb create-table \
  --table-name my-capital-assets \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=categoryId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "categoryId-index",
      "KeySchema": [{"AttributeName": "categoryId", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env   # uses DynamoDB Local defaults
npm run start:dev
```

### 4. Seed Sample Data

```bash
cd backend
npm run seed
```

### 5. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## API Reference

Base URL: `http://localhost:3001/api`

Full Swagger docs at `/api/docs`

### Portfolio

| Method | Path | Description |
|--------|------|-------------|
| GET | `/portfolio/summary` | Full portfolio with calculations |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List all categories |
| GET | `/categories/:id` | Get category |
| POST | `/categories` | Create category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

### Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/assets` | List assets (optional `?categoryId=`) |
| GET | `/assets/:id` | Get asset |
| POST | `/assets` | Create asset |
| PUT | `/assets/:id` | Update asset |
| DELETE | `/assets/:id` | Delete asset |

### Exchange Rates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exchange-rates` | Current USD/EUR to BRL rates |
| POST | `/exchange-rates/refresh` | Force refresh from provider |

---

## AWS Deployment

### Prerequisites

```bash
npm install -g aws-cdk
aws configure  # Set up credentials
```

### Deploy

```bash
cd infrastructure
npm install
npm run build

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks
npm run deploy
```

This creates:
- `MyCapitalDatabaseStack` — DynamoDB tables
- `MyCapitalBackendStack` — VPC, ECS Fargate cluster, ALB, ECR repo

### Push Backend Image

```bash
# Get ECR URI from CDK output
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name MyCapitalBackendStack \
  --query "Stacks[0].Outputs[?OutputKey=='BackendEcrRepo'].OutputValue" \
  --output text)

# Build and push
cd backend
docker build -t my-capital-backend .
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
docker tag my-capital-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

### Deploy Frontend to Vercel

```bash
cd frontend
npx vercel --prod
# Set NEXT_PUBLIC_API_URL to your ALB DNS name
```

---

## Investment Categories

| # | Category | Default Target |
|---|----------|---------------|
| 1 | Emergency Reserve | 10% |
| 2 | Cash | 2% |
| 3 | Fixed Income | 25% |
| 4 | Fixed Income International | 5% |
| 5 | Private Pension | 10% |
| 6 | Brazilian Stocks | 20% |
| 7 | International Stocks | 15% |
| 8 | SAP Stocks | 8% |
| 9 | Cryptocurrencies | 5% |

**Total default target: 100%**

---

## Allocation Color Logic

| Difference | Color | Meaning |
|-----------|-------|---------|
| > 0 | Green | Overweight — reduce allocation |
| < 0 | Red | Underweight — increase allocation |
| = 0 | Neutral | On target |

`difference = currentAllocation - targetAllocation`

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | - |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | - |
| `DYNAMODB_ENDPOINT` | Override DynamoDB endpoint (local) | - |
| `EXCHANGE_RATE_PROVIDER` | `frankfurter` or `mock` | `frankfurter` |
| `EXCHANGE_RATE_CACHE_TTL` | Cache duration in seconds | `3600` |
| `CORS_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |

### Frontend (`.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |

---

## Architecture

```
                     ┌─────────────────┐
                     │   User Browser  │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  Next.js (CDN)  │
                     │  Vercel/Amplify │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  AWS ALB (HTTP) │
                     └────────┬────────┘
                              │
                 ┌────────────▼────────────┐
                 │    ECS Fargate (x2)     │
                 │  NestJS REST API :3001  │
                 └────────────┬────────────┘
                              │
             ┌────────────────┼──────────────────┐
             │                │                  │
    ┌────────▼───────┐ ┌──────▼──────┐ ┌────────▼────────┐
    │   DynamoDB     │ │ Frankfurter │ │ AWS Secrets Mgr │
    │  2 tables      │ │    API      │ │   (future auth) │
    └────────────────┘ └─────────────┘ └─────────────────┘
```

---

## Roadmap

- [ ] Authentication (Amazon Cognito)
- [ ] Multiple portfolios per user
- [ ] Historical snapshots
- [ ] Allocation charts (Recharts)
- [ ] CSV import/export
- [ ] Dividend tracking
- [ ] Monthly profitability reports
- [ ] Broker integration
- [ ] Notifications
