#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

// ─── Database Layer ────────────────────────────────────────────────
const dbStack = new DynamoDBStack(app, 'MyCapitalDatabaseStack', {
  env,
  description: 'My Capital - DynamoDB tables',
});

// ─── Backend (ECS Fargate) ─────────────────────────────────────────
new BackendStack(app, 'MyCapitalBackendStack', {
  env,
  description: 'My Capital - NestJS backend on ECS Fargate',
  categoriesTable: dbStack.categoriesTable,
  assetsTable: dbStack.assetsTable,
});

app.synth();
