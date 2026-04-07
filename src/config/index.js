import dotenv from "dotenv";
dotenv.config();

// Professional tip: Throw an error if essential keys are missing
const requiredEnvs = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "MONGODB_URI",
  "GOOGLE_CLIENT_ID",
];
requiredEnvs.forEach((name) => {
  if (!process.env[name]) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
});

export const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: "15m",
    refreshExpiry: "7d",
  },
};
