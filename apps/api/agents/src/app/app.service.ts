import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent,AgentDocument} from "./schema/agents.schema";
import {Model} from "mongoose"
import {ICreateAgent, IGetAgents, success} from "@sutra/shared"

@Injectable()
export class AppService {
  constructor(
@InjectModel(Agent.name) private readonly agentmodel:Model<AgentDocument>

  ) {}

  async createagent(data:ICreateAgent){

    const agent = await this.agentmodel.create(data)
    if(!agent){
      throw new InternalServerErrorException("Something went wrong with db")
    }
    return success("Agent created successfully.",agent)

  }

  async getagents(data:IGetAgents){
    const agents= await this.agentmodel.find({userid:data.userid})
    if(!agents){
      throw new NotFoundException("You havent created a agents.")
    }
    return success("Agents found",agents)

  }
 
}
