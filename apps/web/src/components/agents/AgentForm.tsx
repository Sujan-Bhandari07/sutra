"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { ToolSelector } from "./ToolSelector";
import type { AgentInput } from "@/types";

export const agentSchema = z.object({
  name: z.string().trim().min(1, "Give your agent a name.").max(60, "Keep the name under 60 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Describe what this agent is for.")
    .max(200, "Keep the description under 200 characters."),
  instruction: z
    .string()
    .trim()
    .min(10, "Add a few sentences so the agent knows how to behave.")
    .max(6000, "Instructions can be up to 6,000 characters."),
  tools: z.array(z.enum(["instagram", "gmail", "googlecalendar"])),
});

const INSTRUCTION_PLACEHOLDER = `You are a marketing assistant for a small design studio.

- Write in a warm, direct tone.
- Keep Instagram captions under 120 words.
- Suggest one call to action per post.
- Ask who the audience is before drafting a campaign.`;

export function AgentForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues?: AgentInput;
  submitLabel: string;
  onSubmit: (values: AgentInput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AgentInput>({
    resolver: zodResolver(agentSchema),
    defaultValues: defaultValues ?? { name: "", description: "", instruction: "", tools: [] },
  });

  // react-hook-form's watch API is required to keep the live character count current.
  // oxlint-disable-next-line react/incompatible-library
  const descriptionLength = watch("description")?.length ?? 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
      <div>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          placeholder="Marketing Assistant"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
        <FieldError id="name-error" message={errors.name?.message} />
      </div>

      <div>
        <FieldLabel htmlFor="description" hint={`${descriptionLength}/200`}>
          Description
        </FieldLabel>
        <Input
          id="description"
          placeholder="Drafts launch copy and captions for product announcements"
          autoComplete="off"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "description-error" : undefined}
          {...register("description")}
        />
        <FieldError id="description-error" message={errors.description?.message} />
      </div>

      <div>
        <FieldLabel htmlFor="instruction">Instructions</FieldLabel>
        <Textarea
          id="instruction"
          rows={9}
          placeholder={INSTRUCTION_PLACEHOLDER}
          className="min-h-48 font-mono text-[13px] leading-relaxed"
          aria-invalid={!!errors.instruction}
          aria-describedby="instruction-help"
          {...register("instruction")}
        />
        <p id="instruction-help" className="mt-1.5 text-[13px] text-muted">
          Describe the role, tone, and rules this agent should follow in every conversation.
        </p>
        <FieldError message={errors.instruction?.message} />
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-medium">Tools</h2>
          <p className="mt-0.5 text-[13px] text-muted">Choose the services this agent is allowed to use.</p>
        </div>
        <Controller name="tools" control={control} render={({ field }) => <ToolSelector value={field.value} onChange={field.onChange} />} />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
