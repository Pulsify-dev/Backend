import { Queue } from "bullmq";
import redisClient from "../config/redis.js";

let audioQueue = null;

if (redisClient) {
  audioQueue = new Queue("audioProcessing", {
    connection: redisClient,
  });
  console.log("⚡ Audio Queue initialized.");
} else {
  console.warn("[Jobs] Redis not available. Audio queue is disabled.");
}

const addAudioJob = async (trackId, userId) => {
  if (!audioQueue) {
    throw new Error("Audio queue is disabled because Redis is unavailable.");
  }
  
  await audioQueue.add("processAudio", {
    trackId: trackId.toString(),
    userId: userId.toString(),
  }, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
  });
};

const audioQueueService = { addAudioJob };
export default audioQueueService;
