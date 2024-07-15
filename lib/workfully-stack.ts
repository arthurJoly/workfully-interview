import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiECS } from "./constructs/ApiECS";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import {ApplicationLoadBalancer, ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpAlbIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export class WorkfullyStack extends cdk.Stack {

  // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-private-integration.html#http-api-private-integration-vpc-link
  // https://github.com/Workfully-github/codechallenge-platform
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var vpc = new Vpc(this, "myVpc", {
      restrictDefaultSecurityGroup: false
    });
    
    //TODO: add target group and listeners and rules
    var alb = new ApplicationLoadBalancer(this, 'ALB', {
      vpc,
    });
    var targetGroup = new ApplicationTargetGroup(this, "hello", {port: 80, vpc: vpc})
    var listener = alb.addListener("default", {port: 80, defaultTargetGroups: [targetGroup]})
    

    var apiGateway = new HttpApi(this, "apiName");

    var link = apiGateway.addVpcLink({vpcLinkName:"apiLink", vpc: vpc })

    var integration = new HttpAlbIntegration("integration", listener, {vpcLink: link} );

    apiGateway.addRoutes({
      path: '/{proxy+}',
      methods: [ HttpMethod.ANY ],
      integration: integration,
    });

    var ecs = new ApiECS(this, "testECS", {
      name: "test",
      vpc: vpc
    })

    listener.addTargets("test", {port: 80, targets : [ecs.ecsService]})
  }
}
