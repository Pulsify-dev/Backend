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
    accessExpiry: "1h",
    refreshExpiry: "7d",
  },
  defaults: {
    trackArtwork: process.env.DEFAULT_TRACK_ARTWORK || "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/Default.png",
    albumArtwork: process.env.DEFAULT_ALBUM_ARTWORK || "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/Default.png",
    userAvatar: process.env.DEFAULT_USER_AVATAR || "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/Default.png",
    userCover: process.env.DEFAULT_USER_COVER || "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/Default.png",
  }
};
