import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config"
import {DbModule} from "@sutra/db"
import {RedisModule} from "@sutra/redis"
import { User, userSchema } from './schema/user.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    DbModule.forRoot(process.env.MONGO_URI),
    DbModule.forFeature([{name:User.name,schema:userSchema}]),
    RedisModule.forRoot({keyPrefix:"users"}),
    JwtModule.register({
      secret:process.env.JWT_SECRET,
      signOptions:{
        expiresIn:"7d"
      }
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
