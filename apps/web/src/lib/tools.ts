import type { ComponentType, SVGProps } from "react";
import type { AgentTool } from "@/types";
import { GmailIcon, GoogleCalendarIcon, InstagramIcon } from "@/components/ui/brand-icons";

/** UI-only metadata. Not part of the backend Agent model. */
export interface ToolMeta {
  id: AgentTool;
  label: string;
  /** Used on the agent builder. */
  toolDescription: string;
  /** Used on the integrations page. */
  integrationDescription: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  permissions: string[];
}

export const TOOLS: ToolMeta[] = [
  {
    id: "instagram",
    label: "Instagram",
    toolDescription: "Create and publish Instagram content.",
    integrationDescription: "Let agents draft captions and publish posts to your Instagram account.",
    Icon: InstagramIcon,
    permissions: ["Publish posts on your behalf", "Read basic profile information"],
  },
  {
    id: "gmail",
    label: "Gmail",
    toolDescription: "Compose and send emails.",
    integrationDescription: "Let agents write and send email from your Gmail account.",
    Icon: GmailIcon,
    permissions: ["Compose and send email", "Read your email address"],
  },
  {
    id: "googlecalendar",
    label: "Google Calendar",
    toolDescription: "Schedule and manage calendar events.",
    integrationDescription: "Let agents create, update, and cancel events on your calendar.",
    Icon: GoogleCalendarIcon,
    permissions: ["Create and edit calendar events", "Read your calendar availability"],
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<AgentTool, ToolMeta>;

/** The built-in agent used whenever no custom agent is selected. */
export const GENERAL_AGENT = {
  id: "general",
  name: "General",
  description: "Everyday assistant for questions, writing, and analysis.",
} as const;
