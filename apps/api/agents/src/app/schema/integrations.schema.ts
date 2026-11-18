import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";

export type IntegrationDocument = HydratedDocument<Integration>;
export enum Providertype {
  google = "google",
  instagram = "instagram",
}
export enum EStatus{
    connected="connected",
    expired="expired",
    revoked="revoked",
    error="error"
}

@Schema({ _id: false, timestamps: false })
class Account {
  @Prop({ type: String, required: true, lowercase: true })
  email: string;

  @Prop({ type: String })
  username: string;

  @Prop({ type: String })
  displayname: string;
}
const accountSchema = SchemaFactory.createForClass(Account)

type Servicestype = "gmail" | "googlecalender" | "instagram"

@Schema({_id:false})
class Token{

    @Prop({ type: String,select:false })
  accesstoken: string;

    @Prop({ type: String,select:false })
  refreshtoken: string;

    @Prop({ type: Date })
  expiresat: Date;
}

const tokenSchema = SchemaFactory.createForClass(Token)

@Schema({ timestamps: true })
export class Integration {
  @Prop({ type: String, required: true, enum: ["google", "instagram"] })
  provider: Providertype;

  @Prop([{ type: String, enum: ["gmail", "googlecalender", "instagram"] }])
  services: Servicestype[];

  @Prop({ type: String, required: true })
  provideraccountid: string;

  @Prop({ type: String, required: true })
  userid: string;

  @Prop({ type: accountSchema })
  account: Account;

  @Prop({ type: tokenSchema })
  tokens: Token;
 @Prop({ type: [String] })
  scopes: string[];

    @Prop({ type: String, required: true, enum: ["google", "instagram"],default:EStatus.connected })
  status: EStatus;

    @Prop({ type:Date })
  connectedat: Date;

    @Prop({ type:Date,default:null })
  lastusedat: Date | null;

    @Prop({ type: mongoose.Schema.Types.Mixed})
  metadata: Record<string,any>;




}

export const integrationSchema = SchemaFactory.createForClass(Integration);
