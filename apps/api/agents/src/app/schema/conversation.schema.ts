import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: true, timestamps: true })
export class ConversationMessage {
  @Prop({ type: String, enum: ["user", "assistant", "tool"], required: true }) role: string;
  @Prop({ type: String, required: true }) content: string;
  @Prop({ type: MongooseSchema.Types.Mixed }) metadata?: Record<string, unknown>;
}
export const conversationMessageSchema = SchemaFactory.createForClass(ConversationMessage);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: String, required: true, index: true }) userid: string;
  @Prop({ type: String, required: true }) title: string;
  @Prop({ type: String, default: null }) agentid: string | null;
  @Prop({ type: [conversationMessageSchema], default: [] }) messages: ConversationMessage[];
  @Prop({ type: MongooseSchema.Types.Mixed, select: false }) checkpoint?: Record<string, unknown>;
}
export const conversationSchema = SchemaFactory.createForClass(Conversation);
conversationSchema.index({ userid: 1, updatedAt: -1 });
