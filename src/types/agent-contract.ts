import type {
  CalendarReminder,
  HabitItem,
  ScheduledTask,
} from "./index";

export type AllowedAgentDomain = "reminder" | "task" | "habit";

export type AllowedAgentActionType =
  | "create"
  | "update"
  | "complete"
  | "uncomplete";

export interface AgentExecutedAction {
  id: string;
  domain: AllowedAgentDomain;
  action: AllowedAgentActionType;
  targetId: string;
  title: string;
  summary: string;
  timestamp: string;
}

export interface AgentBlockedAction {
  id: string;
  requestedIntent: string;
  reason: string;
  domain?: string;
  requiresPermission: true;
  timestamp: string;
}

export interface AgentStatus {
  connected: boolean;
  providerName: string;
  modelName: string;
  ollamaAvailable: boolean;
  ollamaModels: string[];
  mode: "ollama-local" | "local-guarded-engine";
  strictSandbox: true;
  allowedActions: string[];
}

export interface AgentConfigPayload {
  ollamaUrl?: string;
  ollamaModel?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  preferredProvider?: "ollama" | "gemini" | "openai" | "local";
}

export interface AgentMessageRequest {
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
  config?: AgentConfigPayload;
}

export interface AgentMessageResponse {
  id: string;
  transcript: string;
  reply: string;
  provider: string;
  model: string;
  executedActions: AgentExecutedAction[];
  blockedActions: AgentBlockedAction[];
  state: {
    tasks: ScheduledTask[];
    habits: HabitItem[];
    reminders: CalendarReminder[];
  };
}

