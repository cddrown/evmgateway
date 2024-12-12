import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { FunctionRouter } from 'generic-rest-api-router';
import { AwsRequestContextV2 } from './AWSRequestContextV2';

/**
 * Defines an AWS Lambda REST API and the functions that will be invoked for all matching
 * HTTP methods and paths.  The template variable T refers to the resource being handled
 * by this REST API.
 */
export class AwsFunctionRouterV2<T> extends FunctionRouter<
  T,
  AwsRequestContextV2
> {
  /**
   * Calls the appropriate Handler based on the HTTP method and path found in the
   * requestContext.  Returns the result of the handler execution as an
   * APIGatewayProxyResultV2.
   *
   * @param requestContext
   * @returns handler result
   */
  async handle(
    requestContext: AwsRequestContextV2
  ): Promise<APIGatewayProxyResultV2> {
    const response = await super.handleRequest(requestContext);

    return {
      headers: response.headers,
      statusCode: response.statusCode,
      body: response.body || '',
    };
  }
}
