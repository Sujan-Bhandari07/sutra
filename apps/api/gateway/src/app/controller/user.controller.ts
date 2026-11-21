import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Post,
  HttpCode,
  HttpException,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { LoginDto, success } from "@sutra/shared";
import { firstValueFrom } from "rxjs";
import type { Response } from "express";
import { Authreq, JwtGuard } from "../guard/auth.guard";

@Controller("users")
export class userController {
  private readonly logger = new Logger(userController.name);

  constructor(
    @Inject("USERS_SERVICE") private readonly usersclient: ClientProxy,
  ) {}

  @Post("login")
  async login(
    @Body() data: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await firstValueFrom(this.usersclient.send("login", data));
      if (!result || typeof result.token !== "string" || !result.payload) {
        this.logger.error(JSON.stringify({ stage: "users_rpc_response", code: "invalid_response" }));
        throw new InternalServerErrorException("Sutra could not create the user session.");
      }

      const isProduction = process.env.NODE_ENV === "production";
      const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" as const : "lax" as const,
        path: "/",
      };

      res.cookie("token", result.token, cookieOptions);
      this.logger.log(JSON.stringify({
        stage: "login_cookie_creation",
        outcome: "success",
        cookieOptions: { ...cookieOptions, maxAge: cookieOptions.maxAge / 1000 }
      }));
      return success("Login successful.", result.payload);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const failure = error as { statusCode?: number; status?: number; code?: string | number };
      const status = Number(failure?.statusCode ?? failure?.status);
      const rawCode = failure?.code === undefined ? "rpc_error" : String(failure.code);
      const code = /^[A-Za-z0-9_/-]{1,80}$/.test(rawCode) ? rawCode : "unknown";
      this.logger.error(JSON.stringify({
        stage: "users_rpc_login",
        code,
        status: Number.isInteger(status) ? status : undefined,
      }));

      if (status === 400) throw new BadRequestException("The Google sign-in request is invalid.");
      if (status === 401 || status === 403) throw new UnauthorizedException("The Google sign-in token is invalid or expired.");
      throw new ServiceUnavailableException("The authentication service is temporarily unavailable.");
    }
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" as const : "lax" as const,
      path: "/",
    });
    return success("Signed out");
  }
  @UseGuards(JwtGuard)
  @Get("getprofile")
  async getprofile(@Req() req:Authreq){

    return firstValueFrom(this.usersclient.send("getprofile",{id:req.user}))

  }
}