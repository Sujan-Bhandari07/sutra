import { ArrayMaxSize, IsArray, IsMongoId, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ChatDto {
  @IsOptional() @IsString() @MaxLength(12000) text?: string;
  @IsOptional() @IsMongoId() conversationId?: string;
  @IsOptional() @IsMongoId() agentId?: string;
  @IsOptional() @IsUUID() turnId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsUUID(undefined, { each: true }) assetIds?: string[];
  @IsOptional() @IsString() @MaxLength(64) timeZone?: string;
}
