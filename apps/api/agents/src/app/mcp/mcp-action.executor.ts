import { Injectable } from "@nestjs/common";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";
import { IntegrationsService } from "../agent/integrations.service";
import { toolForAction, validateExecutionPermission } from "../agent/action-policy";

const actions = ["web.search", "gmail.search", "gmail.send", "gmail.draft", "gmail.reply", "calendar.list", "calendar.availability", "calendar.create", "calendar.update", "calendar.cancel", "instagram.caption", "instagram.publish"] as const;

@Injectable()
export class McpActionExecutor {
  constructor(private readonly integrations: IntegrationsService) {}

  async execute(userid: string, action: string, input: Record<string, unknown>, assignedTools: string[], approved = false) {
    if (!(actions as readonly string[]).includes(action)) throw new Error("MCP action is not registered");
    validateExecutionPermission(action, assignedTools, approved);
    const server = new McpServer({ name: "sutra-user-tools", version: "1.0.0" });
    for (const operation of actions.filter((candidate) => !toolForAction(candidate) || assignedTools.includes(toolForAction(candidate)!))) {
      server.registerTool(operation.replace(/\./g, "_"), {
        title: operation,
        description: `${operation} for the authenticated user. Mutating actions are only reachable after approval resumes the graph.`,
        inputSchema: z.object({ payload: z.record(z.string(), z.unknown()) }),
      }, async ({ payload }) => {
        try {
          const result = operation === "web.search"
            ? await this.webSearch(String(payload.query ?? ""))
            : await this.integrations.execute(userid, operation, payload as Record<string, unknown>);
          return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
        } catch (error) {
          return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Tool execution failed" }] };
        }
      });
    }
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "sutra-langgraph", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const toolName = action.replace(/\./g, "_");
      const available = await client.listTools();
      if (!available.tools.some((tool) => tool.name === toolName)) throw new Error(`MCP tool ${toolName} not found`);
      const result = await client.callTool({ name: toolName, arguments: { payload: input } });
      if (result.isError) throw new Error((result.content as Array<{ type: string; text?: string }>).map((part) => part.type === "text" ? part.text : "").join("\n"));
      return result.structuredContent as Record<string, unknown> ?? { content: result.content };
    } finally {
      await client.close();
      await server.close();
    }
  }

  private async webSearch(query: string) {
    if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured");
    if (!query.trim() || query.length > 500) throw new Error("Search query must contain 1 to 500 characters");
    const search = new TavilySearch({ topic: "general", maxResults: 5 });
    return search.invoke({ query });
  }
}
