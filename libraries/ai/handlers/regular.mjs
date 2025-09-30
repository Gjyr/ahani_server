import { handleStreamingResponse } from "./streaming.mjs";
import { readChatHistory } from "../utils/chatHistory.mjs";

// TODO: refactor that crap
async function handleRegularResponse(
  req,
  res,
  chatHistoryDir,
  chatFile,
  message,
  parameters,
  apiKey
) {
  try {
    console.info("====== REGULAR ======");
    let fullResponse = "";
    let resolved = false;

    const mockRes = {
      write: (chunk) => {
        if (chunk.startsWith("data: ")) {
          try {
            const data = JSON.parse(chunk.slice(6));
            if (data.content) fullResponse += data.content;
          } catch (e) {
            // ignore for non-JSON chunks
          }
        }
        return true;
      },
      end: () => {
        resolved = true;
      },
      writableEnded: false,
      writeHead: () => {},
    };

    await handleStreamingResponse(
      req,
      mockRes,
      chatHistoryDir,
      chatFile,
      message,
      parameters,
      apiKey
    );

    const startTime = Date.now();
    while (!resolved && Date.now() - startTime < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const finalHistory = await readChatHistory(chatHistoryDir, chatFile);
    const lastMessage = finalHistory.messages.at(-1);

    res.write(
      JSON.stringify({
        success: true,
        response: lastMessage.content,
        history: finalHistory,
      })
    );
    res.end();
  } catch (error) {
    console.error("Regular response error: ", error);
    res.writeHead(500);
    res.write(
      JSON.stringify({
        success: false,
        error: error.message,
      })
    );
  }
}

export { handleRegularResponse };
