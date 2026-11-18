import type { AgentRecord, Conversation, Integration, User } from "@/types";

/**
 * Local seed data. Nothing here talks to a server. Replace the service
 * modules that import this file when the NestJS API is available.
 */

export const MOCK_USER: User = {
  id: "user_demo",
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
};

export const MOCK_AGENTS: AgentRecord[] = [
  {
    id: "agent_marketing",
    userid: MOCK_USER.id,
    name: "Marketing Assistant",
    description: "Drafts launch copy, captions, and a posting cadence for product announcements.",
    instruction:
      "You are a marketing specialist for a B2B software company. Write in a clear, confident tone. Keep captions under 150 words, suggest one call to action per post, and always ask for the target audience before drafting a campaign.",
    tools: ["instagram"],
  },
  {
    id: "agent_inbox",
    userid: MOCK_USER.id,
    name: "Inbox Concierge",
    description: "Replies to routine email and books meetings around your existing calendar.",
    instruction:
      "You manage my inbox and calendar. Draft replies in a friendly, concise voice. Before proposing a meeting time, check for conflicts. Never send an email without showing me the draft first.",
    tools: ["gmail", "googlecalendar"],
  },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_launch",
    title: "Planning a launch week",
    agentId: null,
    updatedAt: hoursAgo(2),
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Help me outline a launch week for a new scheduling feature. Keep it to the essentials.",
        createdAt: hoursAgo(2.1),
      },
      {
        id: "m2",
        role: "assistant",
        createdAt: hoursAgo(2),
        content: `Here's a lean plan for the week.

| Day | Focus | Owner |
| --- | --- | --- |
| Monday | Final QA and release notes | Product |
| Tuesday | Announce to existing customers | Marketing |
| Wednesday | Public launch post and demo video | Marketing |
| Thursday | Support office hours | Support |
| Friday | Review adoption and collect feedback | Product |

A few things worth deciding before Monday:

1. **Who gets early access?** A small group of customers can give you quotes for Wednesday.
2. **What counts as success?** Pick one number, such as the share of teams that schedule a meeting in their first week.
3. **Where does feedback go?** One shared channel keeps it from getting scattered.

*Demo response. No AI backend is connected yet.*`,
      },
    ],
  },
  {
    id: "conv_debounce",
    title: "Debounce a search input",
    agentId: null,
    updatedAt: hoursAgo(26),
    messages: [
      {
        id: "m3",
        role: "user",
        content: "Show me a small debounce hook in TypeScript.",
        createdAt: hoursAgo(26.1),
      },
      {
        id: "m4",
        role: "assistant",
        createdAt: hoursAgo(26),
        content: `This hook delays updating a value until it has stopped changing.

\`\`\`typescript
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
\`\`\`

Pass the debounced value to your fetch effect so requests only fire once the user pauses typing.

*Demo response. No AI backend is connected yet.*`,
      },
    ],
  },
  {
    id: "conv_captions",
    title: "Captions for the spring collection",
    agentId: "agent_marketing",
    updatedAt: hoursAgo(72),
    messages: [
      {
        id: "m5",
        role: "user",
        content: "Write three caption options for our spring collection announcement.",
        createdAt: hoursAgo(72.1),
      },
      {
        id: "m6",
        role: "assistant",
        createdAt: hoursAgo(72),
        content: `Before I draft these, who is the audience? Here are three directions you can react to:

- **Warm:** "Spring is here, and so is the new collection. Come take a look."
- **Direct:** "The spring collection is live. Shop it today."
- **Playful:** "We packed the sunshine into a box. Open it."

Tell me who you're writing for and I'll tighten these up.

*Demo response. No AI backend is connected yet.*`,
      },
    ],
  },
];

export const MOCK_INTEGRATIONS: Integration[] = [
  { tool: "instagram", connected: false },
  { tool: "gmail", connected: false },
  { tool: "googlecalendar", connected: false },
];

/** Accounts shown after a simulated connection. */
export const MOCK_ACCOUNT_LABELS: Record<string, string> = {
  instagram: "@alexmorgan.studio",
  gmail: MOCK_USER.email,
  googlecalendar: MOCK_USER.email,
};
