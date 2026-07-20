/**
 * Clear script: Deletes all items from the assets table.
 * Categories are preserved.
 * Run with: npm run clear-assets
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';

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
const ASSETS_TABLE = 'my-capital-assets';

async function clearAssets(): Promise<void> {
  console.log(`Scanning ${ASSETS_TABLE}...`);

  let totalDeleted = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: ASSETS_TABLE,
        ProjectionExpression: 'id',
        ExclusiveStartKey: lastKey,
      }),
    );

    const items = result.Items ?? [];
    console.log(`  Found ${items.length} items to delete...`);

    for (const item of items) {
      await docClient.send(
        new DeleteCommand({ TableName: ASSETS_TABLE, Key: { id: item.id } }),
      );
      totalDeleted++;
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  console.log(`\n✅ Deleted ${totalDeleted} assets. Table is now empty.`);
}

clearAssets().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
