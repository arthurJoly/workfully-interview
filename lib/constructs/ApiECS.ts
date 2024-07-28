import { Construct } from 'constructs';
import { Cluster, FargateService, FargateTaskDefinition, LogDriver, Protocol, RepositoryImage } from "aws-cdk-lib/aws-ecs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { InstanceType, NetworkAcl, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import {ApplicationListener, ApplicationLoadBalancer, ApplicationTargetGroup, IApplicationLoadBalancerTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpAlbIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Alarm, Dashboard, GraphWidget } from 'aws-cdk-lib/aws-cloudwatch';

export interface ApiECSProps {
    name: string;
    repositoryImage: RepositoryImage;
    cpu: number;
    memoryLimit: number;
    instanceType: string;
    minCapacity: number;
    maxCapacity: number;
}

export class ApiECS extends Construct {

    public ecsCluster : Cluster;
    public ecsService : FargateService;
    public fargateTaskDefinition: FargateTaskDefinition;
    public vpc: Vpc;
    public apiGateway: HttpApi;

    public dashboard: Dashboard;

    private applicationListener: ApplicationListener;

    constructor(scope: Construct, id: string, props: ApiECSProps) {
        super(scope, id);
       
        this.createVpc(props.name)
        this.createEcsCluster(props.name, props);
        this.createLoadBalancer(props.name)
        this.createApiGateway(props.name)
        this.createObservability(props.name)    
    }

    public grantDbAccess(db: DatabaseInstance, port: number) {
        db.connections.allowFrom(this.ecsService, Port.tcp(port))
    }

    private createVpc(name: string){
        //TODO : restrict VPC
        this.vpc = new Vpc(this, `vpc_${name}`, {restrictDefaultSecurityGroup: false});
    }

    private createEcsCluster(name: string, props: ApiECSProps){
        //TODO: give possibility to reuse cluster for different API
        this.ecsCluster = new Cluster(this, `ecs_cluster_${name}`, { vpc: this.vpc });
        this.ecsCluster.addCapacity(`scaling_group_capacity_${name}`, {
            instanceType: new InstanceType(props.instanceType),
            minCapacity: props.minCapacity,
            maxCapacity: props.maxCapacity
        });
        this.ecsCluster.connections.allowFromAnyIpv4(Port.HTTP);

        const taskrole = new Role(this, "ecsTaskExecutionRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
          });
      
        taskrole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AmazonECSTaskExecutionRolePolicy"
            )
        );

        this.fargateTaskDefinition = new FargateTaskDefinition(this, `fargate_task_${name}`, {taskRole: taskrole});

        this.fargateTaskDefinition.addContainer(`container_${name}`, {
            image: props.repositoryImage,
            memoryLimitMiB: props.memoryLimit,
            cpu: props.cpu,
            portMappings: [{containerPort: 80, protocol: Protocol.TCP}],
            logging: LogDriver.awsLogs({streamPrefix: `container_${name}`, logGroup: new LogGroup(this, `log_${name}`, {retention: RetentionDays.ONE_DAY})})
        });

        this.ecsService = new FargateService(this, `ecs_service_${name}`, {
            cluster : this.ecsCluster,
            taskDefinition: this.fargateTaskDefinition
        });
        this.ecsService.connections.allowFromAnyIpv4(Port.HTTP);
    }

    private createLoadBalancer(name: string){
        var alb = new ApplicationLoadBalancer(this, `alb_${name}`, {
            vpc: this.vpc,
            internetFacing: false
        });
        var targetGroup = new ApplicationTargetGroup(this, `alb_target_group_${name}`, {port: 80, vpc: this.vpc})
        this.applicationListener = alb.addListener(`alb_listener_${name}`, {port: 80, defaultTargetGroups: [targetGroup]})
        this.applicationListener.addTargets(`default_target_${name}`, {port: 80, targets: [this.ecsService]})

        alb.connections.allowFromAnyIpv4(Port.HTTP);
        alb.connections.allowToAnyIpv4(Port.HTTP)
    }

    private createApiGateway(name: string){
        this.apiGateway = new HttpApi(this, `api_${name}`);
        var link = this.apiGateway.addVpcLink({vpcLinkName: `api_link_${name}`, vpc: this.vpc })
        var integration = new HttpAlbIntegration(`api_integration_${name}`, this.applicationListener, {vpcLink: link} );
    
        this.apiGateway.addRoutes({
            path: '/{proxy+}',
            methods: [ HttpMethod.ANY ],
            integration: integration
        });
    }

    private createObservability(name: string) {
        this.dashboard = new Dashboard(this, `api-${name}-dashboard`);
        this.dashboard.addWidgets(
            new GraphWidget({title: "CPU Usage", left: [this.ecsCluster.metricCpuUtilization()] }),
            new GraphWidget({title: "Memory Usage", left: [this.ecsCluster.metricMemoryUtilization()] })
        )

        new Alarm(this, `CPU-Usage-${name}`, {
            metric: this.ecsCluster.metricCpuUtilization(),
            threshold: 80,
            evaluationPeriods: 10
        });

        new Alarm(this, `Memory-Usage-${name}`, {
            metric: this.ecsCluster.metricMemoryUtilization(),
            threshold: 80,
            evaluationPeriods: 10
        });
    }
}