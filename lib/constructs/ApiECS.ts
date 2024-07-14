import { Construct } from 'constructs';
import { aws_ecs as ecs  } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';
import {PortMap} from "aws-cdk-lib/aws-ecs";

export interface CustomProps {
    // List all the properties
    name: string;
    vpc: ec2.Vpc;
}
export class ApiECS extends Construct {

    public ecsCluster : ecs.Cluster;

    public ecsService : ecs.FargateService;

    // READ : https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
    constructor(scope: Construct, id: string, props: CustomProps) {
        super(scope, id);
        this.ecsCluster = new ecs.Cluster(this, 'Cluster', { vpc: props.vpc });
        this.ecsCluster.addCapacity('DefaultAutoScalingGroupCapacity', {
            instanceType: new ec2.InstanceType("t2.xlarge"),
            desiredCapacity: 3,
        });


        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef');

        taskDefinition.addContainer('DefaultContainer', {
            //TODO: change to fromEcrRepository and pass the registry as props
            image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
            memoryLimitMiB: 512,
            portMappings: [{containerPort: 8080}]
        });


        this.ecsService = new ecs.FargateService(this, 'Service', {
            cluster : this.ecsCluster,
            taskDefinition,
        });

    }

    public grantDBWrite() {
    }
    public grantDBRead() {

    }
}