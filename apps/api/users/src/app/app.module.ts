import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule, ConfigService} from "@nestjs/config"
import {DbModule} from "@sutra/db"
import {RedisModule} from "@sutra/redis"
import { User, userSchema } from './schema/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { resolve } from "node:path";

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true, envFilePath: [resolve(process.cwd(), "apps/api/users/.env"), resolve(process.cwd(), ".env")]}),
    DbModule.forRoot(process.env.MONGO_URI),
    DbModule.forFeature([{name:User.name,schema:userSchema}]),
    RedisModule.forRoot({keyPrefix:"users"}),
    JwtModule.registerAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>("JWT_SECRET"), signOptions: { expiresIn: "7d" } }),
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
