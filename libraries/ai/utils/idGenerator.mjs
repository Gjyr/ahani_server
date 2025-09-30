import { randomUUID } from "node:crypto";

const generateMessageId = () => randomUUID();

const generateChatId = () =>
  `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const generateShortId = () => randomUUID().substring(0, 8);

export { generateMessageId, generateChatId, generateShortId };
