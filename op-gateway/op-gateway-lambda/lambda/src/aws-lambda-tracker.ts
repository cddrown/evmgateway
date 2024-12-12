import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

interface TrackerOptions {
  apiEndpoint?: string;
  enableLogging?: boolean;
}

interface TrackingOptions {
  props?: { [key: string]: number | string } | string | number;
  data?: { [key: string]: number | string } | string | number;
}

interface RequestBody {
  domain: string;
  name: string;
  url: string;
  referrer?: string;
  props?: { [key: string]: number | string } | string | number;
  data?: { [key: string]: number | string } | string | number;
}

export type PropsDecoderLambda<T extends APIGatewayProxyEventV2> = (
  request?: T,
  response?: string
) => {
  //[key: string]: any;
  sender?: string | undefined;
  callData?: string | undefined;
};

export class TrackerLambda<
  T extends APIGatewayProxyEventV2 = APIGatewayProxyEventV2,
> {
  domain = '';
  enableLogging = false;
  apiEndpoint = 'https://plausible.io/api/event';

  constructor(domain: string, options: TrackerOptions = {}) {
    this.domain = domain;
    this.apiEndpoint = options.apiEndpoint || this.apiEndpoint;
    this.enableLogging = options.enableLogging || this.enableLogging;
  }

  private log(message: string) {
    if (this.enableLogging) {
      console.log(message);
    }
  }

  private getUrl(req: T): string {
    return `http://${req.requestContext.domainName}${req.rawPath}`;
  }

  async trackPageview(
    req: T,
    options?: TrackingOptions,
    includeUserDetails?: boolean
  ) {
    await this.trackEvent(req, 'pageview', options, includeUserDetails);
  }

  async trackEvent(
    req: T,
    name: string,
    { props, data }: TrackingOptions = {},
    includeUserDetails = false
  ): Promise<void> {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('Invalid event name');
      }

      const body: RequestBody = {
        domain: this.domain,
        name: name,
        url: this.getUrl(req),
      };

      if (req.headers['Referrer']) {
        body.referrer = req.headers['Referrer'] || '';
      }

      if (props) {
        body.props = props;
      }

      if (data) {
        body.data = data;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const userAgent = req.headers['User-Agent'];
      if (userAgent) {
        headers['User-Agent'] = userAgent;
        headers['X-Forwarded-For'] = '127.0.0.1';
      }

      if (includeUserDetails) {
        headers['X-Forwarded-For'] = req.requestContext.http.sourceIp;
        //("originalUrl" in req ? req.socket?.remoteAddress : null) ||
        //requestInfo.get("CF-Connecting-IP") ||
        //"";
      }

      this.log(JSON.stringify(headers));
      this.log(JSON.stringify(body));

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Plausible API responded with ${response.status}`);
      }

      this.log(`Event tracked: ${name}`);
    } catch (err) {
      console.error(`Plausible error: ${err}`);
    }
  }

  private getStructuredResult(result: APIGatewayProxyResultV2) {
    if (typeof result === 'string') {
      return JSON.parse(result);
    } else return result;
  }

  async logResult(
    decoder: PropsDecoderLambda<T> = () => ({}),
    req: T,
    resp: APIGatewayProxyResultV2
  ): Promise<APIGatewayProxyResultV2> {
    const res = this.getStructuredResult(resp);
    if (!res.body) {
      return resp;
    }
    const clonedResp = res.clone();
    try {
      const responseText = await clonedResp.text();
      const response: { data: string } = JSON.parse(responseText);

      const props = {
        result: response.data.substring(0, 200),
        ...(!!decoder && decoder(req, response.data)),
      };

      await this.trackEvent(req, 'result', { props }, true);
    } catch (error) {
      this.log(`logResult error: ${error}`);
    }
    return resp;
  }
}
