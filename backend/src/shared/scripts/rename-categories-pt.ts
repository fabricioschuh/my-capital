/**
 * Migration: Rename categories to Portuguese.
 * Run with: npm run rename-categories-pt
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

const SLUG_TO_PT_NAME: Record<string, string> = {
  'emergency-reserve':          'Reserva de Emergência',
  'cash':                       'Caixa',
  'fixed-income':               'Renda Fixa Nacional',
  'fixed-income-international': 'Renda Fixa Internacional',
  'private-pension':            'Previdência Privada',
  'brazilian-stocks':           'Ações Nacionais',
  'international-stocks':       'Ações Internacionais',
  'sap-stocks':                 'Ações SAP',
  'cryptocurrencies':           'Criptomoedas',
  'real-estate':                'Fundos Imobiliários',
  'international-etfs':         'ETFs Internacionais',
  'brazilian-etfs':             'ETFs Brasileiros',
};

async function main() {
  console.log('=== Renaming categories to Portuguese ===\n');

  const { Items = [] } = await docClient.send(new ScanCommand({ TableName: CATEGORIES_TABLE }));

  for (const item of Items) {
    const newName = SLUG_TO_PT_NAME[item.slug];
    if (!newName) {
      console.log(`  skipped (no mapping): ${item.slug}`);
      continue;
    }
    if (item.name === newName) {
      console.log(`  already correct: ${item.slug}`);
      continue;
    }
    await docClient.send(new UpdateCommand({
      TableName: CATEGORIES_TABLE,
      Key: { id: item.id },
      UpdateExpression: 'SET #n = :name, updatedAt = :now',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: {
        ':name': newName,
        ':now': new Date().toISOString(),
      },
    }));
    console.log(`  renamed: "${item.name}" → "${newName}"`);
  }

  console.log('\n✅ Done!');
}

main().catch((e) => { console.error(e); process.exit(1); });
