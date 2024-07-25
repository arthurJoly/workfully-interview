# Welcome to your CDK TypeScript project

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Prerequisite
* brew install node
* npm install -g typescript
* npm install -g aws-cdk

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Deploy

* Update AWS account number in `/bin/workfully.ts`
* npm run build
* cdk synth
* cdk bootstrap (only First deployment)
* cdk deploy WorkfullyStack

## Explanation
- The CDK construct `ApiECS` should be part of a library that could be used by different consumers
- The `ApiECS` construct exposes some of the components that composed it so teams can use them to build other constructs
