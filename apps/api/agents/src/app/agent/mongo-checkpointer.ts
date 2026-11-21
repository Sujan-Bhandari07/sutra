import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { BaseCheckpointSaver, type Checkpoint, type CheckpointTuple } from "@langchain/langgraph";
import type { CheckpointListOptions, CheckpointMetadata, PendingWrite } from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";
import { Model } from "mongoose";
import { GraphCheckpoint, GraphCheckpointDocument } from "../schema/checkpoint.schema";

@Injectable()
export class MongoCheckpointSaver extends BaseCheckpointSaver {
  constructor(@InjectModel(GraphCheckpoint.name) private readonly model: Model<GraphCheckpointDocument>) { super(); }

  private key(config: RunnableConfig) {
    const { thread_id, checkpoint_ns = "" } = config.configurable ?? {};
    if (!thread_id) throw new Error("LangGraph requires a thread_id");
    return { threadid: String(thread_id), namespace: String(checkpoint_ns) };
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const key = this.key(config);
    const id = config.configurable?.checkpoint_id;
    const doc = id
      ? await this.model.findOne({ ...key, checkpointid: String(id) }).lean()
      : await this.model.findOne(key).sort({ createdAt: -1 }).lean();
    if (!doc) return undefined;
    const checkpoint = await this.serde.loadsTyped(doc.checkpointtype, Buffer.from(doc.checkpointdata, "base64")) as Checkpoint;
    const pendingWrites = await Promise.all((doc.writes ?? []).sort((a, b) => String(a.taskpath ?? "").localeCompare(String(b.taskpath ?? "")) || String(a.taskid).localeCompare(String(b.taskid)) || Number(a.idx) - Number(b.idx)).map(async (write: any) => [
      String(write.taskid), String(write.channel), await this.serde.loadsTyped(String(write.type), Buffer.from(String(write.data), "base64")),
    ] as [string, string, unknown]));
    const parentConfig = doc.parentcheckpointid ? { configurable: { ...key, checkpoint_id: doc.parentcheckpointid } } : undefined;
    return {
      config: { configurable: { ...key, checkpoint_id: doc.checkpointid } },
      checkpoint,
      metadata: doc.metadata as CheckpointMetadata,
      parentConfig,
      pendingWrites,
    };
  }

  async *list(config: RunnableConfig, options: CheckpointListOptions = {}): AsyncGenerator<CheckpointTuple> {
    const key = this.key(config);
    const query: Record<string, unknown> = { ...key };
    const before = options.before?.configurable?.checkpoint_id;
    if (before) {
      const beforeDoc = await this.model.findOne({ ...key, checkpointid: String(before) }).select({ createdAt: 1 }).lean();
    if (beforeDoc) query.createdAt = { $lt: (beforeDoc as { createdAt?: Date }).createdAt };
    }
    if (options.filter) for (const [key, value] of Object.entries(options.filter)) query[`metadata.${key}`] = value;
    const docs = await this.model.find(query).sort({ createdAt: -1 }).limit(options.limit ?? 50).lean();
    for (const doc of docs) yield await this.getTuple({ configurable: { ...key, checkpoint_id: doc.checkpointid } }) as CheckpointTuple;
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const key = this.key(config);
    const [checkpointtype, bytes] = await this.serde.dumpsTyped(checkpoint);
    const parentcheckpointid = config.configurable?.checkpoint_id;
    await this.model.updateOne(
      { ...key, checkpointid: checkpoint.id },
      { $set: { parentcheckpointid: parentcheckpointid ? String(parentcheckpointid) : undefined, checkpointtype, checkpointdata: Buffer.from(bytes).toString("base64"), metadata } },
      { upsert: true },
    );
    return { configurable: { ...config.configurable, ...key, checkpoint_id: checkpoint.id } };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string, taskPath?: string): Promise<void> {
    const key = this.key(config);
    const checkpointid = String(config.configurable?.checkpoint_id ?? "");
    const encoded = await Promise.all(writes.map(async ([channel, value], idx) => {
      const [type, bytes] = await this.serde.dumpsTyped(value);
      return { taskid: taskId, taskpath: taskPath ?? "", idx, channel, type, data: Buffer.from(bytes).toString("base64") };
    }));
    if (encoded.length) await this.model.updateOne(
      { ...key, checkpointid },
      { $addToSet: { writes: { $each: encoded } } },
      { upsert: true },
    );
  }

  async deleteThread(threadId: string): Promise<void> { await this.model.deleteMany({ threadid: threadId }); }
}
