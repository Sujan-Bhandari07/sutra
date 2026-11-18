import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from "@sutra/db"
import { Agent, agentSchema } from './schema/agents.schema';
import { Integration, integrationSchema } from './schema/integrations.schema';

@Module({
  imports: [
   DbModule.forRoot(process.env.MONGO_URI),
    DbModule.forFeature([{name:Agent.name,schema:agentSchema}]),
    DbModule.forFeature([{name:Integration.name,schema:integrationSchema}]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
