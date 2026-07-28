/**
 * Clear: Deletes all items from assets and preferences tables.
 * Categories are preserved (structure remains intact).
 *
 * Run with: npm run clear
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

async function clearTable(tableName: string, keyName: string) {
  process.stdout.write(`Clearing ${tableName}... `);

  const { Items = [] } = await docClient.send(new ScanCommand({ TableName: tableName }));

  if (Items.length === 0) {
    console.log('already empty');
    return;
  }

  for (const item of Items) {
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { [keyName]: item[keyName] },
    }));
  }

  console.log(`${Items.length} items deleted`);
}

async function main() {
  console.log('=== My Capital — Clear Data ===\n');
  console.log('⚠️  This will delete ALL assets. Categories are preserved.\n');

  await clearTable('my-capital-assets', 'id');

  console.log('\n✅ Done! Categories intact, assets cleared.');
}

main().catch((e) => { console.error(e); process.exit(1); });
