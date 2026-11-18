import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";

import { TavilySearch } from "@langchain/tavily";

const search = new TavilySearch({
    topic:"general",
    maxResults:5,
    
})

const server = new McpServer({
  name: "sutra-mcp-server",
  version: "1.0.0",
});

server.registerTool("web-search",{
  title:"Search the web",
  description:"Search the web for up-to-date information, relevant websites, articles, documentation, and answers to user queries. Use this tool when the user asks for current information, wants to research a topic, find online resources, or verify information that may have changed. Return relevant search results with titles, URLs, and concise summaries. Do not use this tool for general knowledge questions that can be answered reliably without web research.",
  inputSchema:z.object({
    query:z.string()
  })
},
async({query})=>{
try {
    console.log(query)
 const response = await search.invoke({query})
  return{
    content:[{
      type:"text",
      text:response
    }]
  }
  
} catch (error:any) {
  
  return{
    content:[{
      type:"text",
      text:error
    }]
  }
}
  
}
)



const main =async ()=>{
const transport = new StdioServerTransport()
await server.connect(transport)
console.log("Mcp server started")
}

main().catch((error)=>{
  console.log(error)
})