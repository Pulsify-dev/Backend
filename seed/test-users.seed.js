import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import User from "../src/models/user.model.js";
import Subscription from "../src/models/subscription.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const URL = process.env.MONGODB_URI;

if (!URL) {
  console.error("Missing MONGODB_URI in environment.");
  process.exit(1);
}

import bcrypt from "bcryptjs";

const seedUsers = async () => {
  try {
    await mongoose.connect(URL);
    console.log("Connected to MongoDB for test users seed.");

    const randomSuffix = Math.floor(Math.random() * 10000);
    const freeEmail = `free${randomSuffix}@example.com`;
    const proEmail = `pro${randomSuffix}@example.com`;
    const password = "Password123!";
    const hashedPassword = await bcrypt.hash(password, 12);

    const baseFields = {
      bio: "",
      role: "User",
      is_private: false,
      is_verified: true,
      is_suspended: false,
      avatar_url: "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/users/avatars/1775671401954_Screenshot 2026-04-07 161754.png",
      cover_url: "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/users/covers/1775951591338_CldPrmpt.jfif",
      favorite_genres: [],
      social_links: {
        instagram: "",
        x: "",
        facebook: "",
        website: ""
      },
      device_tokens: [
        "fcm_device_token_string_here"
      ],
      followers_count: 1,
      following_count: 0,
      track_count: 0,
      playlist_count: 0,
      upload_duration_used_seconds: 0,
      storage_used_bytes: 0,
      email_verification_token: null,
      email_verification_expires: null,
      password_reset_token: null,
      password_reset_expires: null,
      refresh_token: null,
      pending_email: null,
      pending_email_token: null,
      pending_email_expires: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create Free User
    const freeUserObj = {
      ...baseFields,
      _id: new mongoose.Types.ObjectId(),
      email: freeEmail,
      username: `free_user_${randomSuffix}`,
      password: hashedPassword,
      display_name: "Test Free User",
      tier: "Free",
    };

    // Create Artist Pro User
    const proUserObj = {
      ...baseFields,
      _id: new mongoose.Types.ObjectId(),
      email: proEmail,
      username: `pro_user_${randomSuffix}`,
      password: hashedPassword,
      display_name: "Test Pro User",
      tier: "Artist Pro",
    };

    await User.collection.insertMany([freeUserObj, proUserObj]);

    await Subscription.create({
      user_id: freeUserObj._id,
      plan: "Free",
      status: "Cancelled",
    });

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    await Subscription.create({
      user_id: proUserObj._id,
      plan: "Artist Pro",
      status: "Active",
      current_period_start: new Date(),
      current_period_end: oneMonthFromNow,
    });

    console.log("\n✅ Test users created successfully!\n");
    console.log("=== Free User Credentials ===");
    console.log(`Email:    ${freeEmail}`);
    console.log(`Password: ${password}\n`);
    
    console.log("=== Artist Pro User Credentials ===");
    console.log(`Email:    ${proEmail}`);
    console.log(`Password: ${password}\n`);

    process.exit(0);
  } catch (error) {
    console.error("Test users seed failed:", error);
    process.exit(1);
  }
};

seedUsers();
