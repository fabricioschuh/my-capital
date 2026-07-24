/**
 * Migration: adds real-estate and brazilian-etfs categories if they don't exist yet.
 * Run with: npm run add-missing-categories
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'my-capital-categories';

const MISSING = [
  { name: 'Fundos Imobiliários', slug: 'real-estate', targetPercentage: 5, order: 10 },
  { name: 'ETFs Brasileiros', slug: 'brazilian-etfs', targetPercentage: 5, order: 12 },
];

async function main() {
  const { Items = [] } = await docClient.send(new ScanCommand({ TableName: TABLE }));
  const existingSlugs = new Set(Items.map((i: any) => i.slug));
  const now = new Date().toISOString();

  for (const cat of MISSING) {
    if (existingSlugs.has(cat.slug)) {
      console.log(`  skip (exists): ${cat.slug}`);
      continue;
    }
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { id: uuidv4(), ...cat, isActive: true, createdAt: now, updatedAt: now },
    }));
    console.log(`  created: ${cat.name} (${cat.slug})`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
