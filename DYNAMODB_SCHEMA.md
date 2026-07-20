# DynamoDB Schema — My Capital

## Design Principles

- **Single-table design** considered but rejected for clarity; two tables used for clean separation
- **PAY_PER_REQUEST** billing for both tables (serverless scaling)
- **GSI** on `assetsTable.categoryId` for efficient category-based queries
- **UUIDs** as partition keys
- **Point-in-time recovery** enabled on both tables

---

## Table: `my-capital-categories`

### Access Patterns
| Pattern | Operation | Key |
|---------|-----------|-----|
| Get all categories | Scan | - |
| Get single category | GetItem | PK: id |
| Create category | PutItem | PK: id |
| Update category | UpdateItem | PK: id |
| Delete category | DeleteItem | PK: id |

### Schema
```
Partition Key: id (S)  — UUID
```

### Sample Item
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Brazilian Stocks",
  "slug": "brazilian-stocks",
  "targetPercentage": 20,
  "order": 6,
  "isActive": true,
  "description": "Stocks listed on B3",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Table: `my-capital-assets`

### Access Patterns
| Pattern | Operation | Key |
|---------|-----------|-----|
| Get all assets | Scan | - |
| Get asset by ID | GetItem | PK: id |
| Get assets by category | Query (GSI) | GSI PK: categoryId |
| Create asset | PutItem | PK: id |
| Update asset | UpdateItem | PK: id |
| Delete asset | DeleteItem | PK: id |

### Schema
```
Partition Key: id (S)  — UUID

GSI: categoryId-index
  Partition Key: categoryId (S)
  Projection: ALL
```

### Sample Item
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "ITAÚ UNIBANCO ON",
  "ticker": "ITUB3",
  "quantity": 500,
  "unitPrice": 36.50,
  "currency": "BRL",
  "broker": "XP Investimentos",
  "notes": null,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Currency Values Stored

Assets store prices in their **native currency** (BRL, USD, or EUR).
Currency conversion to BRL happens at **query time** in the Portfolio service,
using live exchange rates fetched from Frankfurter API (ECB data).

This approach means:
- No stale converted values in the database
- Always uses latest exchange rates
- Easy to add new currencies in the future

---

## Future Extensions

| Feature | DynamoDB Change |
|---------|-----------------|
| Multiple portfolios | Add `portfolioId` GSI to assets table |
| Historical snapshots | New table `my-capital-snapshots` with GSI on `date` |
| User authentication | Add `userId` to all tables, partition by user |
| Dividends | New table `my-capital-dividends` with GSI on `assetId` |
