import "./src/config/index.js";

import express from "express";
import connectDB from "./src/config/db.js";
<<<<<<< HEAD
import app from "./src/app.js";

connectDB();


=======
import app from "./src/app.js";  // ← Import configured app

connectDB();

>>>>>>> 2a74de51a17885c086cb5c0ebad068bf0cbf21f3
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Pulsify Backend is running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server");
});
