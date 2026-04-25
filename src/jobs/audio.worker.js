import { Worker } from "bullmq";
import redisClient from "../config/redis.js";
import trackRepository from "../repositories/track.repository.js";
import s3Utils from "../utils/s3.utils.js";
import audioUtils from "../utils/audio.utils.js";
import { getSocketServer } from "../sockets/index.js";

let audioWorker = null;

if (redisClient) {
  audioWorker = new Worker("audioProcessing", async (job) => {
    const { trackId, userId } = job.data;
    console.log(`[Worker] Started processing track: ${trackId}`);

    try {
      // 1. Fetch track from MongoDB
      const track = await trackRepository.findById(trackId);
      if (!track) {
        throw new Error(`Track ${trackId} not found in database.`);
      }

      if (track.status === "finished") {
        console.log(`[Worker] Track ${trackId} is already finished. Skipping.`);
        return { success: true, trackId };
      }

      // 2. Download audio from S3 to a buffer
      console.log(`[Worker] Downloading track ${trackId} from S3...`);
      const audioBuffer = await s3Utils.downloadFromS3(track.audio_url);

      // 3. Run extractWaveform
      console.log(`[Worker] Extracting waveform for track ${trackId}...`);
      const waveform = await audioUtils.extractWaveform(audioBuffer);

      // 4. Update track in MongoDB
      console.log(`[Worker] Saving finished track ${trackId}...`);
      const updatedTrack = await trackRepository.updateTrackById(trackId, {
        status: "finished",
        waveform: waveform,
      });

      console.log(`[Worker] Finished processing track: ${trackId}`);

      // 5. Emit WebSocket event
      const io = getSocketServer();
      if (io) {
        io.to(`user_${userId}`).emit("track:ready", updatedTrack);
        console.log(`[Worker] Emitted track:ready to user_${userId}`);
      }

      return { success: true, trackId };
    } catch (error) {
      console.error(`[Worker] Failed to process track ${trackId}:`, error);
      
      // Update track status to failed if we've exhausted retries
      if (job.attemptsMade >= job.opts.attempts - 1) {
        await trackRepository.updateTrackById(trackId, {
          status: "failed",
        });
        
        const io = getSocketServer();
        if (io) {
          io.to(`user_${userId}`).emit("track:failed", {
            track_id: trackId,
            error: "Failed to process audio file."
          });
        }
      }
      throw error; // Re-throw to trigger BullMQ retry
    }
  }, {
    connection: redisClient,
    concurrency: 2, // Process max 2 tracks simultaneously
  });

  audioWorker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  audioWorker.on('failed', (job, err) => {
    console.warn(`[Worker] Job ${job.id} failed:`, err.message);
  });
  
  console.log("👷 Audio Worker initialized.");
}

export default audioWorker;
