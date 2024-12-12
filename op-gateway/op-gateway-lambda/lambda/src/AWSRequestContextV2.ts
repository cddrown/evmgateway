import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { RequestContext } from 'generic-rest-api-router';

/**
 * Implementation of the RequestContext interface that makes the AWS Lambda
 * APIGatewayProxyEventV2 and Context available to a handler.
 */
export class AwsRequestContextV2 implements RequestContext {
  constructor(
    public event: APIGatewayProxyEventV2,
    public context: Context
  ) {}

  getHttpMethod(): string {
    return this.event.requestContext.http.method;
  }

  getPath(): string {
    return this.event.requestContext.http.path;
  }

  getBody(): string {
    return this.event.body || '';
  }
}
