import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GoogleConnectDto {
  @IsIn(["gmail", "calendar"])
  service!: "gmail" | "calendar";

  @IsString()
  @IsNotEmpty()
  returnOrigin!: string;
}

export class InstagramConnectDto {
  @IsString()
  @IsNotEmpty()
  returnOrigin!: string;
}

export class GoogleDisconnectDto {
  @IsOptional()
  @IsIn(["gmail", "googlecalender"])
  service?: "gmail" | "googlecalender";
}
