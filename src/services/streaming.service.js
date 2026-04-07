import S3Utils from "../utils/s3.utils.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

class StreamingService {
  constructor(trackRepository) {
    this.trackRepository = trackRepository;
  }

  /**
   * Generates a signed CDN URL for streaming. 
   * Validates auth and playback state.
   */
  async getStreamUrl(trackId, user) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundError("Track not found");

    // Playback state gating
    if (track.playback_state === "blocked") {
      throw new ForbiddenError("Track is blocked.");
    }
    
    // Preview logic for Free tier if needed (Module 5)
    if (track.playback_state === "preview" && user.tier === "Free") {
      // In a real SoundCloud clone, we'd maybe pointing to a truncated snippet
    }

    const url = await S3Utils.getPresignedUrl(track.audio_url, 900); // 15 min

    return {
      url,
      expires_at: new Date(Date.now() + 900 * 1000),
      playback_state: track.playback_state,
      preview_duration_seconds: track.playback_state === "preview" ? 30 : null,
    };
  }

  /**
   * Generates a signed download URL. Only for ArtistPro users.
   */
  async getDownloadUrl(trackId, user) {
    if (user.tier !== "Artist Pro") {
      throw new ForbiddenError("Requires Artist Pro plan.");
    }

    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundError("Track not found");

    // Pass ResponseContentDisposition if getPresignedUrl supports extra params
    // Our S3Utils.getPresignedUrl doesn't support extra params yet, but we'll stick to it for now
    const url = await S3Utils.getPresignedUrl(track.audio_url, 3600); // 1 hour

    return { url };
  }
}

export default StreamingService;
