import Track from "../models/track.model.js";
import Repost from "../models/repost.model.js";
import Follow from "../models/follow.model.js";

/*
fields we expose for a track inside feed items.
waveform is excluded (select:false on model already) — no need to add it here.
 */
const TRACK_SELECT =
    "_id title permalink genre tags artwork_url duration play_count like_count repost_count comment_count visibility status playback_state artist_id createdAt";

const ARTIST_SELECT = "username display_name avatar_url is_verified";

/**
 * Shape a Track document into a feed item.
 */
const toTrackFeedItem = (track) => ({
    type: "track",
    created_at: track.createdAt,
    track: {
        _id: track._id,
        title: track.title,
        permalink: track.permalink,
        genre: track.genre,
        tags: track.tags,
        artwork_url: track.artwork_url,
        duration: track.duration,
        play_count: track.play_count,
        like_count: track.like_count,
        repost_count: track.repost_count,
        comment_count: track.comment_count,
        playback_state: track.playback_state,
    },
    artist: track.artist_id, // already populated
});

/**
 * Shape a Repost document into a feed item.
 * Reposts whose track was hidden / not matched are filtered before this runs.
 */
const toRepostFeedItem = (repost) => ({
    type: "repost",
    created_at: repost.createdAt,
    track: {
        _id: repost.track_id._id,
        title: repost.track_id.title,
        permalink: repost.track_id.permalink,
        genre: repost.track_id.genre,
        tags: repost.track_id.tags,
        artwork_url: repost.track_id.artwork_url,
        duration: repost.track_id.duration,
        play_count: repost.track_id.play_count,
        like_count: repost.track_id.like_count,
        repost_count: repost.track_id.repost_count,
        comment_count: repost.track_id.comment_count,
        playback_state: repost.track_id.playback_state,
    },
    artist: repost.track_id.artist_id, // original track artist
    reposted_by: repost.user_id,        // who reposted it
});

//visbility filter
const VISIBLE_TRACK_FILTER = {
    visibility: "public",
    is_hidden: false,
    status: "finished",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Personal feed  (GET /feed)
//  Shows tracks uploaded and reposts made by artists the viewer follows.
// ─────────────────────────────────────────────────────────────────────────────


//returns the IDs of everyone a user is following.
const getFollowingIds = async (userId) => {
    const rows = await Follow.find({ follower_id: userId })
        .select("following_id")
        .lean();
    return rows.map((r) => r.following_id);
};

const getPersonalFeed = async (userId, page = 1, limit = 20) => {
    const followingIds = await getFollowingIds(userId);

    if (followingIds.length === 0) {
        return { items: [], total: 0, page, limit };
    }

    const fetchCap = (page - 1) * limit + limit; //items needed from each source

    const [tracks, reposts] = await Promise.all([
        //tracks uploaded by followed artists 
        Track.find({
            artist_id: { $in: followingIds },
            ...VISIBLE_TRACK_FILTER,
        })
            .select(TRACK_SELECT)
            .populate("artist_id", ARTIST_SELECT)
            .sort({ createdAt: -1 })
            .limit(fetchCap)
            .lean(),

        //reposts made by followed artists
        Repost.find({ user_id: { $in: followingIds } })
            .populate("user_id", ARTIST_SELECT)
            .populate({
                path: "track_id",
                //only surface public, finished, visible tracks
                match: VISIBLE_TRACK_FILTER,
                select: TRACK_SELECT,
                populate: { path: "artist_id", select: ARTIST_SELECT },
            })
            .sort({ createdAt: -1 })
            .limit(fetchCap)
            .lean(),
    ]);

    // Build unified item list
    const trackItems = tracks.map(toTrackFeedItem);
    // Reposts whose track didn't match the filter have track_id === null
    const repostItems = reposts
        .filter((r) => r.track_id !== null)
        .map(toRepostFeedItem);
    // Merge + chronological sort
    const allItems = [...trackItems, ...repostItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const skip = (page - 1) * limit;
    const paginated = allItems.slice(skip, skip + limit);

    return {
        items: paginated,
        total: allItems.length, // total within the fetched window
        page,
        limit,
    };
};

//  User profile feed  (GET /users/:user_id/feed)
//  Public view of a single artist's uploads and reposts.

const getUserProfileFeed = async (userId, page = 1, limit = 20) => {
    const fetchCap = (page - 1) * limit + limit;

    const [tracks, reposts] = await Promise.all([
        Track.find({
            artist_id: userId,
            ...VISIBLE_TRACK_FILTER,
        })
            .select(TRACK_SELECT)
            .populate("artist_id", ARTIST_SELECT)
            .sort({ createdAt: -1 })
            .limit(fetchCap)
            .lean(),

        Repost.find({ user_id: userId })
            .populate("user_id", ARTIST_SELECT)
            .populate({
                path: "track_id",
                match: VISIBLE_TRACK_FILTER,
                select: TRACK_SELECT,
                populate: { path: "artist_id", select: ARTIST_SELECT },
            })
            .sort({ createdAt: -1 })
            .limit(fetchCap)
            .lean(),
    ]);
    const trackItems = tracks.map(toTrackFeedItem);
    const repostItems = reposts
        .filter((r) => r.track_id !== null)
        .map(toRepostFeedItem);

    const allItems = [...trackItems, ...repostItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const skip = (page - 1) * limit;
    const paginated = allItems.slice(skip, skip + limit);

    return {
        items: paginated,
        total: allItems.length,
        page,
        limit,
    };
};

export default {
    getPersonalFeed,
    getUserProfileFeed,
}