import { IsIn } from "class-validator";

export class ApprovalDecisionDto {
  @IsIn(["approved", "rejected", "cancelled"])
  decision!: "approved" | "rejected" | "cancelled";
}
