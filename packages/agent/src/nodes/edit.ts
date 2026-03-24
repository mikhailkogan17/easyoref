/**
 * Edit Node — Telegram message editing with enriched data.
 */

import {
  EnrichmentDataSchema,
} from "@easyoref/shared";
import { editMessage } from "./message.js";
import type { AgentStateType } from "../graph.js";

export const editNode = async (
  state: AgentStateType,
): Promise<Partial<AgentStateType>> => {
  await editMessage({
    alertId: state.alertId,
    alertTs: state.alertTs,
    alertType: state.alertType,
    chatId: state.chatId,
    messageId: state.messageId,
    isCaption: state.isCaption,
    telegramMessages: state.telegramMessages,
    currentText: state.currentText,
    votedResult: state.votedResult,
    previousEnrichment:
      state.previousEnrichment ?? EnrichmentDataSchema.parse({}),
    monitoringLabel: state.monitoringLabel,
  });
  return {};
};
