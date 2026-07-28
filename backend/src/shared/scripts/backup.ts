/**
 * Backup: Exports all DynamoDB tables to a JSON file.
 * Run with: npm run backup
 * Output: backup-YYYY-MM-DD.json
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLES = [
  'my-capital-categories',
  'my-capital-assets',
  'my-capital-preferences',
];

async function scanAll(tableName: string): Promise<any[]> {
  const items: any[] = [];
  let lastKey: any = undefined;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function main() {
  console.log('=== My Capital — DynamoDB Backup ===\n');

  const backup: Record<string, any[]> = {};

  for (const table of TABLES) {
    process.stdout.write(`Scanning ${table}... `);
    try {
      const items = await scanAll(table);
      backup[table] = items;
      console.log(`${items.length} items`);
    } catch (e: any) {
      console.log(`SKIPPED (${e.message})`);
      backup[table] = [];
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `backup-${date}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf-8');

  const totalItems = Object.values(backup).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n✅ Backup saved: ${filename} (${totalItems} total items)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
