# Prerequisites

## Install AWS CLI and CDK

Refer to https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html for instructions.

## Configure AWS SSO

In order to give cdk functions access to your AWS account, configure AWS single sign-on (SSO) to connect to an IAM Identity Centre login. This can be done with the 'aws configure sso' command. 

See https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html for full details.

# Deployment

1. Log into AWS SSO
```
aws sso login  --profile <profile-name>
```
The --profile argument can be omitted if the profile is called 'default'.

3. Set the following environment variables or add to a .env file in this directory

- L1_PROVIDER_URL
- L2_PROVIDER_URL
- L2_OPTIMISM_PORTAL
- DELAY
- GATEWAY_PROVIDER
- ENDPOINT_URL

4. Deploy with the following steps
```
cdk bootstrap
cdk synth
cdk deploy
```
The lambda url is output towards the end of the last step under 'Outputs' as follows.
```
Outputs:
OpGatewayLambdaStack.opGatewayOutput = https://...
...
```

# Removing a deployed lambda function
The lambda function can be taken down with
```
cdk destroy
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
