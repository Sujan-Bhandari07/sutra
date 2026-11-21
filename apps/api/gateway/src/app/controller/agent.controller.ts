import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { GCreateAgentDto } from "@sutra/shared";
import { Authreq, JwtGuard } from "../guard/auth.guard";
import { firstValueFrom } from "rxjs";

@Controller("agents")
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

  @UseGuards(JwtGuard)
  @Patch(":id")
  updateagent(@Param("id") id: string, @Body() data: GCreateAgentDto, @Req() req: Authreq) {
    return firstValueFrom(this.agentclient.send("updateagent", { ...data, id, userid: req.user }));
  }

  @UseGuards(JwtGuard)
  @Delete(":id")
  deleteagent(@Param("id") id: string, @Req() req: Authreq) {
    return firstValueFrom(this.agentclient.send("deleteagent", { id, userid: req.user }));
  }
}
