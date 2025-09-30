import {
  readFile,
  writeFile,
  access,
  constants,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { ChatHistoryError, ValidationError } from "../errors/ChatError.mjs";
import { generateChatId } from "./idGenerator.mjs";
import { SERVER_PATH } from "../../../app/config/config.mjs";

async function readChatHistory(chatHistoryDir, chatFile) {
  const filename = join(SERVER_PATH, chatHistoryDir, chatFile);

  try {
    await access(filename, constants.F_OK);

    const data = await readFile(filename, "utf8");
    const chatHistory = JSON.parse(data);

    if (!chatHistory.messages || !Array.isArray(chatHistory.messages)) {
      throw new ChatHistoryError(
        "Invalid chat history structure",
        chatFile,
        "read"
      );
    }

    return chatHistory;
  } catch (error) {
    if (error.code === "ENOENT") {
      // TODO: should create new if doesn't exist?
      return {
        id: generateChatId?.(),
        name: chatFile.replace(".json", ""),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    throw new ChatHistoryError(
      `Failed to read chat history: ${error.message}`,
      chatFile,
      "read",
      error
    );
  }
}

async function writeChatHistory(chatHistoryDir, chatFile, data) {
  const filename = join(SERVER_PATH, chatHistoryDir, chatFile);

  try {
    data.updatedAt = new Date().toISOString();

    await writeFile(filename, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    throw new ChatHistoryError(
      `Failed to write chat history: ${error.message}`,
      chatFile,
      "write",
      error
    );
  }
}

async function listChatHistories(chatHistoryDir) {
  try {
    const files = await readdir(chatHistoryDir);
    return files.filter((file) => file.endsWith(".json"));
  } catch (error) {
    throw new ChatHistoryError(
      `Failed to list chat histories: ${error.message}`,
      chatHistoryDir,
      "list",
      error
    );
  }
}

export { readChatHistory, writeChatHistory, listChatHistories };
