import https from "node:https";
import http from "node:http";
import app from "#app";
import { PORT, SSL, LOCAL_ADDRESS } from "#config";
import { logServerEvent } from "#logger";

const server =
  process.env.NODE_ENV === "development"
    ? http.createServer(app)
    : https.createServer(SSL, app);

server.listen(
  process.env.PORT || PORT,
  process.env.LOCAL_ADDRESS || LOCAL_ADDRESS,
  () => {
    console.log("Listening");
  }
);

function handleShutdown() {
  console.log("Starting graceful shutdown...");

  server.close((err) => {
    if (err) {
      console.error("Error during server close:", err);
      process.exit(1);
    }

    console.log("Server closed. Exiting process.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

process.on("uncaughtException", (error, origin) => {
  logServerEvent(error.message, origin);

  console.error("FATAL - Uncaught Exception:", error);
  console.error("Exception origin:", origin);

  handleShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  logServerEvent(error.message, origin);

  console.error(
    "FATAL - Unhandled Promise Rejection at:",
    promise,
    "reason:",
    reason
  );
});
