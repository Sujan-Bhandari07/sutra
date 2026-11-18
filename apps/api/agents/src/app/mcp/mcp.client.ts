import { MCPAdapter } from "@langchain/mcp-adapters";
import path from "path";


const serverpath= path.join(__dirname,"mcp.server.ts")


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
  console.log("tools from ",tools)
}