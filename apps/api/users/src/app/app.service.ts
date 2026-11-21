import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./schema/user.schema";
import { Model } from "mongoose";
import { REDIS_CLIENT } from "@sutra/redis";
import Redis from "ioredis";
import { IGetProfile, ILogin, success } from "@sutra/shared";
import { getAuth } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseApp } from "./config/firebase";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(User.name) private readonly usermodel: Model<UserDocument>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
  ) {}

  async login(data: ILogin) {

    this.logger.log(JSON.stringify({ stage: "login_request_received", hasToken: Boolean(data?.token) }));

    if (!data?.token || typeof data.token !== "string") {
      this.logger.warn(JSON.stringify({ stage: "login_validation_failed", reason: "missing_or_invalid_token" }));
      throw new UnauthorizedException("A Firebase ID token is required.");
    }

    let decoded: DecodedIdToken;
    try {
      this.logger.log(JSON.stringify({ stage: "firebase_app_initialization" }));
      const firebaseApp = getFirebaseApp();
      this.logger.log(JSON.stringify({ stage: "firebase_token_verification_start", projectId: firebaseApp.options.projectId }));
      decoded = await getAuth(firebaseApp).verifyIdToken(data.token);
      this.logger.log(JSON.stringify({ stage: "firebase_token_verification", outcome: "success", uid: decoded.uid, email: decoded.email }));
    } catch (error) {
      const code = this.errorCode(error);
      this.logger.warn(JSON.stringify({ stage: "firebase_token_verification", code, outcome: "failed" }));
      if (code.startsWith("auth/")) {
        throw new UnauthorizedException("The Google sign-in token is invalid or expired.");
      }
      throw new ServiceUnavailableException("Google token verification is temporarily unavailable.");
    }

    const email = decoded.email?.trim().toLowerCase();
    if (!decoded.uid || !email || decoded.email_verified !== true) {
      this.logger.warn(JSON.stringify({ stage: "firebase_claim_validation", code: "required_verified_claim_missing", uid: decoded.uid, email }));
      throw new UnauthorizedException("The Google account must provide a verified email address.");
    }

    let user: UserDocument | null;
    try {
      this.logger.log(JSON.stringify({ stage: "user_lookup_start", uid: decoded.uid, email }));
      user = await this.usermodel.findOne({ $or: [{ firebaseuuid: decoded.uid }, { email }] });
      this.logger.log(JSON.stringify({ stage: "user_lookup_complete", found: Boolean(user), uid: decoded.uid }));

      const profile = {
        fullname: decoded.name?.trim() || email.split("@")[0],
        email,
        // Firebase does not guarantee a profile photo for every Google account.
        profilepic: decoded.picture ?? "",
        firebaseuuid: decoded.uid,
      };

      if (user) {
        user = await this.usermodel.findByIdAndUpdate(user._id, { $set: profile }, { new: true, runValidators: true });
        this.logger.log(JSON.stringify({ stage: "user_profile_persistence", operation: "matched_user_refresh", userId: user._id.toString() }));
      } else {
        try {
          user = await this.usermodel.create(profile);
          this.logger.log(JSON.stringify({ stage: "user_profile_persistence", operation: "created_user", userId: user._id.toString() }));
        } catch (error) {
          // A concurrent first login can win the unique email/UID insert.
          if (this.errorCode(error) !== "11000") throw error;
          user = await this.usermodel.findOne({ $or: [{ firebaseuuid: decoded.uid }, { email }] });
          if (user) {
            user = await this.usermodel.findByIdAndUpdate(user._id, { $set: profile }, { new: true, runValidators: true });
            this.logger.log(JSON.stringify({ stage: "user_profile_persistence", operation: "duplicate_insert_recovered", userId: user._id.toString() }));
          }
        }
      }
    } catch (error) {
      this.logger.error(JSON.stringify({ stage: "user_profile_persistence", code: this.errorCode(error), outcome: "failed" }));
      throw new ServiceUnavailableException("Sutra could not save the Google account profile.");
    }

    if (!user) {
      this.logger.error(JSON.stringify({ stage: "user_profile_persistence", code: "user_missing_after_upsert", outcome: "failed" }));
      throw new InternalServerErrorException("Sutra could not create the user session.");
    }

    let sessionToken: string;
    try {
      this.logger.log(JSON.stringify({ stage: "session_token_signing_start", userId: user._id.toString() }));
      sessionToken = await this.jwt.signAsync({ _id: user._id.toString() });
      this.logger.log(JSON.stringify({ stage: "session_token_signing", outcome: "success" }));
    } catch (error) {
      this.logger.error(JSON.stringify({ stage: "session_token_signing", code: this.errorCode(error), outcome: "failed" }));
      throw new InternalServerErrorException("Sutra could not create the user session.");
    }
    if (!sessionToken) {
      this.logger.error(JSON.stringify({ stage: "session_token_signing", code: "empty_token", outcome: "failed" }));
      throw new InternalServerErrorException("Sutra could not create the user session.");
    }

    this.logger.log(JSON.stringify({ stage: "login_complete", outcome: "success", userId: user._id.toString() }));
    return { token: sessionToken, payload: user };
  }

  private errorCode(error: unknown): string {
    const code = (error as { code?: unknown } | null)?.code;
    const normalized = typeof code === "string" || typeof code === "number" ? String(code) : "unknown";
    return /^[A-Za-z0-9_/-]{1,80}$/.test(normalized) ? normalized : "unknown";
  }


  async getprofile(data:IGetProfile){
    const{id}=data
    const user = await this.usermodel.findById(id)
    if(!user){
      throw new NotFoundException("User not found")
    }
    return success("User found successfully",user)
  }

}