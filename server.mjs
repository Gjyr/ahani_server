import https from "node:https";
import http from "node:http";
import app from "#app";
import { PORT, SSL, LOCAL_ADDRESS } from "#config";

// process.loadEnvFile("./ahani.env");

const server =
  process.env.NODE_ENV === "development"
    ? http.createServer(app)
    : https.createServer(SSL, app);

server.listen(
  process.env.PORT || PORT,
  process.env.LOCAL_ADDRESS || LOCAL_ADDRESS,
  () => {
    console.log("listening");
  }
);
