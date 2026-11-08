import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ClientsModule, Transport} from "@nestjs/microservices"
import { ConfigModule, ConfigService } from "@nestjs/config"

@Module({
  imports: [
    ClientsModule.registerAsync([   {
        name: 'USERS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.getOrThrow<string>("USERS_QUEUE"),
            queueOptions: { durable: true },
          },






        }),
      },
    
       {
        name: 'AGENTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.getOrThrow<string>("AGENTS_QUEUE"),
            queueOptions: { durable: true },
          },
        }),
      },
    
    
    ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
