"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAgentStatus, sendAgentCommand } from "@/lib/agent-client";
import type { ConversationMessage, DemoPromptPreset } from "../types";
import type { MascotState } from "@/features/mascot/types";
import type {
  AgentConfigPayload,
  AgentMessageResponse,
  AgentStatus,
} from "@/types/agent-contract";
import type {
  CalendarReminder,
  HabitItem,
  ScheduledTask,
} from "@/types";

export const DEMO_PROMPTS: DemoPromptPreset[] = [];

interface UseConversationOptions {
  onMascotStateChange?: (state: MascotState) => void;
  agentConfig?: AgentConfigPayload;
  currentState: {
    tasks: ScheduledTask[];
    habits: HabitItem[];
    reminders: CalendarReminder[];
  };
  onAgentStateSync?: (nextState: {
    tasks: ScheduledTask[];
    habits: HabitItem[];
    reminders: CalendarReminder[];
  }) => void;
}

export function useConversation({
  onMascotStateChange,
  agentConfig,
  currentState,
  onAgentStateSync,
}: UseConversationOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isSimulatingReply, setIsSimulatingReply] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    connected: true,
    providerName: "Moo Guard Engine",
    modelName: "moo-local-guard-v1",
    ollamaAvailable: false,
    ollamaModels: [],
    mode: "local-guarded-engine",
    strictSandbox: true,
    allowedActions: [
      "create_reminder",
      "update_reminder",
      "complete_reminder",
      "create_task",
      "update_task",
      "complete_task",
      "create_habit",
      "update_habit",
      "complete_habit",
    ],
  });

  const refreshAgentStatus = useCallback(async () => {
    const status = await fetchAgentStatus(agentConfig);
    setAgentStatus(status);
  }, [agentConfig]);

  useEffect(() => {
    refreshAgentStatus();
  }, [refreshAgentStatus]);

  const sendUserMessage = useCallback(
    async (
      rawText: string,
      options?: {
        isVoice?: boolean;
        audioBase64?: string;
        audioMimeType?: string;
      }
    ): Promise<AgentMessageResponse | null> => {
      const text = rawText.trim();
      if ((!text && !options?.audioBase64) || isSimulatingReply) return null;

      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const userMsg: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text || "🎤 Audio enviado...",
        timestamp: now,
        isVoice: Boolean(options?.isVoice),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsSimulatingReply(true);
      onMascotStateChange?.("thinking");

      try {
        const res = await sendAgentCommand(
          {
            text,
            audioBase64: options?.audioBase64,
            audioMimeType: options?.audioMimeType,
            config: agentConfig,
          },
          currentState
        );

        // Si el backend transcribió el audio, actualizar el mensaje del usuario
        if (!text && res.transcript) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsg.id ? { ...m, content: res.transcript } : m
            )
          );
        }

        if (res.state) {
          onAgentStateSync?.(res.state);
        }

        const hasBlocked = res.blockedActions && res.blockedActions.length > 0;
        const hasExecuted =
          res.executedActions && res.executedActions.length > 0;

        if (hasBlocked && !hasExecuted) {
          onMascotStateChange?.("surprised");
        } else if (hasExecuted) {
          onMascotStateChange?.("wink");
        } else {
          onMascotStateChange?.("smile");
        }

        const replyMsg: ConversationMessage = {
          id: res.id || `moo-${Date.now()}`,
          role: "moo",
          content: res.reply,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          provider: res.provider,
          model: res.model,
          executedActions: res.executedActions,
          blockedActions: res.blockedActions,
        };

        setMessages((prev) => [...prev, replyMsg]);
        return res;
      } finally {
        setIsSimulatingReply(false);
        setTimeout(() => {
          onMascotStateChange?.("idle");
        }, 2100);
      }
    },
    [
      isSimulatingReply,
      onMascotStateChange,
      agentConfig,
      currentState,
      onAgentStateSync,
    ]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    onMascotStateChange?.("idle");
  }, [onMascotStateChange]);

  return {
    messages,
    isSimulatingReply,
    agentStatus,
    refreshAgentStatus,
    sendUserMessage,
    clearMessages,
  };
}
