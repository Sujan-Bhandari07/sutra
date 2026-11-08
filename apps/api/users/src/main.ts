/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {MicroserviceOptions,Transport} from "@nestjs/microservices"
import {ServiceExceptionFilter} from "@sutra/filter"

async function bootstrap() {
  process.title="User service"
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: process.env.USERS_QUEUE ,
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  app.useGlobalFilters(new ServiceExceptionFilter())

  await app.listen();
  Logger.log("user service started");
}


bootstrap();
