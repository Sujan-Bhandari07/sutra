import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ACreateAgentDto, GetAgentsDto } from '@sutra/shared';

@Controller()
export class AppController {
  constructor(private readonly agentService: AppService) {}

  @MessagePattern("createagent")
  createagent(@Payload() data:ACreateAgentDto){
    return this.agentService.createagent(data)
  }

  @MessagePattern("getagents")
  getagents(@Payload() data:GetAgentsDto){
    return this.agentService.getagents(data)
  }

  
}
