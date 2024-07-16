import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiECS } from "./constructs/ApiECS";
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';

export class WorkfullyStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var apiEcs = new ApiECS(this, "WorkfullyEcsApi", {
      name: "workfully",
      repositoryImage: ContainerImage.fromRegistry("amazon/amazon-ecs-sample")
    })
  }
}
