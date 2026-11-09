import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AgentDocument = HydratedDocument<Agent>

@Schema({ timestamps: true })
export class Agent {

    @Prop({type:String,required:true,})
    name:string


    @Prop({type:String,required:true,})
    description:string

    @Prop({type:String,required:true,})
    instruction:string


    @Prop({type:String,required:true,})
    userid:string

    @Prop({type:[String],default:[]})
    tools:string[]






}


export const agentSchema= SchemaFactory.createForClass(Agent)
