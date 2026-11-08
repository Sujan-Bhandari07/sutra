import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {HydratedDocument} from "mongoose"

export type UserDocument= HydratedDocument<User>

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true })
  fullname: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  email: string;

  @Prop({ type: String, required: true })
  profilepic: string;

  @Prop({ type: String, unique: true, required: true })
  firebaseuuid: string;
}

export const userSchema = SchemaFactory.createForClass(User)

