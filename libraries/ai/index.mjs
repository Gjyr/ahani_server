// main entry point
// import { params, validateConfig } from "./config/deepseek.mjs";
import { params, validateConfig } from "./config/xai.mjs";
import { handleRegularResponse } from "./handlers/regular.mjs";
import { handleStreamingResponse } from "./handlers/streaming.mjs";
import {
  readChatHistory,
  writeChatHistory,
  listChatHistories,
} from "./utils/chatHistory.mjs";
import { generateMessageId, generateChatId } from "./utils/idGenerator.mjs";

validateConfig();

async function processChatMessage(chatFile, message, parameters, res = null) {
  const { CHAT_HISTORY_DIR, NET_CONFIG, DS_PARAMETERS } = params;
  // const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiKey = process.env.XAI_API_KEY;

  const finalParams = { ...DS_PARAMETERS, ...parameters };

  if (res) {
    return await handleStreamingResponse(
      {
        body: { message, parameters: finalParams },
      },
      res,
      CHAT_HISTORY_DIR,
      chatFile,
      message,
      finalParams,
      apiKey,
    );
  } else {
    return await handleRegularResponse(
      {
        body: { message, parameters: finalParams },
      },
      {
        json: (data) => data,
      },
      CHAT_HISTORY_DIR,
      chatFile,
      message,
      finalParams,
      apiKey,
    );
  }
}

export {
  params,
  handleRegularResponse,
  handleStreamingResponse,
  readChatHistory,
  writeChatHistory,
  listChatHistories,
  generateMessageId,
  generateChatId,
  processChatMessage,
};
