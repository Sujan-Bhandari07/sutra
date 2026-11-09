import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsString,
} from "class-validator";

export class GCreateAgentDto {
  @IsString({ message: "Agent name must be string." })
  @IsDefined({ message: "Agent name is required" })
  @IsNotEmpty({ message: "Agent name cannot be empty." })
  name!: string;

  @IsString({ message: "Agent description must be string." })
  @IsDefined({ message: "Agent description is required" })
  @IsNotEmpty({ message: "Agent description cannot be empty." })
  description!: string;

  @IsString({ message: "Agent instruction must be string." })
  @IsDefined({ message: "Agent instruction is required" })
  @IsNotEmpty({ message: "Agent instruction cannot be empty." })
  instruction!: string;

  @IsArray({ message: "Agents must be an array." })
  @ArrayNotEmpty({ message: "Please select some agents." })
  @IsString({ each: true, message: "Each agent must be a string." })
  tools!: string[];
}
export class ACreateAgentDto extends GCreateAgentDto{
  @IsString({ message: "User id must be string." })
  @IsDefined({ message: "User id is required" })
  @IsNotEmpty({ message: "User id cannot be empty." })
    userid!:string
}

export class GetAgentsDto{
  @IsString({ message: "User id must be string." })
  @IsDefined({ message: "User id is required" })
  @IsNotEmpty({ message: "User id cannot be empty." })
    userid!:string
}
