import type {
  AgentBlockedAction,
  AgentExecutedAction,
} from "@/types/agent-contract";

export type MessageRole = "moo" | "user" | "system-demo";

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isVoice?: boolean;
  provider?: string;
  model?: string;
  executedActions?: AgentExecutedAction[];
  blockedActions?: AgentBlockedAction[];
  isDemoResponse?: boolean;
  demoTag?: string;
}

export interface DemoPromptPreset {
  id: string;
  label: string;
  prompt: string;
  response: string;
  tag: string;
}

