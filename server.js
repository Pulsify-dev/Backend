import "./src/config/index.js";

import http from "http";
import connectDB from "./src/config/db.js";

import app from "./src/app.js"; // ← Import configured app
import { initializeSocketServer } from "./src/sockets/index.js";

connectDB();

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
const io = initializeSocketServer(httpServer);

app.set("io", io);
httpServer.listen(PORT, () => {
  console.log(`🚀 Pulsify Backend is running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server");
});
