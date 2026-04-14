import feedRepository from "../repositories/feed.repository.js";
import userRepository from "../repositories/user.repository.js";
import trackRepository from "../repositories/track.repository.js";
// import playlistRepository from "../repositories/playlist.repository.js"; // TODO: Uncomment when playlist module is implemented
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";


//  Personal Feed  —  GET /feed
/*
  Returns a chronological feed of tracks and reposts from artists that
  the authenticated user follows.
  An empty feed (no follows yet) is perfectly valid — returns an empty list.
 */
const getPersonalFeed = async (userId, page = 1, limit = 20) => {
    if (page < 1 || limit < 1 || limit > 100) {
        throw new BadRequestError("Invalid page or limit parameters.");
    }

    return feedRepository.getPersonalFeed(userId, page, limit);
};

//  User Profile Feed  —  GET /users/:user_id/feed

/*
  Returns the public activity feed for a specific user:
  their uploaded tracks + their reposts, merged chronologically.
  Throws 404 for private or suspended profiles.
 */
const getUserProfileFeed = async (userId, page = 1, limit = 20) => {
    if (page < 1 || limit < 1 || limit > 100) {
        throw new BadRequestError("Invalid page or limit parameters.");
    }
    // Validate the target user exists and is publicly accessible
    const user = await userRepository.findById(userId);
    if (!user || user.is_suspended || user.is_private) {
        throw new NotFoundError("User not found or profile is private.");
    }
    return feedRepository.getUserProfileFeed(userId, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Resource Resolver  —  GET /resolve
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a canonical URL or permalink path into the underlying database resource.
 * Supports /username, /username/track-permalink, and /username/sets/playlist-permalink.
 */
const resolveUrl = async (urlStr) => {
    if (!urlStr) throw new BadRequestError("URL is required.");

    let parsedPath = "";
    try {
        if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
            const parsedUrl = new URL(urlStr);
            parsedPath = parsedUrl.pathname;
        } else {
            parsedPath = urlStr.startsWith("/") ? urlStr : `/${urlStr}`;
        }
    } catch (e) {
        throw new BadRequestError("Malformed URL provided.");
    }

    const parts = parsedPath.split("/").filter(p => p.length > 0);

    if (parts.length === 0) {
        throw new BadRequestError("URL path cannot be empty.");
    }

    const username = parts[0];
    const user = await userRepository.findByUsername(username);

    if (!user) {
        throw new NotFoundError("Resource not found. User does not exist.");
    }

    // Profile URL (e.g. /the_weeknd)
    if (parts.length === 1) {
        return { type: "user", data: user };
    }

    /* TODO: Uncomment when playlist module is implemented
    // Playlist URL (e.g. /the_weeknd/sets/my-playlist)
    if (parts.length === 3 && parts[1] === "sets") {
        const playlistPermalink = parts[2];
        const playlist = await playlistRepository.findByPermalinkAndCreator(playlistPermalink, user._id);
        if (!playlist) {
            throw new NotFoundError("Resource not found. Playlist does not exist.");
        }
        return { type: "playlist", data: playlist };
    }
    */

    // Track URL (e.g. /the_weeknd/blinding-lights)
    if (parts.length === 2) {
        const trackPermalink = parts[1];
        const track = await trackRepository.findByPermalinkAndArtist(trackPermalink, user._id).populate("artist_id", "username display_name avatar_url is_verified");
        if (!track) {
            throw new NotFoundError("Resource not found. Track does not exist.");
        }
        // Protect private tracks
        if (track.is_hidden || track.status !== "finished") {
             throw new NotFoundError("Resource not found. Track unavailable.");
        }
        
        return { type: "track", data: track };
    }

    throw new NotFoundError("Resource not found or unsupported URL format.");
};

export default {
    getPersonalFeed,
    getUserProfileFeed,
    resolveUrl,
};