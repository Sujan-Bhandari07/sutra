import { ChatGroq } from "@langchain/groq"
import { getTools } from "../mcp/mcp.client"
const tools=  getTools()

const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.4,
    maxTokens: 500,
    maxRetries: 2,
    // other params...
}).bindTools([tools])

export{llm}