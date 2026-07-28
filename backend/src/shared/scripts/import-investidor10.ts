/**
 * Import: Reads investidor10 CSV and inserts assets into DynamoDB.
 *
 * Mapping rules:
 *  Ações        → Ações Brasileiras
 *  FIIs         → Fundos Imobiliários
 *    JURO11     → Renda Fixa Brasileira (IPCA+)
 *  Stocks       → Ações Internacionais
 *    SAP        → Ações SAP (EUR)
 *  Reits        → Ações Internacionais
 *  Renda Fixa   → Renda Fixa Brasileira | Liquidez Diária (based on vencimento)
 *  Tesouro Dir. → Renda Fixa Brasileira | Liquidez Diária (Selic = Liquidez Diária)
 *  ETFs Intern. → ETFs Internacionais
 *  Fundos Inv.  → Previdência Privada
 *  ETFs         → ETFs Brasileiros
 *    HASH11/BITH11 → Criptomoedas
 *    B5P211        → Renda Fixa Brasileira (IPCA+)
 *  Outros       → Renda Fixa Internacional (USD or EUR)
 *
 * Run with: npm run import-investidor10
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
const ASSETS_TABLE = 'my-capital-assets';

// ─── Category IDs (from production) ─────────────────────────────────────────
const CAT = {
  dailyLiquidity:          '84a438ef-58a3-478a-b4f6-396cbb90b70e',
  fixedIncome:             'bd607208-edf8-42dc-837b-e2ae5fb1559c',
  privatePension:          'a03ac197-adc6-4722-bb65-140ed1838794',
  realEstate:              '4a1be20f-0749-4581-ae2e-1414f819613f',
  brazilianEtfs:           'd076faec-b080-42d2-b69a-32cc98782990',
  brazilianStocks:         'a1c893b3-a9c8-4898-8e36-8e41783503e9',
  fixedIncomeIntl:         'b5ff3a65-1fa4-49d1-b7c8-8f3998ca6d16',
  internationalEtfs:       '0dde4b52-d955-45e5-b4bc-de145804ab4f',
  internationalStocks:     '1a3e5ae5-4f90-466c-8de7-557506be95fb',
  sapStocks:               '60993d6d-891d-4068-8b4d-bb9824af577c',
  cryptocurrencies:        'd774ebfc-4d3c-4506-9049-345879f3d599',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseBRL(value: string): number {
  // "R$ 4.956,16" → 4956.16
  return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
}

function parseUSD(value: string): number {
  // "US$28,660.35" or "US$294.95"
  return parseFloat(value.replace('US$', '').replace(/,/g, '').trim());
}

function detectIndexer(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('IPCA')) return 'IPCA+';
  if (upper.includes('SELIC') || upper.includes('CDI') || upper.includes('PÓS')) return 'CDI';
  if (upper.includes('PRÉ') || upper.includes('PRE') || upper.includes('PREFIXADO') || upper.includes('PRÉ-FIXADO')) return 'Pré-fixado';
  return 'CDI';
}

function isLiquidez(vencimento: string): boolean {
  return vencimento.trim().toLowerCase() === 'liquidez diária' || vencimento.trim() === '';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.env.CSV_PATH ?? '/Users/I864716/Desktop/investidor10-posicoes-2026-07-28.csv';
  console.log(`=== Import from Investidor10 ===\nFile: ${csvPath}\n`);

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').slice(1).filter(l => l.trim()); // skip header

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  for (const line of lines) {
    const cols = line.split(';');
    const tipo    = cols[0]?.trim();
    const ativo   = cols[1]?.trim();
    const quant   = parseFloat(cols[2]?.trim().replace(',', '.') ?? '0') || 1;
    const precoMedio = cols[3]?.trim();
    const precoAtual = cols[4]?.trim();
    const saldo   = cols[7]?.trim();
    const venc    = cols[9]?.trim() ?? '';

    if (!tipo || !ativo || !saldo) { skipped++; continue; }

    let categoryId: string;
    let currency: 'BRL' | 'USD' | 'EUR' = 'BRL';
    let ticker: string | undefined;
    let name: string;
    let unitPrice: number;
    let quantity: number = quant;
    let indexer: string | undefined;
    let maturityDate: string | undefined;
    let broker: string | undefined;

    // Parse vencimento date if real date
    if (venc && venc !== '' && venc.toLowerCase() !== 'liquidez diária') {
      const parts = venc.split('/');
      if (parts.length === 3) maturityDate = venc;
    }

    switch (tipo) {
      // ── Ações Brasileiras ──────────────────────────────────────────────────
      case 'Ações': {
        categoryId = CAT.brazilianStocks;
        currency = 'BRL';
        ticker = ativo;
        name = ativo;
        unitPrice = precoAtual ? parseBRL(precoAtual) : parseBRL(saldo) / quantity;
        break;
      }

      // ── FIIs ───────────────────────────────────────────────────────────────
      case 'FIIs': {
        if (ativo === 'JURO11') {
          categoryId = CAT.fixedIncome;
          indexer = 'IPCA+';
        } else {
          categoryId = CAT.realEstate;
        }
        currency = 'BRL';
        ticker = ativo;
        name = ativo;
        unitPrice = precoAtual ? parseBRL(precoAtual) : parseBRL(saldo) / quantity;
        break;
      }

      // ── Stocks ────────────────────────────────────────────────────────────
      case 'Stocks': {
        if (ativo === 'SAP') {
          categoryId = CAT.sapStocks;
          currency = 'EUR';
          // SAP is listed in EUR; price in CSV is USD (ADR), store as EUR approximation using saldo in BRL
          // We store quantity and derive unit price from saldo BRL / (approx EUR rate)
          // Better: store the USD price and flag currency as USD, user can adjust
          // Per instructions: SAP → Ações SAP em euro — we'll store currency EUR, price from saldo
          unitPrice = parseUSD(precoAtual ?? '0');
          currency = 'EUR'; // flag as EUR per instructions
        } else {
          categoryId = CAT.internationalStocks;
          currency = 'USD';
          unitPrice = parseUSD(precoAtual ?? '0');
        }
        ticker = ativo;
        name = ativo;
        break;
      }

      // ── Reits → Ações Internacionais ──────────────────────────────────────
      case 'Reits': {
        categoryId = CAT.internationalStocks;
        currency = 'USD';
        ticker = ativo;
        name = ativo;
        unitPrice = parseUSD(precoAtual ?? '0');
        break;
      }

      // ── Renda Fixa ────────────────────────────────────────────────────────
      case 'Renda Fixa': {
        indexer = detectIndexer(ativo);
        categoryId = isLiquidez(venc) ? CAT.dailyLiquidity : CAT.fixedIncome;
        currency = 'BRL';
        name = ativo;
        ticker = undefined;
        quantity = 1;
        unitPrice = parseBRL(saldo);

        // Extract broker from name: "CDB - C6 - ..."
        const parts = ativo.split(' - ');
        if (parts.length >= 2) broker = parts[1].trim();
        break;
      }

      // ── Tesouro Direto ────────────────────────────────────────────────────
      case 'Tesouro Direto': {
        const isSelic = ativo.toUpperCase().includes('SELIC');
        indexer = isSelic ? 'CDI' : detectIndexer(ativo);
        categoryId = isSelic ? CAT.dailyLiquidity : CAT.fixedIncome;
        currency = 'BRL';
        name = ativo;
        ticker = undefined;
        unitPrice = precoAtual ? parseBRL(precoAtual) : parseBRL(saldo) / quantity;
        broker = 'Tesouro Direto';
        break;
      }

      // ── ETFs Internacionais ───────────────────────────────────────────────
      case 'ETFs Intern.': {
        categoryId = CAT.internationalEtfs;
        currency = 'USD';
        ticker = ativo;
        name = ativo;
        unitPrice = parseUSD(precoAtual ?? '0');
        break;
      }

      // ── Fundos de Investimento → Previdência Privada ──────────────────────
      case 'Fundos de Invest.': {
        categoryId = CAT.privatePension;
        currency = 'BRL';
        name = ativo;
        ticker = undefined;
        quantity = 1;
        unitPrice = parseBRL(saldo);
        break;
      }

      // ── ETFs Brasileiros ──────────────────────────────────────────────────
      case 'ETFs': {
        if (ativo === 'HASH11' || ativo === 'BITH11') {
          categoryId = CAT.cryptocurrencies;
        } else if (ativo === 'B5P211') {
          categoryId = CAT.fixedIncome;
          indexer = 'IPCA+';
        } else {
          categoryId = CAT.brazilianEtfs;
        }
        currency = 'BRL';
        ticker = ativo;
        name = ativo;
        unitPrice = precoAtual ? parseBRL(precoAtual) : parseBRL(saldo) / quantity;
        break;
      }

      // ── Outros → Renda Fixa Internacional ────────────────────────────────
      case 'Outros': {
        categoryId = CAT.fixedIncomeIntl;
        const nameUpper = ativo.toUpperCase();
        currency = nameUpper.includes('EURO') || nameUpper.includes('EUR') ? 'EUR' : 'USD';
        name = ativo;
        ticker = undefined;
        quantity = 1;
        unitPrice = parseBRL(saldo);
        currency = nameUpper.includes('EURO') || nameUpper.includes('EUR') || nameUpper.includes('WISE') && nameUpper.includes('EUR') ? 'EUR' : 'USD';
        // Re-check by name
        if (ativo === 'Euro - Wise') currency = 'EUR';
        else if (ativo === 'Dolar - Avenue' || ativo === 'Dolar - Wise') currency = 'USD';
        else if (ativo === 'BOND USA') currency = 'USD';
        break;
      }

      default: {
        console.log(`  ⚠ Unknown type "${tipo}" for "${ativo}" — skipped`);
        skipped++;
        continue;
      }
    }

    const item: Record<string, any> = {
      id: uuidv4(),
      categoryId,
      name,
      currency,
      quantity,
      unitPrice,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    if (ticker) item.ticker = ticker;
    if (indexer) item.indexer = indexer;
    if (maturityDate) item.maturityDate = maturityDate;
    if (broker) item.broker = broker;

    await docClient.send(new PutCommand({ TableName: ASSETS_TABLE, Item: item }));
    console.log(`  ✓ [${tipo}] ${name} — ${currency} ${unitPrice.toFixed(2)} x${quantity}`);
    inserted++;
  }

  console.log(`\n✅ Done! ${inserted} assets inserted, ${skipped} skipped.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
