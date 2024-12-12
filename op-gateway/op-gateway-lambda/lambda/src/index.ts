import { ServerLambda } from './aws-lambda-ccip-router';
//import { propsDecoder } from '@ensdomains/evm-gateway';
import { TrackerLambda, PropsDecoderLambda } from './aws-lambda-tracker';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { OPProofService } from '../../../src/OPProofService';
import { JsonRpcProvider } from 'ethers';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { AwsRequestContextV2 } from './AWSRequestContextV2';

interface RouterLambda {
  handle: (request: AwsRequestContextV2) => Promise<APIGatewayProxyResultV2>;
}

let app: RouterLambda;

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  const L1_PROVIDER_URL: string = process.env.l1_provider_url || '';
  const L2_PROVIDER_URL: string = process.env.l2_provider_url || '';
  const L2_OPTIMISM_PORTAL: string = process.env.l2_optimism_portal || '';
  const DELAY: string = process.env.delay || '';
  const GATEWAY_DOMAIN: string = process.env.gateway_domain || '';
  const ENDPOINT_URL: string = process.env.endpoint_url || '';

  // note - tracker doesn't support lambda functions case

  const tracker = new TrackerLambda(GATEWAY_DOMAIN, {
    apiEndpoint: ENDPOINT_URL,
    enableLogging: true,
  });

  if (!app) {
    const l1Provider = new JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new JsonRpcProvider(L2_PROVIDER_URL);

    console.log({ L1_PROVIDER_URL, L2_PROVIDER_URL, DELAY });
    const gateway = new EVMGateway(
      new OPProofService(
        l1Provider,
        l2Provider,
        L2_OPTIMISM_PORTAL,
        Number(DELAY)
      )
    );

    const server = new ServerLambda();
    gateway.add(server);
    app = server.makeApp('/');
  }

  const props = propsDecoderAWS(event);
  await tracker.trackEvent(event, 'request', { props }, true);

  const requestContext = new AwsRequestContextV2(event, context);
  return app
    .handle(requestContext)
    .then(tracker.logResult.bind(tracker, propsDecoderAWS, event));
};

const propsDecoderAWS: PropsDecoderLambda<APIGatewayProxyEventV2> = (
  request?: APIGatewayProxyEventV2
) => {
  if (!request || !request.rawPath) {
    return {};
  }
  const trackingData = request.rawPath.match(
    /\/0x[a-fA-F0-9]{40}\/0x[a-fA-F0-9]{1,}\.json/
  );
  if (trackingData) {
    return {
      sender: trackingData[0].slice(1, 42),
      calldata: trackingData[0].slice(44).replace('.json', ''),
    };
  } else {
    return {};
  }
};
