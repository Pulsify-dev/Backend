import "./src/config/index.js";

import express from "express";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";

connectDB();


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Pulsify Backend is running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server");
});
