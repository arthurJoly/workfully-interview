import { Construct } from 'constructs';
import { Cluster, FargateService, FargateTaskDefinition, LogDriver, Protocol, RepositoryImage } from "aws-cdk-lib/aws-ecs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { InstanceType, Vpc } from "aws-cdk-lib/aws-ec2";
import {ApplicationListener, ApplicationLoadBalancer, ApplicationTargetGroup, IApplicationLoadBalancerTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpAlbIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface CustomProps {
    name: string;
    repositoryImage: RepositoryImage;
}

export class ApiECS extends Construct {

    public ecsCluster : Cluster;
    public ecsService : FargateService;
    public fargateTaskDefinition: FargateTaskDefinition;

    public vpc: Vpc;
    public apiGateway: HttpApi;

    private applicationListener: ApplicationListener;

    constructor(scope: Construct, id: string, props: CustomProps) {
        super(scope, id);
       
        this.createVpc(props.name)
        this.createEcsCluster(props.name, props.repositoryImage);
        this.createLoadBalancer(props.name, [this.ecsService])
        this.createApiGateway(props.name, this.applicationListener)
    }

    private createVpc(name: string){
        this.vpc = new Vpc(this, `vpc_${name}`, {
            //TODO: why do we need to put false?
            restrictDefaultSecurityGroup: false
        });
    }

    private createEcsCluster(name: string, repositoryImage: RepositoryImage){
        //TODO: give possibility to reuse cluster for different API
        this.ecsCluster = new Cluster(this, `ecs_cluster_${name}`, { vpc: this.vpc });
        this.ecsCluster.addCapacity(`scaling_group_capacity_${name}`, {
            instanceType: new InstanceType("t2.xlarge"),
            desiredCapacity: 3,
        });

        this.fargateTaskDefinition = new FargateTaskDefinition(this, `fargate_task_${name}`);

        this.fargateTaskDefinition.addContainer(`container_${name}`, {
            image: repositoryImage,
            memoryLimitMiB: 512,
            portMappings: [{containerPort: 80, protocol: Protocol.TCP}],
            logging: LogDriver.awsLogs({streamPrefix: `container_${name}`, logGroup: new LogGroup(this, `log_${name}`, {retention: RetentionDays.ONE_DAY})})
        });

        this.ecsService = new FargateService(this, `ecs_service_${name}`, {
            cluster : this.ecsCluster,
            taskDefinition: this.fargateTaskDefinition
        });
    }

    private createLoadBalancer(name: string, targets: IApplicationLoadBalancerTarget[]){
        var alb = new ApplicationLoadBalancer(this, `alb_${name}`, {
            vpc: this.vpc,
        });
        var targetGroup = new ApplicationTargetGroup(this, `alb_target_group_${name}`, {port: 80, vpc: this.vpc})
        this.applicationListener = alb.addListener(`alb_listener_${name}`, {port: 80, defaultTargetGroups: [targetGroup]})
        this.applicationListener.addTargets(`default_target_${name}`, {port: 80, targets})
    }

    private createApiGateway(name: string, listener: ApplicationListener){
        this.apiGateway = new HttpApi(this, `api_${name}`);
        var link = this.apiGateway.addVpcLink({vpcLinkName: `api_link_${name}`, vpc: this.vpc })
        var integration = new HttpAlbIntegration(`api_integration_${name}`, listener, {vpcLink: link} );
    
        this.apiGateway.addRoutes({
            path: '/{proxy+}',
            methods: [ HttpMethod.ANY ],
            integration: integration
        });
    }

    public grantDBWrite() {
    }
    public grantDBRead() {

    }
}