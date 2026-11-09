import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GetProfileDto, LoginDto } from '@sutra/shared';

@Controller()
export class AppController {
  constructor(private readonly userService: AppService) {}

  @MessagePattern("login")
  login(@Payload() data:LoginDto){
    return this.userService.login(data)
  }

  @MessagePattern("getprofile")
  getprofile(@Payload() data:GetProfileDto ){
    return this.userService.getprofile(data)

  }


}
