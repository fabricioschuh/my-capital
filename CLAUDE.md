# My Capital — Contexto do Projeto

Aplicação fullstack de gestão de portfólio de investimentos pessoais.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS 10, TypeScript, DynamoDB (AWS) |
| Frontend | Next.js 15 (App Router), React 18, TypeScript |
| UI | shadcn/ui, TailwindCSS, Radix UI |
| Estado | TanStack Query v5, React Hook Form + Zod |
| Gráficos | Recharts |
| Auth | JWT + bcrypt |
| Dados externos | Yahoo Finance (fundamentos), Frankfurter (câmbio) |

## Estrutura de diretórios

```
my-capital/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── assets/          # CRUD de ativos + fundamentos + cotações
│       │   ├── categories/      # Categorias de investimento
│       │   ├── portfolio/       # Agregação do portfólio + câmbio
│       │   ├── exchange/        # Taxas de câmbio (Frankfurter API)
│       │   ├── watchlist/       # Lista de tickers para análise
│       │   └── auth/            # JWT auth
│       └── shared/              # Config, DynamoDB module, interfaces
├── frontend/
│   ├── app/                     # Páginas Next.js (App Router)
│   ├── components/
│   │   ├── dashboard/           # PortfolioHeader, CategoryRow, AnalysisTab
│   │   ├── assets/              # Dialogs de transação/criação
│   │   └── layout/              # Navbar
│   ├── hooks/                   # TanStack Query hooks
│   ├── services/                # Clientes de API
│   ├── lib/i18n/                # Internacionalização (EN/PT-BR)
│   └── types/index.ts           # Tipos TypeScript
└── .claude/
    ├── agents/                  # Agentes especializados de análise
    └── skills/                  # Skills reutilizáveis
```

## Banco de dados (DynamoDB)

| Tabela | Partition Key | Uso |
|--------|--------------|-----|
| `my-capital-categories` | `id` | Categorias com % alvo e ordem |
| `my-capital-assets` | `id` | Ativos com GSI em `categoryId` |
| `my-capital-preferences` | `id` | Watchlist de tickers |

## APIs principais (base: `/api`)

- `GET /portfolio/summary` — Resumo completo com alocação e câmbio
- `GET /assets/fundamentals/:ticker` — Análise via Yahoo Finance
- `POST /assets/refresh-prices` — Atualiza preços de mercado
- `PATCH /assets/:id/transactions` — Registra compra/venda
- `PUT /watchlist` — Salva lista de tickers
- `POST /exchange-rates/refresh` — Atualiza cotações

Swagger disponível em `/api/docs`.

## Categorias de investimento

| Slug | Descrição | Moeda |
|------|-----------|-------|
| `emergency-reserve` | Reserva de emergência | BRL |
| `cash` | Caixa | BRL |
| `fixed-income` | Renda fixa nacional (CDB, LCI, LCA) | BRL |
| `fixed-income-international` | Renda fixa internacional | USD |
| `private-pension` | Previdência privada | BRL |
| `brazilian-stocks` | Ações brasileiras (B3) | BRL |
| `international-stocks` | Ações internacionais | USD |
| `sap-stocks` | Ações SAP | EUR |
| `cryptocurrencies` | Criptomoedas | USD |
| `real-estate` | FIIs | BRL |
| `international-etfs` | ETFs internacionais | USD |
| `brazilian-etfs` | ETFs brasileiros (B3) | BRL |

## Modelo de dados principal

```typescript
FundamentalsResult {
  ticker, market ('BR'|'US'), currency, instrumentType
  currentPrice, fiftyTwoWeekLow/High, fiftyDayAverage, twoHundredDayAverage
  trailingPE, forwardPE, priceToBook, enterpriseToEbitda, pegRatio, priceToSales
  dividendYield, payoutRatio
  returnOnEquity, returnOnAssets, profitMargins, grossMargins, ebitdaMargins
  debtToEquity, currentRatio, beta
  earningsGrowth, revenueGrowth, marketCap
  analystTarget { targetHigh/Low/Mean, recommendationKey, numberOfAnalysts, upsideMean }
  grahamValue { grahamNumber, eps, bookValuePerShare, marginOfSafety }
  recentUpgrades[]
  etf { expenseRatio, sharpeRatio, alpha, beta3Year, topHoldings[], sectorWeightings[] }
}
```

## Internacionalização

- Idiomas: Inglês (padrão) e Português do Brasil
- Persistência: cookie `locale` (1 ano)
- Provider: `I18nProvider` em `frontend/lib/i18n/i18n-context.tsx`
- Uso: `const { t, locale, setLocale } = useI18n()`

## Convenções de código

- Backend: módulos NestJS com `service + repository + controller + module`
- Frontend: componentes `'use client'` com hooks TanStack Query
- Validação: Zod schemas no frontend, class-validator no backend
- Formatação de moeda: `formatCurrency(value, currency?)` em `lib/utils`
- Dados de mercado: sempre via `GET /assets/fundamentals/:ticker`

## Variáveis de ambiente

**Backend** (`.env`):
```
DYNAMODB_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
JWT_SECRET, CORS_ORIGINS
PORT (default 3001)
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Deploy

- Backend: Render (auto-deploy ao push em `main`)
- Frontend: Vercel (auto-deploy ao push em `main`)
- Banco: AWS DynamoDB `us-east-1`
