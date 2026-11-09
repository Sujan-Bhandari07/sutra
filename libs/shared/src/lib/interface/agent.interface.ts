export interface ICreateAgent{

    name:string
    description:string
    instruction:string
    tools:string[]
    userid:string
}

export interface IGetAgents{

    userid:string
}