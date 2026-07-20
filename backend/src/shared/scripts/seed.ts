/**
 * Seed script: Creates DynamoDB tables (if needed) and populates sample data.
 * Run with: npm run seed
 */
import {
  DynamoDBClient,
  CreateTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const CATEGORIES_TABLE = 'my-capital-categories';
const ASSETS_TABLE = 'my-capital-assets';

const DEFAULT_CATEGORIES = [
  { name: 'Emergency Reserve', slug: 'emergency-reserve', targetPercentage: 10, order: 1 },
  { name: 'Cash', slug: 'cash', targetPercentage: 2, order: 2 },
  { name: 'Fixed Income', slug: 'fixed-income', targetPercentage: 25, order: 3 },
  { name: 'Fixed Income International', slug: 'fixed-income-international', targetPercentage: 5, order: 4 },
  { name: 'Private Pension', slug: 'private-pension', targetPercentage: 10, order: 5 },
  { name: 'Brazilian Stocks', slug: 'brazilian-stocks', targetPercentage: 20, order: 6 },
  { name: 'International Stocks', slug: 'international-stocks', targetPercentage: 15, order: 7 },
  { name: 'SAP Stocks', slug: 'sap-stocks', targetPercentage: 8, order: 8 },
  { name: 'Cryptocurrencies', slug: 'cryptocurrencies', targetPercentage: 5, order: 9 },
];

async function createTables(): Promise<void> {
  console.log('Creating DynamoDB tables (if not exist)...');

  // Categories table
  try {
    await client.send(new CreateTableCommand({
      TableName: CATEGORIES_TABLE,
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
    }));
    console.log('  created: ' + CATEGORIES_TABLE);
  } catch (e: any) {
    if (e.name === 'ResourceInUseException') {
      console.log('  exists: ' + CATEGORIES_TABLE);
    } else throw e;
  }

  // Assets table with GSI
  try {
    await client.send(new CreateTableCommand({
      TableName: ASSETS_TABLE,
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'categoryId', AttributeType: 'S' },
      ],
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'categoryId-index',
          KeySchema: [{ AttributeName: 'categoryId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }));
    console.log('  created: ' + ASSETS_TABLE);
  } catch (e: any) {
    if (e.name === 'ResourceInUseException') {
      console.log('  exists: ' + ASSETS_TABLE);
    } else throw e;
  }
}

async function seedCategories(): Promise<Record<string, string>> {
  console.log('Seeding categories...');
  const now = new Date().toISOString();
  const slugToId: Record<string, string> = {};

  // Check existing
  const existing = await docClient.send(new ScanCommand({ TableName: CATEGORIES_TABLE }));
  if ((existing.Items ?? []).length > 0) {
    console.log('Categories already seeded. Building ID map from existing data...');
    for (const item of existing.Items ?? []) {
      slugToId[item.slug] = item.id;
    }
    return slugToId;
  }

  for (const cat of DEFAULT_CATEGORIES) {
    const id = uuidv4();
    slugToId[cat.slug] = id;
    await docClient.send(
      new PutCommand({
        TableName: CATEGORIES_TABLE,
        Item: {
          id,
          name: cat.name,
          slug: cat.slug,
          targetPercentage: cat.targetPercentage,
          order: cat.order,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
    console.log(`  Created category: ${cat.name}`);
  }

  return slugToId;
}

async function seedAssets(slugToId: Record<string, string>): Promise<void> {
  console.log('\nSeeding sample assets...');

  const existing = await docClient.send(new ScanCommand({ TableName: ASSETS_TABLE }));
  if ((existing.Items ?? []).length > 0) {
    console.log('Assets already seeded. Skipping...');
    return;
  }

  const now = new Date().toISOString();

  const sampleAssets = [
    // Emergency Reserve
    { categorySlug: 'emergency-reserve', name: 'Nubank CDB 100% CDI', ticker: 'NUCDB100', quantity: 1, unitPrice: 30000, currency: 'BRL', broker: 'Nubank' },
    { categorySlug: 'emergency-reserve', name: 'Picpay CDB 102% CDI', ticker: 'PICDB102', quantity: 1, unitPrice: 28000, currency: 'BRL', broker: 'PicPay' },
    // Cash
    { categorySlug: 'cash', name: 'Conta Corrente Itaú', quantity: 1, unitPrice: 5000, currency: 'BRL', broker: 'Itaú' },
    // Fixed Income
    { categorySlug: 'fixed-income', name: 'Tesouro IPCA+ 2035', ticker: 'BCIMB350', quantity: 200, unitPrice: 630, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'fixed-income', name: 'Tesouro Selic 2027', ticker: 'LFT270', quantity: 50, unitPrice: 14200, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'fixed-income', name: 'CDB Banco BTG 115% CDI', quantity: 1, unitPrice: 50000, currency: 'BRL', broker: 'BTG Pactual' },
    // Fixed Income International
    { categorySlug: 'fixed-income-international', name: 'US Treasury 10Y ETF', ticker: 'TLT', quantity: 50, unitPrice: 95.5, currency: 'USD', broker: 'Interactive Brokers' },
    // Private Pension
    { categorySlug: 'private-pension', name: 'PGBL XP Multiasset', quantity: 1, unitPrice: 55000, currency: 'BRL', broker: 'XP Investimentos' },
    // Brazilian Stocks
    { categorySlug: 'brazilian-stocks', name: 'ITAÚ UNIBANCO ON', ticker: 'ITUB3', quantity: 500, unitPrice: 36.50, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'brazilian-stocks', name: 'VALE ON', ticker: 'VALE3', quantity: 300, unitPrice: 68.20, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'brazilian-stocks', name: 'PETROBRAS PN', ticker: 'PETR4', quantity: 400, unitPrice: 42.80, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'brazilian-stocks', name: 'AMBEV ON', ticker: 'ABEV3', quantity: 800, unitPrice: 13.90, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'brazilian-stocks', name: 'WEGE3 - WEG ON', ticker: 'WEGE3', quantity: 150, unitPrice: 56.40, currency: 'BRL', broker: 'XP Investimentos' },
    { categorySlug: 'brazilian-stocks', name: 'XPML11 - XP Malls FII', ticker: 'XPML11', quantity: 200, unitPrice: 108.50, currency: 'BRL', broker: 'XP Investimentos' },
    // International Stocks
    { categorySlug: 'international-stocks', name: 'Apple Inc', ticker: 'AAPL', quantity: 30, unitPrice: 192.50, currency: 'USD', broker: 'Interactive Brokers' },
    { categorySlug: 'international-stocks', name: 'S&P 500 ETF (VOO)', ticker: 'VOO', quantity: 20, unitPrice: 445.00, currency: 'USD', broker: 'Interactive Brokers' },
    { categorySlug: 'international-stocks', name: 'Microsoft Corp', ticker: 'MSFT', quantity: 15, unitPrice: 378.00, currency: 'USD', broker: 'Interactive Brokers' },
    // SAP Stocks
    { categorySlug: 'sap-stocks', name: 'SAP SE ADR', ticker: 'SAP', quantity: 80, unitPrice: 195.00, currency: 'USD', broker: 'Interactive Brokers' },
    // Cryptocurrencies
    { categorySlug: 'cryptocurrencies', name: 'Bitcoin', ticker: 'BTC', quantity: 0.5, unitPrice: 62000, currency: 'USD', broker: 'Binance' },
    { categorySlug: 'cryptocurrencies', name: 'Ethereum', ticker: 'ETH', quantity: 3, unitPrice: 3200, currency: 'USD', broker: 'Binance' },
  ];

  for (const asset of sampleAssets) {
    const categoryId = slugToId[asset.categorySlug];
    if (!categoryId) {
      console.warn(`  Warning: Category '${asset.categorySlug}' not found, skipping asset '${asset.name}'`);
      continue;
    }

    await docClient.send(
      new PutCommand({
        TableName: ASSETS_TABLE,
        Item: {
          id: uuidv4(),
          categoryId,
          name: asset.name,
          ticker: (asset as any).ticker,
          quantity: asset.quantity,
          unitPrice: asset.unitPrice,
          currency: asset.currency,
          broker: asset.broker,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
    console.log(`  Created asset: ${asset.name} (${asset.currency})`);
  }
}

async function main() {
  console.log('=== My Capital Seed Script ===\n');
  try {
    await createTables();
    const slugToId = await seedCategories();
    await seedAssets(slugToId);
    console.log('\n✅ Seeding complete!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
