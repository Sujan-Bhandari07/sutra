import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type ApprovalDocument = HydratedDocument<Approval>;
export type ApprovalStatus = "pending" | "executing" | "approved" | "rejected" | "cancelled" | "failed";

@Schema({ timestamps: true })
export class Approval {
  @Prop({ type: String, required: true, index: true }) userid: string;
  @Prop({ type: String, required: true, index: true }) conversationid: string;
  @Prop({ type: String, index: true }) checkpointthreadid?: string;
  @Prop({ type: String, required: true }) action: string;
  @Prop({ type: String, required: true }) summary: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) input: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed }) preview?: Record<string, unknown>;
  @Prop({ type: String, enum: ["pending", "executing", "approved", "rejected", "cancelled", "failed"], default: "pending", index: true }) status: ApprovalStatus;
  @Prop({ type: String, unique: true, required: true }) idempotencykey: string;
  @Prop({ type: MongooseSchema.Types.Mixed }) result?: Record<string, unknown>;
  @Prop({ type: String }) error?: string;
  @Prop({ type: Date }) completedat?: Date;
}
export const approvalSchema = SchemaFactory.createForClass(Approval);
approvalSchema.index({ userid: 1, createdAt: -1 });
