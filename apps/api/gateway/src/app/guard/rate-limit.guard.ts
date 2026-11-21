import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@sutra/redis";
import type { Authreq } from "./auth.guard";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Authreq>();
    const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
    const limit = request.path.startsWith("/api/uploads")
      ? Number(process.env.RATE_LIMIT_UPLOADS ?? 5)
      : Number(process.env.RATE_LIMIT_REQUESTS ?? 30);
    const key = `sutra:rate:${request.user}:${request.route?.path ?? request.path}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, windowSeconds);
    if (count > limit) throw new HttpException("Request limit reached. Please try again shortly.", HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
