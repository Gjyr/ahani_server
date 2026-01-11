import { fork } from "node:child_process";
import path from "node:path";
import { SERVER_PATH } from "#config";

console.log(`[${new Date().toISOString()}] Starting application watcher...`);

function startApp() {
  const child = fork(path.join(SERVER_PATH, "server.mjs"));

  child.on("exit", (code, signal) => {
    console.error(
      `[${new Date().toISOString()}] App crashed! Code: ${code}, Signal: ${signal}`
    );
    console.log(`[${new Date().toISOString()}] Restarting in 2 seconds...`);

    setTimeout(startApp, 2000);
  });
}

startApp();
