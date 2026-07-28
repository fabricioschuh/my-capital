/**
 * Migration: Merge "Reserva de Emergência" (emergency-reserve) and "Caixa" (cash)
 * into a single category "Liquidez Diária" (daily-liquidity).
 *
 * Steps:
 *  1. Rename emergency-reserve → daily-liquidity (slug + name)
 *  2. Sum targetPercentage from both categories
 *  3. Reassign all assets from cash → daily-liquidity
 *  4. Delete the cash category
 *
 * Run with: npm run merge-daily-liquidity
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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
const CATEGORIES_TABLE = 'my-capital-categories';
const ASSETS_TABLE = 'my-capital-assets';

async function main() {
  console.log('=== Merge: emergency-reserve + cash → daily-liquidity ===\n');

  const now = new Date().toISOString();

  // 1. Load all categories
  const { Items: categories = [] } = await docClient.send(new ScanCommand({ TableName: CATEGORIES_TABLE }));

  const emergencyCategory = categories.find((c) => c.slug === 'emergency-reserve');
  const cashCategory = categories.find((c) => c.slug === 'cash');

  if (!emergencyCategory) {
    console.error('❌ Category "emergency-reserve" not found. Aborting.');
    process.exit(1);
  }
  if (!cashCategory) {
    console.error('❌ Category "cash" not found. Aborting.');
    process.exit(1);
  }

  console.log(`Found: "${emergencyCategory.name}" (id: ${emergencyCategory.id}, target: ${emergencyCategory.targetPercentage}%)`);
  console.log(`Found: "${cashCategory.name}" (id: ${cashCategory.id}, target: ${cashCategory.targetPercentage}%)`);

  const mergedTarget = (emergencyCategory.targetPercentage ?? 0) + (cashCategory.targetPercentage ?? 0);
  console.log(`\nMerged targetPercentage: ${emergencyCategory.targetPercentage}% + ${cashCategory.targetPercentage}% = ${mergedTarget}%`);

  // 2. Rename emergency-reserve → daily-liquidity
  console.log('\n[1/3] Renaming emergency-reserve → daily-liquidity...');
  await docClient.send(new UpdateCommand({
    TableName: CATEGORIES_TABLE,
    Key: { id: emergencyCategory.id },
    UpdateExpression: 'SET #n = :name, slug = :slug, targetPercentage = :target, updatedAt = :now',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: {
      ':name': 'Liquidez Diária',
      ':slug': 'daily-liquidity',
      ':target': mergedTarget,
      ':now': now,
    },
  }));
  console.log(`  ✓ Category renamed to "Liquidez Diária" with ${mergedTarget}% target`);

  // 3. Reassign assets from cash → daily-liquidity
  console.log('\n[2/3] Reassigning assets from cash to daily-liquidity...');
  const { Items: allAssets = [] } = await docClient.send(new ScanCommand({ TableName: ASSETS_TABLE }));
  const cashAssets = allAssets.filter((a) => a.categoryId === cashCategory.id);

  if (cashAssets.length === 0) {
    console.log('  No assets found in cash category.');
  } else {
    for (const asset of cashAssets) {
      await docClient.send(new UpdateCommand({
        TableName: ASSETS_TABLE,
        Key: { id: asset.id },
        UpdateExpression: 'SET categoryId = :catId, updatedAt = :now',
        ExpressionAttributeValues: {
          ':catId': emergencyCategory.id,
          ':now': now,
        },
      }));
      console.log(`  ✓ Moved asset: "${asset.name}"`);
    }
  }

  // 4. Delete cash category
  console.log('\n[3/3] Deleting cash category...');
  await docClient.send(new DeleteCommand({
    TableName: CATEGORIES_TABLE,
    Key: { id: cashCategory.id },
  }));
  console.log('  ✓ Category "Caixa" deleted');

  console.log('\n✅ Migration complete!');
  console.log(`   "Reserva de Emergência" + "Caixa" → "Liquidez Diária" (${mergedTarget}% target)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
