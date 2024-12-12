import { ethers, BytesLike, AbiCoder } from 'ethers';
import {
  Fragment,
  FunctionFragment,
  Interface,
  JsonFragment,
} from '@ethersproject/abi';
import { hexlify } from '@ethersproject/bytes';
//import { Router, createCors } from 'itty-router';
import {
  HandlerFunc,
  HandlerDescription,
} from '@ensdomains/ccip-read-cf-worker';
import { isAddress, isBytesLike } from 'ethers';

import { AwsFunctionRouterV2 } from './AWSFunctionRouterV2';
import { FunctionResponse } from 'generic-rest-api-router';

//const { corsify, preflight } = createCors();

export interface RPCCall {
  to: BytesLike;
  data: BytesLike;
}

export interface RPCResponse {
  status: number;
  body: RPCResponseBody;
}

type RPCResponseBody = {
  data?: string;
  message?: string;
};

interface Handler {
  type: FunctionFragment;
  func: HandlerFunc;
}

function toInterface(
  abi: string | readonly (string | Fragment | JsonFragment)[] | Interface
) {
  if (Interface.isInterface(abi)) {
    return abi;
  }
  return new Interface(abi);
}

function getFunctionSelector(calldata: string): string {
  return calldata.slice(0, 10).toLowerCase();
}

export class ServerLambda {
  /** @ignore */
  readonly handlers: { [selector: string]: Handler };

  /**
   * Constructs a new CCIP-Read gateway server instance.
   */
  constructor() {
    this.handlers = {};
  }

  /**
   * Adds an interface to the gateway server, with handlers to handle some or all of its functions.
   * @param abi The contract ABI to use. This can be in any format that ethers.js recognises, including
   *        a 'Human Readable ABI', a JSON-format ABI, or an Ethers `Interface` object.
   * @param handlers An array of handlers to register against this interface.
   */
  add(
    abi: string | readonly (string | Fragment | JsonFragment)[] | Interface,
    handlers: Array<HandlerDescription>
  ) {
    const abiInterface = toInterface(abi);

    for (const handler of handlers) {
      const fn = abiInterface.getFunction(handler.type);

      this.handlers[Interface.getSighash(fn)] = {
        type: fn,
        func: handler.func,
      };
    }
  }

  /**
   * // set up server object here
   * const app = server.makeApp('/');
   * module.exports = {
   *  fetch: function (request, _env, _context) {
   *    return app.handle(request)
   *  }
   * };
   * ```
   * The path prefix to `makeApp` will have sender and callData arguments appended.
   * If your server is on example.com and configured as above, the URL template to use
   * in a smart contract would be "https://example.com/{sender}/{callData}.json".
   * @returns An `itty-router.Router` object configured to serve as a CCIP read gateway.
   */
  makeApp(prefix: string) {
    const app = new AwsFunctionRouterV2({
      resourcePath: prefix,
      includeCORS: true,
    })
      .get('', async (route) => {
        return route.okResponse('hey ho!');
      })
      .get(':sender/:callData.json', async (route, requestContext) => {
        const sender = route.getPathParams(requestContext).sender;
        const callData = route.getPathParams(requestContext).callData;

        if (!isAddress(sender) || !isBytesLike(callData)) {
          return route.errorResponse(400);
        }

        try {
          const response = await this.call({ to: sender, data: callData });
          const ret: FunctionResponse = {
            statusCode: response.status,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(response.body),
          };
          return ret;
        } catch (e) {
          return route.errorResponse(500);
        }
      })
      .post('', async (route, requestContext) => {
        const requestBody = JSON.parse(requestContext.getBody());
        const sender = requestBody.sender;
        const callData = requestBody.data;

        if (!isAddress(sender) || !isBytesLike(callData)) {
          return route.errorResponse(400);
        }

        try {
          const response = await this.call({ to: sender, data: callData });
          const ret: FunctionResponse = {
            statusCode: response.status,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(response.body),
          };
          return ret;
        } catch (e) {
          return route.errorResponse(500);
        }
      });
    return app;
  }

  async call(call: RPCCall): Promise<RPCResponse> {
    const calldata = hexlify(call.data);
    const selector = getFunctionSelector(calldata);

    // Find a function handler for this selector
    const handler = this.handlers[selector];
    if (!handler) {
      return {
        status: 404,
        body: {
          message: `No implementation for function with selector ${selector}`,
        },
      };
    }

    const abiCoder: AbiCoder = AbiCoder.defaultAbiCoder();

    const inputs: ethers.ParamType[] = [];
    for (const input in handler.type.inputs) {
      if (typeof input !== 'string') {
        inputs.push(input);
      }
    }
    // Decode function arguments
    const args = abiCoder.decode(inputs, '0x' + calldata.slice(10));

    // Call the handler
    const result = await handler.func(args, call);

    const outputs: ethers.ParamType[] = [];
    for (const output in handler.type.inputs) {
      if (typeof output !== 'string') {
        inputs.push(output);
      }
    }

    // Encode return data
    return {
      status: 200,
      body: {
        data: handler.type.outputs
          ? hexlify(abiCoder.encode(outputs, result))
          : '0x',
      },
    };
  }
}
