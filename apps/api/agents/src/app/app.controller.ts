import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ACreateAgentDto, GetAgentsDto } from '@sutra/shared';
import { Providertype } from './schema/integrations.schema';

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

  @MessagePattern("updateagent")
  updateagent(@Payload() data: ACreateAgentDto & { id: string }) { return this.agentService.updateagent(data); }

  @MessagePattern("deleteagent")
  deleteagent(@Payload() data: { id: string; userid: string }) { return this.agentService.deleteagent(data); }

  @MessagePattern("integration.google.connect")
  connectGoogle(@Payload() data: { userid: string; service?: "gmail" | "calendar"; frontendOrigin?: string }) { return this.agentService.connectgoogle({ _id: data.userid, service: data.service, frontendOrigin: data.frontendOrigin }); }

  @MessagePattern("integration.instagram.connect")
  connectInstagram(@Payload() data: { userid: string; frontendOrigin?: string }) { return this.agentService.connectinstagram({ _id: data.userid, frontendOrigin: data.frontendOrigin }); }

  @MessagePattern("integration.google.callback")
  googleCallback(@Payload() data: { code: string; state: string; error?: string }) { return this.agentService.googlecallback(data); }

  @MessagePattern("integration.instagram.callback")
  instagramCallback(@Payload() data: { code: string; state: string; error?: string }) { return this.agentService.instagramcallback(data); }

  @MessagePattern("integration.list")
  getIntegrations(@Payload() data: { userid: string }) { return this.agentService.getintegrations({ _id: data.userid }); }

  @MessagePattern("integration.disconnect")
  disconnectIntegration(@Payload() data: { userid: string; provider: "google" | "instagram"; service?: "gmail" | "googlecalender" | "instagram" }) { return this.agentService.disconnectIntegration({ ...data, provider: data.provider === "google" ? Providertype.google : Providertype.instagram }); }

  @MessagePattern("chat.send")
  chat(@Payload() data: { userid: string; text: string; conversationid?: string; agentid?: string | null; assetids?: string[]; streamid?: string; turnid?: string; timezone?: string }) { return this.agentService.chat(data); }

  @MessagePattern("asset.register")
  registerAsset(@Payload() data: { userid: string; assetid: string; filename: string; contenttype: string; size: number; publicurl: string }) { return this.agentService.registerAsset(data); }

  @MessagePattern("conversation.list")
  conversations(@Payload() data: { userid: string }) { return this.agentService.listConversations(data.userid); }

  @MessagePattern("conversation.get")
  conversation(@Payload() data: { userid: string; id: string }) { return this.agentService.getConversation(data); }

  @MessagePattern("conversation.delete")
  deleteConversation(@Payload() data: { userid: string; id: string }) { return this.agentService.deleteConversation(data); }

  @MessagePattern("approval.list")
  approvals(@Payload() data: { userid: string; status?: "pending" | "executing" | "approved" | "rejected" | "cancelled" | "failed" }) { return this.agentService.listApprovals(data); }

  @MessagePattern("approval.decide")
  decideApproval(@Payload() data: { userid: string; id: string; decision: "approved" | "rejected" | "cancelled"; streamid?: string }) { return this.agentService.decideApproval(data); }

  @MessagePattern("activity.list")
  activity(@Payload() data: { userid: string; conversationid?: string }) { return this.agentService.listActivity(data); }

  
}
