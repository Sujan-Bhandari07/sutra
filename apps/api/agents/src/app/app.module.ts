import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from "@sutra/db"
import { Agent, agentSchema } from './schema/agents.schema';

@Module({
  imports: [
   DbModule.forRoot(process.env.MONGO_URI),
    DbModule.forFeature([{name:Agent.name,schema:agentSchema}]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
