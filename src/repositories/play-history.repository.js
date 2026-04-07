import mongoose from "mongoose";
import PlayHistory from "../models/play-history.model.js";

/**
 * Records a new play event for a user/track pair.
 * is_completed is set to true if duration_played_ms >= 90% of track duration.
 */
const recordPlay = async (userId, trackId, durationPlayedMs, trackDurationMs) => {
    const isCompleted = durationPlayedMs >= trackDurationMs * 0.9;

    const entry = await PlayHistory.create({
        user_id: userId,
        track_id: trackId,
        duration_played_ms: durationPlayedMs,
        is_completed: isCompleted,
        played_at: new Date(),
    });

    return entry;
};

/**
 * Returns paginated listening history for a user, newest first.
 * Populates track details for each entry.
 */
const getHistory = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
        PlayHistory.find({ user_id: userId })
            .sort({ played_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "track_id",
                select: "title artwork_url duration genre artist_id permalink play_count like_count",
            })
            .lean(),
        PlayHistory.countDocuments({ user_id: userId }),
    ]);

    return { history, total, page, limit };
};

/**
 * Deletes all play history entries for a user.
 */
const clearHistory = async (userId) => {
    const result = await PlayHistory.deleteMany({ user_id: userId });
    return result.deletedCount;
};

/**
 * Returns the most recently played unique tracks for a user (deduped by track_id).
 * Uses aggregation to pick the latest play per track, then paginates.
 */
const getRecentlyPlayed = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    const pipeline = [
        { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
        { $sort: { played_at: -1 } },
        // Keep only the latest play per track
        {
            $group: {
                _id: "$track_id",
                played_at: { $first: "$played_at" },
                duration_played_ms: { $first: "$duration_played_ms" },
                is_completed: { $first: "$is_completed" },
            },
        },
        { $sort: { played_at: -1 } },
        // Count total unique tracks before pagination
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: "tracks",
                            localField: "_id",
                            foreignField: "_id",
                            as: "track",
                        },
                    },
                    { $unwind: "$track" },
                    {
                        $project: {
                            _id: 0,
                            track_id: "$_id",
                            played_at: 1,
                            duration_played_ms: 1,
                            is_completed: 1,
                            "track.title": 1,
                            "track.artwork_url": 1,
                            "track.duration": 1,
                            "track.genre": 1,
                            "track.artist_id": 1,
                            "track.permalink": 1,
                            "track.play_count": 1,
                            "track.like_count": 1,
                        },
                    },
                ],
            },
        },
    ];

    const [result] = await PlayHistory.aggregate(pipeline);

    const total = result.metadata[0]?.total ?? 0;
    const tracks = result.data;

    return { tracks, total, page, limit };
};

/**
 * Returns the total number of completed plays for a track.
 * Used by the admin analytics dashboard (play-through rate).
 */
const countCompletedPlays = async (trackId) => {
    return PlayHistory.countDocuments({ track_id: trackId, is_completed: true });
};

/**
 * Returns aggregate play stats across the entire platform for admin analytics.
 * Scoped to last 30 days.
 */
const getPlatformPlayStats = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [result] = await PlayHistory.aggregate([
        { $match: { played_at: { $gte: thirtyDaysAgo } } },
        {
            $group: {
                _id: null,
                total_plays: { $sum: 1 },
                completed_plays: {
                    $sum: { $cond: [{ $eq: ["$is_completed", true] }, 1, 0] },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total_plays: 1,
                completed_plays: 1,
                play_through_rate: {
                    $cond: [
                        { $gt: ["$total_plays", 0] },
                        {
                            $multiply: [
                                { $divide: ["$completed_plays", "$total_plays"] },
                                100,
                            ],
                        },
                        0,
                    ],
                },
            },
        },
    ]);

    return result ?? { total_plays: 0, completed_plays: 0, play_through_rate: 0 };
};

/**
 * Increments a track's play_count by 1. Called alongside recordPlay.
 * Kept here to keep all play-related DB writes co-located.
 */
const incrementTrackPlayCount = async (trackId) => {
    const Track = (await import("../models/track.model.js")).default;
    return Track.findByIdAndUpdate(trackId, { $inc: { play_count: 1 } });
};

export default {
    recordPlay,
    getHistory,
    clearHistory,
    getRecentlyPlayed,
    countCompletedPlays,
    getPlatformPlayStats,
    incrementTrackPlayCount,
};