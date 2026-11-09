import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { GCreateAgentDto } from "@sutra/shared";
import { Authreq, JwtGuard } from "../guard/auth.guard";
import { firstValueFrom } from "rxjs";

@Controller()
export class AgentController {
  constructor(
    @Inject("AGENTS_SERVICE") private readonly agentclient: ClientProxy,
  ) {}

  @UseGuards(JwtGuard)
  @Post("createagent")
  createagent(@Body() data: GCreateAgentDto, @Req() req: Authreq) {
    return firstValueFrom(
      this.agentclient.send("createagent", { ...data, userid: req.user }),
    );
  }

  @UseGuards(JwtGuard)
  @Get("getagents")
  getagents(@Req() req: Authreq) {
    return firstValueFrom(
      this.agentclient.send("getagents", { userid: req.user }),
    );
  }
}
