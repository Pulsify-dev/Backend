import mm from "music-metadata";
import { BadRequestError } from "../utils/errors.js";

const extractAudioMetadata = async (audioBuffer) => {
  try {
    const metadata = await mm.parseBuffer(audioBuffer);
    return {
      format: metadata.format.container || "unknown",
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || 0,
    };
  } catch (error) {
    throw new BadRequestError("Failed to extract audio metadata.");
  }
};

export default {
  extractAudioMetadata,
};
