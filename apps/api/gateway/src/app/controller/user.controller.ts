import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Post,
  Res,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { LoginDto, success } from "@sutra/shared";
import { firstValueFrom } from "rxjs";
import type { Response } from "express";

@Controller("users")
export class userController {
  constructor(
    @Inject("USERS_SERVICE") private readonly usersclient: ClientProxy,
  ) {}

  @Post("login")
  async login(
    @Body() data: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await firstValueFrom(this.usersclient.send("login", data));
    if (!result) {
      throw new InternalServerErrorException(
        "Something went wrong while responsing.",
      );
    }
    res.cookie("token", result.token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return success("Login successfull !", result.payload);
  }
}
