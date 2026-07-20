import { Injectable, Inject, Logger } from '@nestjs/common';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CategoryRepository } from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { DYNAMODB_DOC_CLIENT } from '../../../shared/infrastructure/dynamodb/dynamodb.module';

const TABLE_NAME = 'my-capital-categories';

@Injectable()
export class DynamoDBCategoryRepository implements CategoryRepository {
  private readonly logger = new Logger(DynamoDBCategoryRepository.name);

  constructor(
    @Inject(DYNAMODB_DOC_CLIENT)
    private readonly docClient: DynamoDBDocumentClient,
  ) {}

  async findAll(): Promise<Category[]> {
    const result = await this.docClient.send(
      new ScanCommand({ TableName: TABLE_NAME }),
    );
    return (result.Items ?? []) as Category[];
  }

  async findAllActive(): Promise<Category[]> {
    const all = await this.findAll();
    return all.filter((c) => c.isActive);
  }

  async findById(id: string): Promise<Category | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      }),
    );
    return (result.Item as Category) ?? null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const all = await this.findAll();
    return all.find((c) => c.slug === slug) ?? null;
  }

  async create(entity: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const now = new Date().toISOString();
    const item: Category = {
      id: uuidv4(),
      ...entity,
      createdAt: now,
      updatedAt: now,
    };

    await this.docClient.send(
      new PutCommand({ TableName: TABLE_NAME, Item: item }),
    );

    return item;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const now = new Date().toISOString();
    const updateUpdates = { ...updates, updatedAt: now };

    const updateExpressionParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updateUpdates).forEach(([key, value]) => {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes as Category;
  }

  async delete(id: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
      }),
    );
  }
}
