import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoDBStack extends cdk.Stack {
  public readonly categoriesTable: dynamodb.Table;
  public readonly assetsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── Categories Table ───────────────────────────────────────────
    this.categoriesTable = new dynamodb.Table(this, 'CategoriesTable', {
      tableName: 'my-capital-categories',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect data in production
    });

    // ─── Assets Table ────────────────────────────────────────────────
    this.assetsTable = new dynamodb.Table(this, 'AssetsTable', {
      tableName: 'my-capital-assets',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI: Query assets by categoryId efficiently
    this.assetsTable.addGlobalSecondaryIndex({
      indexName: 'categoryId-index',
      partitionKey: { name: 'categoryId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ─── Outputs ─────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'CategoriesTableName', {
      value: this.categoriesTable.tableName,
      exportName: 'MyCapital-CategoriesTableName',
    });

    new cdk.CfnOutput(this, 'AssetsTableName', {
      value: this.assetsTable.tableName,
      exportName: 'MyCapital-AssetsTableName',
    });
  }
}
