# Sutra frontend

A Next.js (App Router) frontend for Sutra: chat with AI agents, build custom agents, and manage the accounts they can use.

> **Status: frontend only, running on mock data.** There is no backend, AI model, or OAuth connected. Every reply, agent, and connection is simulated locally in the browser and resets on refresh. See [Limitations](#limitations).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run typecheck`.

Requires Node.js 20.9 or newer.

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Google sign-in screen (Firebase-ready, not yet configured) |
| `/chat` | Main conversation UI with agent selector, attachments, markdown |
| `/agents` | Your agents: search, open chat, edit, delete |
| `/agents/create` | Agent builder |
| `/agents/[id]` | Edit an agent (same form as create) |
| `/integrations` | Instagram, Gmail, Google Calendar connections |
| `/settings` | Profile, account, connected accounts, theme, log out |

`/` redirects to `/chat`. The dashboard routes are not auth-gated yet.

## Project structure

```
src/
├── app/
│   ├── (auth)/login/          login page
│   ├── (dashboard)/           shell layout + chat, agents, integrations, settings
│   ├── globals.css            design tokens (dark default, light variant)
│   └── layout.tsx             fonts, theme bootstrap, providers
├── components/
│   ├── layout/                sidebar, header, profile menu, settings view
│   ├── chat/                  ChatWindow, ChatMessage, ChatInput, AgentSelector, CodeBlock, ...
│   ├── agents/                AgentForm, ToolSelector, AgentCard, AgentList, ...
│   ├── integrations/          IntegrationCard, ConnectionStatus
│   └── ui/                    Button, Dialog, Dropdown, Tooltip, EmptyState, skeletons, brand icons
├── services/                  auth, agents, conversations, messages, integrations, mock-data
├── store/app-store.ts         Zustand store (conversations, agents, integrations, UI state)
├── lib/                       utils, tool metadata
├── hooks/                     useAppInit, useAttachments
└── types/                     shared TypeScript types
```

## Connecting the real backend

All data access goes through `src/services/*`. Pages and components never read mock data directly, so integrating the NestJS API means replacing the bodies of those functions.

- **Agent model.** `Agent` in `src/types/index.ts` mirrors the backend schema (`name`, `description`, `instruction`, `userid`, `tools`). `tools` is narrowed to `"instagram" | "gmail" | "googlecalendar"` on the frontend. The form never collects `userid`; `services/agents.ts` fills it from the signed-in user, and the server should set it from the verified token.
- **Authentication.** `services/auth.ts#signInWithGoogle` currently rejects with a "not set up" error. To enable it, install Firebase, create `.env.local` with the variables below, and call `signInWithPopup` there. Then add a session check to `app/(dashboard)/layout.tsx`.
- **Integrations.** `connectIntegration` should redirect to the provider's OAuth consent screen and `listIntegrations` should read real connection state. Gmail and Google Calendar are separate integrations by design.
- **Chat.** `services/messages.ts#streamReply` is an async generator that yields growing text. Swap it for a streaming request to your API and keep the same shape.

```bash
# .env.local (never commit this file)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Design notes

- Palette is defined as CSS variables in `globals.css` and mapped into Tailwind v4 via `@theme inline`. Dark is the default; Settings also offers Light and System.
- Typeface is Geist (via the `geist` package, bundled locally, so builds don't need network access to Google Fonts).
- Motion is limited to state changes. `prefers-reduced-motion` is respected.

## Limitations

- **All data is simulated.** Chat replies are canned samples that say so. Agents, conversations, and connection states live in memory and reset on reload.
- **No real authentication.** Login shows a clear error until Firebase is configured; it offers a link to the demo workspace.
- **No real OAuth.** "Connect" on the Integrations page flips a local flag and is labelled as demo mode on the page.
- **Attachments are local previews only.** Nothing is uploaded; limit is 6 files of 10 MB each per message.
- **Terms of Service and Privacy Policy links are placeholders** (`href="#"`).
- **Conversations aren't routable.** `/chat` holds the active conversation in client state, so there are no per-conversation URLs yet.
- Not yet tested on real Safari/iOS or Firefox; tested in Chromium at 1440px and 390px widths.
