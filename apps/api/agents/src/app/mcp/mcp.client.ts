import { MCPAdapter } from "@langchain/mcp-adapters";
import path from "path";


const serverpath = process.env.SUTRA_MCP_SERVER_PATH ?? path.join(__dirname, "mcp.server.js");


export const mcpClient = new MCPAdapter({
  servers:{
    sutra:{
      transport:"stdio",
      command:process.execPath,
      args:[serverpath]
    }

  }
})


export const getTools = async()=>{
  const tools = await mcpClient.listTools()
  return tools;
}
