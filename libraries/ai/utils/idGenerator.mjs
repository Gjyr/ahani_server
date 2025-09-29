import { randomUUID } from "node:crypto";

export const generateMessageId = () => randomUUID();

export const generateChatId = () =>
  `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const generateShortId = () => randomUUID().substring(0, 8);
