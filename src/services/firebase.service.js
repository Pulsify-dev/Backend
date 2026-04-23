import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

class FirebaseService {
  constructor() {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const serviceAccountPath = join(
        __dirname,
        "../config/firebase-service-account.json",
      );

      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, "utf8"),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.isInitialized = true;
      console.log("[Firebase] Admin SDK initialized successfully.");
    } catch (error) {
      console.warn(
        "[Firebase] SDK not initialized. Running in Mock Mode.",
        error.message,
      );
      this.isInitialized = false;
    }
  }

  async sendPushNotification(deviceTokens, payload) {
    if (!deviceTokens || deviceTokens.length === 0) return;

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      tokens: deviceTokens,
    };

    try {
      if (this.isInitialized) {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(
          `[FCM] Successfully sent ${response.successCount} messages.`,
        );
      } else {
        console.log(
          `[FCM-MOCK] Push Notification mock sent to ${deviceTokens.length} devices.`,
        );
      }
      return true;
    } catch (error) {
      console.error("[FCM] Error sending push notification:", error);
      return false;
    }
  }
}

export default new FirebaseService();
