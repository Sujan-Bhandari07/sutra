import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from "@sutra/db"
import { Agent, agentSchema } from './schema/agents.schema';
import { Integration, integrationSchema } from './schema/integrations.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Conversation, conversationSchema } from './schema/conversation.schema';
import { Approval, approvalSchema } from './schema/approval.schema';
import { Activity, activitySchema } from './schema/activity.schema';
import { GraphCheckpoint, graphCheckpointSchema } from './schema/checkpoint.schema';
import { MongoCheckpointSaver } from './agent/mongo-checkpointer';
import { PlannerService } from './agent/planner.service';
import { IntegrationsService } from './agent/integrations.service';
import { McpActionExecutor } from './mcp/mcp-action.executor';
import { Asset, assetSchema } from './schema/asset.schema';
import { RedisModule } from '@sutra/redis';
import { apiEnvironmentFiles, validateApiEnvironment } from "../../../config/environment";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: apiEnvironmentFiles("agents"), validate: validateApiEnvironment }),
    RedisModule.forRoot(),
    JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>("JWT_SECRET") }) }),
   DbModule.forRoot(process.env.MONGO_URI),
    DbModule.forFeature([{name:Agent.name,schema:agentSchema}]),
    DbModule.forFeature([{name:Integration.name,schema:integrationSchema}]),
    DbModule.forFeature([
      { name: Conversation.name, schema: conversationSchema },
      { name: Approval.name, schema: approvalSchema },
      { name: Activity.name, schema: activitySchema },
      { name: GraphCheckpoint.name, schema: graphCheckpointSchema },
      { name: Asset.name, schema: assetSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, MongoCheckpointSaver, PlannerService, IntegrationsService, McpActionExecutor],
})
export class AppModule {}
