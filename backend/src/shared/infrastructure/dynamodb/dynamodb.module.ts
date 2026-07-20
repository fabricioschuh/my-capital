import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DYNAMODB_CLIENT = 'DYNAMODB_CLIENT';
export const DYNAMODB_DOC_CLIENT = 'DYNAMODB_DOC_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DYNAMODB_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.get<string>('aws.region') ?? 'us-east-1';
        const endpoint = configService.get<string>('aws.dynamodbEndpoint');

        const clientConfig: any = { region };

        if (endpoint) {
          clientConfig.endpoint = endpoint;
          clientConfig.credentials = {
            accessKeyId: configService.get<string>('aws.accessKeyId') ?? 'local',
            secretAccessKey: configService.get<string>('aws.secretAccessKey') ?? 'local',
          };
        }

        return new DynamoDBClient(clientConfig);
      },
      inject: [ConfigService],
    },
    {
      provide: DYNAMODB_DOC_CLIENT,
      useFactory: (client: DynamoDBClient) => {
        return DynamoDBDocumentClient.from(client, {
          marshallOptions: {
            convertEmptyValues: false,
            removeUndefinedValues: true,
            convertClassInstanceToMap: true,
          },
          unmarshallOptions: {
            wrapNumbers: false,
          },
        });
      },
      inject: [DYNAMODB_CLIENT],
    },
  ],
  exports: [DYNAMODB_CLIENT, DYNAMODB_DOC_CLIENT],
})
export class DynamoDBModule {}
