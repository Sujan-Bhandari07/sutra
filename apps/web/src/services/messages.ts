import type { AgentRecord, Attachment, Integration } from "@/types";
import { TOOL_BY_ID } from "@/lib/tools";
import { sleep } from "@/lib/utils";

interface ReplyContext {
  text: string;
  attachments: Attachment[];
  agent: AgentRecord | null;
  integrations: Integration[];
}

/** Builds a canned reply. It is explicitly labelled as a demo in the output. */
function buildMockReply({ text, attachments, agent, integrations }: ReplyContext): string {
  const lower = text.toLowerCase();
  const parts: string[] = [];

  if (agent) {
    parts.push(`Responding as **${agent.name}**, following your saved instructions.`);
    if (agent.tools.length) {
      const lines = agent.tools.map((t) => {
        const connected = integrations.find((i) => i.tool === t)?.connected;
        return `- ${TOOL_BY_ID[t].label}: ${connected ? "connected" : "not connected, so I can't use it yet"}`;
      });
      parts.push(`Tools assigned to this agent:\n\n${lines.join("\n")}`);
    }
  }

  if (attachments.length) {
    const lines = attachments.map((a) => `- ${a.name} (${a.kind === "image" ? "image" : "file"})`);
    parts.push(`I can see ${attachments.length === 1 ? "one attachment" : `${attachments.length} attachments`} on your message:\n\n${lines.join("\n")}\n\nThey're shown as local previews only; nothing has been uploaded.`);
  }

  if (/\b(code|function|hook|typescript|javascript|script|snippet)\b/.test(lower)) {
    parts.push(
      `Here's a starting point:\n\n\`\`\`typescript\nexport function groupBy<T, K extends string>(items: T[], key: (item: T) => K) {\n  return items.reduce<Record<K, T[]>>((acc, item) => {\n    const k = key(item);\n    (acc[k] ??= []).push(item);\n    return acc;\n  }, {} as Record<K, T[]>);\n}\n\`\`\``,
    );
  } else if (/\b(table|compare|comparison)\b/.test(lower)) {
    parts.push(
      `Here's a quick comparison.\n\n| Option | Best for | Trade-off |\n| --- | --- | --- |\n| Simple | Getting started fast | Less flexible |\n| Balanced | Most teams | Needs some setup |\n| Advanced | Large workloads | Higher upkeep |`,
    );
  } else if (!attachments.length) {
    parts.push(
      `Thanks for the message. Here's how I'd approach it:\n\n1. Clarify the goal and who it's for.\n2. List the constraints you can't change.\n3. Start with the smallest version that works.\n\nTell me more and I'll get specific.`,
    );
  }

  parts.push("*Demo response. No AI backend is connected yet.*");
  return parts.join("\n\n");
}

/**
 * Yields the reply in growing chunks to mimic streaming.
 * The first await is the "thinking" delay that drives the typing indicator.
 */
export async function* streamReply(ctx: ReplyContext, signal?: { aborted: boolean }): AsyncGenerator<string> {
  await sleep(900);
  const full = buildMockReply(ctx);
  const tokens = full.match(/\S+\s*/g) ?? [full];
  let out = "";
  for (let i = 0; i < tokens.length; i += 3) {
    if (signal?.aborted) return;
    out += tokens.slice(i, i + 3).join("");
    yield out;
    await sleep(22);
  }
}
