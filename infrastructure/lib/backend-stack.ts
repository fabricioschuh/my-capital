import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface BackendStackProps extends cdk.StackProps {
  categoriesTable: dynamodb.Table;
  assetsTable: dynamodb.Table;
}

export class BackendStack extends cdk.Stack {
  public readonly loadBalancerDns: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // ─── VPC ─────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, 'MyCapitalVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ─── ECS Cluster ─────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, 'MyCapitalCluster', {
      vpc,
      containerInsights: true,
    });

    // ─── ECR Repository ──────────────────────────────────────────────
    const backendRepo = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: 'my-capital-backend',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        { maxImageCount: 10, description: 'Keep last 10 images' },
      ],
    });

    // ─── Task Role ───────────────────────────────────────────────────
    const taskRole = new iam.Role(this, 'BackendTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant DynamoDB access
    props.categoriesTable.grantReadWriteData(taskRole);
    props.assetsTable.grantReadWriteData(taskRole);

    // ─── Task Definition ─────────────────────────────────────────────
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    const logGroup = new logs.LogGroup(this, 'BackendLogs', {
      logGroupName: '/my-capital/backend',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    taskDefinition.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo, 'latest'),
      memoryLimitMiB: 512,
      environment: {
        NODE_ENV: 'production',
        PORT: '3001',
        AWS_REGION: this.region,
        DYNAMODB_ENDPOINT: '',
        EXCHANGE_RATE_PROVIDER: 'frankfurter',
        EXCHANGE_RATE_CACHE_TTL: '3600',
        LOG_LEVEL: 'info',
      },
      portMappings: [{ containerPort: 3001 }],
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: 'backend',
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/api/categories || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(30),
      },
    });

    // ─── Application Load Balancer ───────────────────────────────────
    const alb = new elbv2.ApplicationLoadBalancer(this, 'BackendALB', {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener('Listener', {
      port: 80,
      open: true,
    });

    // ─── Fargate Service ─────────────────────────────────────────────
    const service = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition,
      desiredCount: 2,
      assignPublicIp: false,
    });

    listener.addTargets('BackendTargets', {
      port: 3001,
      targets: [service],
      healthCheck: {
        path: '/api/categories',
        interval: cdk.Duration.seconds(30),
        healthyHttpCodes: '200',
      },
    });

    this.loadBalancerDns = alb.loadBalancerDnsName;

    // ─── Outputs ─────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'BackendUrl', {
      value: `http://${alb.loadBalancerDnsName}`,
      exportName: 'MyCapital-BackendUrl',
    });

    new cdk.CfnOutput(this, 'BackendEcrRepo', {
      value: backendRepo.repositoryUri,
      exportName: 'MyCapital-BackendEcrRepo',
    });
  }
}
