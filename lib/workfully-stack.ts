import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiECS } from "./constructs/ApiECS";
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, MariaDbEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

export class WorkfullyStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var apiEcs = new ApiECS(this, "WorkfullyEcsApi", {
      name: "workfully",
      repositoryImage: ContainerImage.fromRegistry("amazon/amazon-ecs-sample")
    })

    const credsSecretName = `/rds/creds/maria-01`.toLowerCase()
    const creds = new DatabaseSecret(this, 'MariaRdsCredentials', {
      secretName: credsSecretName,
      username: 'admin'
    })

    var dbServer = new DatabaseInstance(this, 'MariaRdsInstance', {
      vpcSubnets: {
        onePerAz: true,
        //TODO: move to private isolated
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      },
      credentials: Credentials.fromSecret(creds),
      vpc: apiEcs.vpc,
      port: 3306,
      databaseName: 'main',
      allocatedStorage: 20,
      instanceIdentifier: 'maria-01',
      engine: DatabaseInstanceEngine.mariaDb({
        version: MariaDbEngineVersion.VER_10_11
      }),
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.SMALL)
    })

 

    apiEcs.grantDbAccess(dbServer, 3306);
  }
}
