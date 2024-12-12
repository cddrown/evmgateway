import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import dotenv from 'dotenv';

dotenv.config(); //Load environment variables from .env file

export class OpGatewayLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const assetPath: string = './lambda';

    // Define the Lambda function resource
    const opGatewayFunction = new lambda.Function(this, 'OP-Gateway', {
      runtime: lambda.Runtime.NODEJS_20_X, // Provide any supported Node.js runtime
      handler: 'index.handler',
      code: lambda.Code.fromAsset(assetPath),
      environment: {
        l1_provider_url: process.env.L1_PROVIDER_URL || '',
        l2_provider_url: process.env.L2_PROVIDER_URL || '',
        l2_optimism_portal: process.env.L2_OPTIMISM_PORTAL || '',
        delay: process.env.DELAY || '',
        gateway_domain: process.env.GATEWAY_DOMAIN || '',
        endpoint_url: process.env.ENDPOINT_URL || '',
      },
    });

    // Define the Lambda function URL resource
    const opGatewayFunctionUrl = opGatewayFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Define a CloudFormation output for your URL
    new cdk.CfnOutput(this, 'opGatewayOutput', {
      value: opGatewayFunctionUrl.url,
    });
  }
}
