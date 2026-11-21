import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { userController } from "./controller/user.controller";
import {JwtModule} from "@nestjs/jwt"
import { AgentController } from "./controller/agent.controller";
import { IntegrationController } from "./controller/integration.controller";
import { RedisModule } from "@sutra/redis";
import { RateLimitGuard } from "./guard/rate-limit.guard";
import { WorkspaceController } from "./controller/workspace.controller";
import { UploadController } from "./controller/upload.controller";
import { apiEnvironmentFiles, validateApiEnvironment } from "../../../config/environment";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: apiEnvironmentFiles("gateway"), validate: validateApiEnvironment }),
    RedisModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>("JWT_SECRET"), signOptions: { expiresIn: "7d" } }),
    }),
    ClientsModule.registerAsync([
      {
        name: "USERS_SERVICE",
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>("RABBITMQ_URL")],
            queue: config.getOrThrow<string>("USERS_QUEUE"),
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: "AGENTS_SERVICE",
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>("RABBITMQ_URL")],
            queue: config.getOrThrow<string>("AGENTS_QUEUE"),
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [AppController,userController,AgentController,IntegrationController,WorkspaceController,UploadController],
  providers: [AppService, RateLimitGuard],
})
export class AppModule {}
