<div align="center">

# Sutra

**Delegate everyday digital tasks to specialized AI agents using natural language.**

![Status](https://img.shields.io/badge/STATUS-IN%20DEVELOPMENT-0d1117?style=for-the-badge&labelColor=161b22&color=21262d)

![TypeScript](https://img.shields.io/badge/TypeScript-0d1117?style=flat-square&logo=typescript&logoColor=3178C6)
![Next.js](https://img.shields.io/badge/Next.js-0d1117?style=flat-square&logo=nextdotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-0d1117?style=flat-square&logo=nestjs&logoColor=E0234E)
![LangChain](https://img.shields.io/badge/LangChain-0d1117?style=flat-square&logo=langchain&logoColor=1C9C8C)
![LangGraph](https://img.shields.io/badge/LangGraph-0d1117?style=flat-square&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-0d1117?style=flat-square&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-0d1117?style=flat-square&logo=mongodb&logoColor=47A248)
![Redis](https://img.shields.io/badge/Redis-0d1117?style=flat-square&logo=redis&logoColor=DC382D)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-0d1117?style=flat-square&logo=rabbitmq&logoColor=FF6600)
![Docker](https://img.shields.io/badge/Docker-0d1117?style=flat-square&logo=docker&logoColor=2496ED)
![License](https://img.shields.io/badge/License-TBD-0d1117?style=flat-square&labelColor=161b22&color=30363d)

</div>

---

## Introduction

Sutra is an AI-powered automation and productivity platform built around specialized AI agents. Instead of switching between calendars, inboxes, and social media tools, you describe what you want in plain language and Sutra's agents carry out the work. It also includes a general-purpose conversational assistant for everyday questions.

> **Project status:** Sutra has just entered development. All features described here are currently in development. See [Development Status](#development-status) for details.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Status](#development-status)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

### The problem

Routine digital work is fragmented. Scheduling a meeting means checking a calendar, drafting an email, and confirming details across several applications. Publishing a social media post means writing copy, formatting it, and using yet another tool. Each task is small, but the context switching adds up.

### The approach

Sutra treats these tasks as delegable. A user describes an outcome in natural language, and the platform routes the request to a specialized agent that has access to the tools it needs. Each agent focuses on one domain (calendar, email, Instagram), which keeps its behavior scoped and its tool access explicit.

## Features

> All features below are currently **🚧 in development**.
>
> Legend: ✅ Implemented · 🚧 In development · 🗓️ Planned

### 🤖 AI Agent System

- Specialized agents for distinct task domains
- Natural-language task execution
- Agent orchestration and workflow coordination
- Context-aware interactions

### 📅 Calendar and Meeting Automation

- Create and manage calendar events
- Schedule meetings from natural-language instructions
- Assist with meeting arrangements

### 📸 Instagram Automation

- Generate Instagram post content with AI
- Automate publishing workflows
- Delegate social media tasks to an agent

### ✉️ Email Automation

- Compose emails with AI
- Send emails from natural-language instructions
- Automate email-related workflows

### 💬 General AI Chat

- Conversational assistant for general questions
- Entry point to the platform's agent ecosystem

### Feature status

| Feature               |       Status       |
| --------------------- | :----------------: |
| General AI chat       | 🚧 In development  |
| Agent orchestration   | 🚧 In development  |
| Calendar and meetings | 🚧 In development  |
| Email automation      | 🚧 In development  |
| Instagram automation  | 🚧 In development  |

## How It Works

At a high level, Sutra connects four layers:

1. **User interface.** The user sends an instruction through the web client, for example a request to schedule a meeting or draft an email.
2. **Backend.** The API receives the request, manages the conversation, and hands the task to the agent system.
3. **Agents.** Specialized agents, built with LangChain and orchestrated with LangGraph, decide which steps and tools are needed to complete the task.
4. **Tools and external services.** Agents reach external services through tools, which may be exposed via the Model Context Protocol.

### Agent orchestration with LangGraph

LangGraph models agent behavior as a graph of steps and state. A task can move through stages such as interpreting the request, selecting a tool, executing it, and responding, with state carried between steps. This structure allows multi-step workflows to be coordinated and inspected rather than handled as a single opaque prompt.

### Tool access with MCP

The Model Context Protocol provides a standard way for agents to discover and call tools. In Sutra, MCP is intended to be the connection layer between agents and external capabilities such as calendar, email, and Instagram integrations.

### Streaming responses

Server-Sent Events (SSE) stream responses and progress updates from the backend to the client, so users see output as it is produced.

> Specific orchestration flows, graph definitions, and tool contracts will be documented as they are finalized.

## Architecture

The diagram below shows the **conceptual** relationship between components. The system is in early development, so this reflects the intended design and may change. Dashed borders mark components whose exact role is still being defined.

```mermaid
%%{init: {'theme':'dark','themeVariables':{'background':'#0d1117','primaryColor':'#161b22','primaryTextColor':'#e6edf3','primaryBorderColor':'#30363d','lineColor':'#8b949e','clusterBkg':'#0d1117','clusterBorder':'#30363d','edgeLabelBackground':'#0d1117'}}}%%
flowchart TB
    subgraph Client["Frontend"]
        UI["Next.js + Tailwind CSS"]
    end

    subgraph Backend["Backend (NestJS)"]
        API["API Layer"]
        SSE["SSE Streaming"]
        Orchestrator["Agent Orchestration"]
    end

    subgraph Agents["AI Agent System"]
        LC["LangChain"]
        LG["LangGraph"]
        CalAgent["Calendar Agent"]
        MailAgent["Email Agent"]
        IGAgent["Instagram Agent"]
        ChatAgent["General Chat"]
    end

    subgraph Tools["Tool Layer"]
        MCP["MCP Tools and Integrations"]
    end

    subgraph Data["Data and Messaging"]
        Mongo[("MongoDB")]
        Redis[("Redis")]
        MQ{{"RabbitMQ"}}
    end

    subgraph External["External Services"]
        Cal["Calendar"]
        Mail["Email"]
        IG["Instagram"]
        LLM["LLM Provider"]
    end

    UI -->|"Requests"| API
    SSE -->|"Streamed events"| UI
    API --> Orchestrator
    Orchestrator --> LG
    LG --- LC
    LG --> CalAgent
    LG --> MailAgent
    LG --> IGAgent
    LG --> ChatAgent
    CalAgent --> MCP
    MailAgent --> MCP
    IGAgent --> MCP
    MCP --> Cal
    MCP --> Mail
    MCP --> IG
    LC --> LLM
    Orchestrator --> SSE
    API --> Mongo
    API --> Redis
    Orchestrator -.->|"Conceptual"| MQ
    MQ -.->|"Conceptual"| Orchestrator

    classDef frontend fill:#0c2d48,stroke:#58a6ff,color:#e6edf3;
    classDef backend fill:#12262e,stroke:#56d4dd,color:#e6edf3;
    classDef agent fill:#1f1b3a,stroke:#a371f7,color:#e6edf3;
    classDef tool fill:#0f2e24,stroke:#3fb950,color:#e6edf3;
    classDef data fill:#161b22,stroke:#8b949e,color:#e6edf3;
    classDef external fill:#2a1015,stroke:#f85149,color:#e6edf3;
    classDef conceptual stroke-dasharray: 5 5;

    class UI frontend;
    class API,SSE,Orchestrator backend;
    class LC,LG,CalAgent,MailAgent,IGAgent,ChatAgent agent;
    class MCP tool;
    class Mongo,Redis,MQ data;
    class Cal,Mail,IG,LLM external;
    class MQ,Redis conceptual;
```

### Component notes

| Component | Role in Sutra                                                         |
| --------- | --------------------------------------------------------------------- |
| Next.js   | Web client for chat and agent interaction                             |
| NestJS    | Backend API, request handling, and orchestration entry point          |
| LangChain | LLM and tool abstractions used by agents                              |
| LangGraph | Stateful orchestration of multi-step agent workflows                  |
| MCP       | Standard interface between agents and external tools                  |
| MongoDB   | Persistent storage (for example conversations and user data)          |
| Redis     | Caching and short-lived state (exact usage still being defined)       |
| RabbitMQ  | Asynchronous messaging between services (exact usage still being defined) |
| SSE       | One-way streaming of responses and progress to the client             |

## Technology Stack

### Frontend

| Technology   | Purpose                            |
| ------------ | ---------------------------------- |
| Next.js      | React framework for the web client |
| TypeScript   | Type-safe development              |
| Tailwind CSS | Utility-first styling              |

### Backend

| Technology | Purpose                                           |
| ---------- | ------------------------------------------------- |
| NestJS     | Modular server-side framework                     |
| TypeScript | Shared language across the stack                  |
| Nx         | Monorepo tooling, task running, and project graph |

### AI and Agent Architecture

| Technology | Purpose                                                   |
| ---------- | --------------------------------------------------------- |
| LangChain  | LLM integration and tool abstractions                     |
| LangGraph  | Graph-based agent orchestration and state management      |
| MCP        | Standardized connection between agents and external tools |

### Database and Caching

| Technology | Purpose                     |
| ---------- | --------------------------- |
| MongoDB    | Primary document database   |
| Redis      | Caching and ephemeral state |

### Messaging and Real-Time Communication

| Technology | Purpose                                   |
| ---------- | ----------------------------------------- |
| RabbitMQ   | Message broker for asynchronous workloads |
| SSE        | Streaming responses from server to client |

### Infrastructure

| Technology | Purpose                                            |
| ---------- | -------------------------------------------------- |
| Docker     | Containerization and consistent local environments |

## Project Structure

Sutra is organized as an Nx monorepo.

```text
sutra/
├── apps/
│   ├── web/                  # Next.js frontend
│   ├── gateway/              # NestJS API gateway (entry point for client requests)
│   ├── users/                # NestJS users service
│   └── agents/               # NestJS AI agents service (LangChain, LangGraph, MCP)
├── libs/
│   ├── shared/               # Shared types, constants, and utilities
│   ├── db/                   # MongoDB connection, schemas, and repositories
│   ├── redis/                # Redis module and caching utilities
│   └── filters/              # Shared exception filters
├── docker/                   # Docker-related configuration
├── docs/                     # Additional documentation
├── nx.json
├── package.json
└── README.md
```

| Path            | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `apps/web`      | Next.js client for chat and agent interaction                    |
| `apps/gateway`  | Single entry point that receives client requests                 |
| `apps/users`    | User-related functionality                                       |
| `apps/agents`   | AI agent system built with LangChain, LangGraph, and MCP         |
| `libs/shared`   | Code shared across applications                                  |
| `libs/db`       | Database access layer for MongoDB                                |
| `libs/redis`    | Redis integration                                                |
| `libs/filters`  | Common exception filters for the NestJS services                 |

## Getting Started

> Commands below use placeholders where project-specific information is not available. Replace them with the real values from the repository.

### Prerequisites

- Node.js (version: `<required-version>`)
- npm
- Docker and Docker Compose (for local services)
- Access to an LLM provider account (`<provider>`)
- Credentials for any external integrations you plan to use

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<repository-name>.git
cd <repository-name>

# 2. Install dependencies
npm install
```

### Configuration

Environment configuration for Sutra is still being finalized. This section will document the required variables once they are defined. Never commit real credentials or API keys to the repository.

### Start supporting services

MongoDB, Redis, and RabbitMQ can be run locally with Docker. The exact command depends on the project's Docker configuration:

```bash
docker compose up -d   # <adjust to the actual compose file and service names>
```

### Run in development

Nx runs each application by its project name:

```bash
# Backend
npx nx serve <backend-project-name>

# Frontend
npx nx serve <frontend-project-name>   # or: npx nx dev <frontend-project-name>
```

The applications listen on `<backend-port>` and `<frontend-port>`. Check each project's configuration to confirm them.

### Build and test

```bash
npx nx build <project-name>
npx nx test <project-name>
npx nx run-many -t build   # build all projects
```

## Development Status

Sutra has just entered development and is **not yet production-ready**. APIs, data models, and agent behavior will change without notice.

| Area                        |       Status       |
| --------------------------- | :----------------: |
| Core platform (web and API) | 🚧 In development  |
| Agent orchestration         | 🚧 In development  |
| General AI chat             | 🚧 In development  |
| Calendar and meeting agent  | 🚧 In development  |
| Email agent                 | 🚧 In development  |
| Instagram agent             | 🚧 In development  |
| Streaming responses (SSE)   | 🚧 In development  |

## Roadmap

The roadmap is directional and may change as the project evolves.

**Foundation**
- [ ] Stable monorepo setup with shared types and tooling
- [ ] Authentication and user accounts
- [ ] Conversation persistence
- [ ] Documented environment configuration

**Agent platform**
- [ ] Robust LangGraph workflows with state handling and error recovery
- [ ] Standardized MCP tool layer for integrations
- [ ] Human-in-the-loop confirmation before sensitive actions (sending email, publishing posts)
- [ ] Observability for agent runs (logging and tracing)

**Integrations**
- [ ] Calendar and meeting scheduling
- [ ] Email composition and sending
- [ ] Instagram content generation and publishing
- [ ] Additional integrations based on user needs

**Quality and operations**
- [ ] Automated tests across apps and libraries
- [ ] CI pipeline
- [ ] Production-oriented Docker setup
- [ ] Documentation for adding new agents and tools

## Contributing

Contributions are welcome. A typical workflow:

1. **Fork** the repository.
2. **Create a branch** for your change:
   ```bash
   git checkout -b feature/<short-description>
   ```
3. **Make your changes**, following the existing code style and adding tests where appropriate.
4. **Run checks** locally:
   ```bash
   npx nx run-many -t lint test build
   ```
5. **Commit** with a clear message:
   ```bash
   git commit -m "feat: short description of the change"
   ```
6. **Push** your branch and **open a pull request** describing what changed and why.

For significant changes, please open an issue first to discuss the approach. Do not include real credentials, tokens, or personal data in commits or issues.

## License

No license has been selected for this project yet.

<!-- Add a LICENSE file and update this section and the badge at the top once a license is chosen. -->

---

<div align="center">

**Sutra** · Natural-language automation through specialized AI agents

</div>
