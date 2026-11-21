import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type GraphCheckpointDocument = HydratedDocument<GraphCheckpoint>;

@Schema({ timestamps: true })
export class GraphCheckpoint {
  @Prop({ type: String, required: true }) threadid: string;
  @Prop({ type: String, required: true, default: "" }) namespace: string;
  @Prop({ type: String, required: true }) checkpointid: string;
  @Prop({ type: String }) parentcheckpointid?: string;
  @Prop({ type: String, required: true }) checkpointtype: string;
  @Prop({ type: String, required: true }) checkpointdata: string;
  @Prop({ type: MongooseSchema.Types.Mixed }) metadata?: Record<string, unknown>;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) writes: Record<string, unknown>[];
  createdAt?: Date;
  updatedAt?: Date;
}
export const graphCheckpointSchema = SchemaFactory.createForClass(GraphCheckpoint);
graphCheckpointSchema.index({ threadid: 1, namespace: 1, checkpointid: 1 }, { unique: true });
graphCheckpointSchema.index({ threadid: 1, namespace: 1, createdAt: -1 });
