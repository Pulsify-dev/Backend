import feedRepository from "../repositories/feed.repository.js";
import userRepository from "../repositories/user.repository.js";
import trackRepository from "../repositories/track.repository.js";
import playlistRepository from "../repositories/playlist.repository.js";
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";
import cache from "../utils/cache.utils.js";

// Cache TTLs (in seconds)
const TRENDING_TTL = 60 * 60; // 60 minutes — matches cron interval
const CHARTS_TTL   = 60 * 60; // 60 minutes


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

    // Playlist URL (e.g. /the_weeknd/sets/my-playlist)
    if (parts.length === 3 && parts[1] === "sets") {
        const playlistPermalink = parts[2];
        const playlist = await playlistRepository.findByPermalinkAndCreator(playlistPermalink, user._id);
        if (!playlist) {
            throw new NotFoundError("Resource not found. Playlist does not exist.");
        }
        return { type: "playlist", data: playlist };
    }

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

// ─────────────────────────────────────────────────────────────────────────────
//  Guest Feed  —  GET /feed (no auth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a discovery feed for unauthenticated visitors.
 * Mixes trending tracks with recent public uploads so the platform
 * feels alive on first visit — similar to SoundCloud's guest experience.
 */
const getGuestFeed = async (page = 1, limit = 20) => {
    if (page < 1 || limit < 1 || limit > 100) {
        throw new BadRequestError("Invalid page or limit parameters.");
    }

    const cacheKey = `guest-feed:p${page}:l${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Fetch trending tracks (the main attraction for guests)
    const trending = await trackRepository.findTrending(page, limit);

    const result = {
        type: "discovery",
        items: trending.tracks.map((track) => ({
            type: "track",
            created_at: track.createdAt,
            track,
        })),
        total: trending.total,
        page,
        limit,
    };

    await cache.set(cacheKey, result, TRENDING_TTL);
    return result;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Trending  —  GET /trending
// ─────────────────────────────────────────────────────────────────────────────

const getTrending = async (page = 1, limit = 20, genre = null) => {
    if (page < 1 || limit < 1 || limit > 100) {
        throw new BadRequestError("Invalid page or limit parameters.");
    }

    const cacheKey = `trending:p${page}:l${limit}:g${genre || "all"}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await trackRepository.findTrending(page, limit, genre);
    await cache.set(cacheKey, result, TRENDING_TTL);
    return result;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Charts  —  GET /charts
// ─────────────────────────────────────────────────────────────────────────────

const getCharts = async (limit = 50, genre = null) => {
    if (limit < 1 || limit > 100) {
        throw new BadRequestError("Invalid limit parameter.");
    }

    const cacheKey = `charts:l${limit}:g${genre || "all"}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const tracks = await trackRepository.findCharts(limit, genre);

    // Inject rank position
    const ranked = tracks.map((track, index) => ({
        rank: index + 1,
        ...track,
    }));

    const result = { tracks: ranked, total: ranked.length };
    await cache.set(cacheKey, result, CHARTS_TTL);
    return result;
};

export default {
    getPersonalFeed,
    getUserProfileFeed,
    getGuestFeed,
    resolveUrl,
    getTrending,
    getCharts,
};