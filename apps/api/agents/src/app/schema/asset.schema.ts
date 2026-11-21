import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AssetDocument = HydratedDocument<Asset>;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ type: String, required: true, index: true }) userid: string;
  @Prop({ type: String, required: true, unique: true }) assetid: string;
  @Prop({ type: String, required: true }) filename: string;
  @Prop({ type: String, required: true, enum: ["image/jpeg", "image/png", "video/mp4"] }) contenttype: string;
  @Prop({ type: Number, required: true, max: 100 * 1024 * 1024 }) size: number;
  @Prop({ type: String, required: true }) publicurl: string;
}

export const assetSchema = SchemaFactory.createForClass(Asset);
assetSchema.index({ userid: 1, createdAt: -1 });
