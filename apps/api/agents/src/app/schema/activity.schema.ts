import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type ActivityDocument = HydratedDocument<Activity>;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ type: String, required: true, index: true }) userid: string;
  @Prop({ type: String, required: true }) conversationid: string;
  @Prop({ type: String, required: true }) type: string;
  @Prop({ type: String, required: true }) status: string;
  @Prop({ type: String }) summary?: string;
  @Prop({ type: MongooseSchema.Types.Mixed }) details?: Record<string, unknown>;
}
export const activitySchema = SchemaFactory.createForClass(Activity);
activitySchema.index({ userid: 1, createdAt: -1 });
