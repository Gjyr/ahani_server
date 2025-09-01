import https from "node:https";
import http from "node:http";
import app from "#app";
import { appendFile } from "node:fs";
import { PORT, SSL, LOG_FILE_PATH, LOCAL_ADDRESS } from "#config";

// process.loadEnvFile("./ahani.env");

const server =
  process.env.NODE_ENV === "development"
    ? http.createServer(app)
    : https.createServer(SSL, app);

// server.on("connection", (socket) => {
//   console.log(socket.remoteAddress);
//   appendFile(
//     LOG_FILE_PATH,
//     `Adress: ${socket.remoteAddress}, date: ${new Date().toString()}\n`,
//     (err) => {
//       if (err) {
//         console.error("Something happened: ", err);
//         return;
//       }
//     }
//   );
// });

server.listen(
  process.env.PORT || PORT,
  process.env.LOCAL_ADDRESS || LOCAL_ADDRESS,
  () => {
    console.log("listening");
  }
);
