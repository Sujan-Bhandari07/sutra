import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

export interface Authreq extends Request {
  user: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Authreq>();
    const token = req.cookies.token;
    if (!token) {
      throw new UnauthorizedException("Pls login first");
    }
    const decoded = await this.jwt.verifyAsync(token);
    if (!decoded) {
      throw new UnauthorizedException("Pls login first");
    }
    req.user = decoded._id;

    return true;
  }
}
