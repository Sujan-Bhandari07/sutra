import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./schema/user.schema";
import { Model } from "mongoose";
import { REDIS_CLIENT } from "@sutra/redis";
import Redis from "ioredis";
import { ILogin } from "@sutra/shared";
import { getAuth } from "firebase-admin/auth";
import { app } from "./config/firebase";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name) private readonly usermodel: Model<UserDocument>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
  ) {}

  async login(data: ILogin) {
    const { token } = data;
    const decoded = await getAuth(app).verifyIdToken(token);
    let user = await this.usermodel.findOne({ email: decoded.email });
    if (!user) {
      user = await this.usermodel.create({
        fullname: decoded.name,
        email: decoded.email,
        profilepic: decoded.picture,
        firebaseuuid: decoded.uid,
      });
    }
    const jwt_token = await this.jwt.signAsync({
      _id:user._id,
      fullname:user.fullname,
      email:user.email,
      profilepic:user.profilepic

    });
    if (!jwt_token) {
      throw new InternalServerErrorException("Something went wrong with jwt");
    }

    return {
      token: jwt_token,
      payload: user,
    };
  }
}
