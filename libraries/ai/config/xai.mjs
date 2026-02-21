import { MIME_TYPES } from "../../../app/config/config.mjs";

const params = Object.freeze({
  CHAT_HISTORY_DIR: "/logs/chats/",
  DEFAULT_CHAT: "grok.json",

  NET_CONFIG: Object.freeze({
    hostname: "api.x.ai",
    path: "/v1/chat/completions",
    port: 443,
    method: "POST",
    headers: {
      "Content-Type": MIME_TYPES["json"],
      Accept: MIME_TYPES["json"],
      "User-Agent": "Ahani/1.0",
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    timeout: 30000,
  }),

  DS_ROLE: "user",
  DS_PARAMETERS: Object.seal({
    model: "grok-4-1-fast-reasoning",
    temperature: 1.5,
    max_tokens: 8192,
    stream: true,
  }),
});

function validateConfig() {
  if (!process.env.XAI_API_KEY)
    throw new Error("Sending messages with the API Token set.");
}

export { params, validateConfig };
