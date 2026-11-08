import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { userController } from "./controller/user.controller";
import {JwtModule} from "@nestjs/jwt"

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    JwtModule.register({
      secret:process.env.JWT_SECRET,
      signOptions:{
        expiresIn:"7d"
      }
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
  controllers: [AppController,userController],
  providers: [AppService],
})
export class AppModule {}
