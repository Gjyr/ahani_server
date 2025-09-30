import { Transform } from "node:stream";
import { writeChatHistory } from "../utils/chatHistory.mjs";

class HistoryUpdater extends Transform {
  constructor(chatHistoryDir, chatFile, options = {}) {
    super({ ...options, objectMode: true });
    this.chatHistoryDir = chatHistoryDir;
    this.chatFile = chatFile;
  }

  async _transform(chatHistory, encoding, callback) {
    try {
      const updatedHistory = await writeChatHistory(
        this.chatHistoryDir,
        this.chatFile,
        chatHistory
      );

      this.push(updatedHistory);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

export { HistoryUpdater };
