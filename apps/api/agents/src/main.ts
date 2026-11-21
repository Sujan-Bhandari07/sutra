/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {ServiceExceptionFilter} from "@sutra/filter"
import { MicroserviceOptions, Transport } from "@nestjs/microservices"
import { loadApiEnvironment } from "../../config/environment";

loadApiEnvironment("agents");

async function bootstrap() {
  process.title="Agent service"
  const { AppModule } = await import('./app/app.module');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: process.env.AGENTS_QUEUE,
        queueOptions: {
          durable: true,
        },
      },
    },
  );
  app.useGlobalFilters(new ServiceExceptionFilter())

  await app.listen();
  Logger.log("agents service started");
}


bootstrap();
