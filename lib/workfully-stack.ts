import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiECS } from "./constructs/ApiECS";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import {Integration, IntegrationType, RestApi, VpcLink, ConnectionType} from "aws-cdk-lib/aws-apigateway";
import {NetworkLoadBalancer, NetworkTargetGroup} from "aws-cdk-lib/aws-elasticloadbalancingv2";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class WorkfullyStack extends cdk.Stack {

  // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-private-integration.html#http-api-private-integration-vpc-link
  // https://github.com/Workfully-github/codechallenge-platform
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var vpc = new Vpc(this, "myVpc");

    //TODO: add target group and listeners and rules
    var nlb = new NetworkLoadBalancer(this, 'NLB', {
      vpc,
    });
    var targetGroup = new NetworkTargetGroup(this, "default", {port: 80, vpc: vpc})
    var listener = nlb.addListener("default", {port: 80, defaultTargetGroups: [targetGroup]})


    //TODO: vpc link http api instead of rest api
    var link = new VpcLink(this, "apiLink", {
      targets: [nlb],
    });
    var integration = new Integration({
      type: IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      options: {
        connectionType: ConnectionType.VPC_LINK,
        vpcLink: link,
      },
    });

    var apiGateway = new RestApi(this, "apiName", { defaultIntegration: integration })
    apiGateway.root.addMethod('ANY');
    apiGateway.root.addResource('test');


    var ecs = new ApiECS(this, "testECS", {
      name: "test",
      vpc: vpc
    })

    listener.addTargets("test", {port: 80, targets : [ecs.ecsService]})
  }
}
