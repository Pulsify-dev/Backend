import cron from "node-cron";
import PlayHistory from "../models/play-history.model.js";
import Like from "../models/like.model.js";
import Repost from "../models/repost.model.js";
import Comment from "../models/comment.model.js";
import Track from "../models/track.model.js";

// Engagement weights
const WEIGHTS = {
  play: 1,
  like: 3,
  repost: 5,
  comment: 2,
};

// Time window: 7 days
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/*
  Aggregates recent engagement counts per track from a given model.
  Returns a Map<trackId, count>.
*/
const aggregateRecent = async (Model, trackField, since) => {
  const pipeline = [
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: `$${trackField}`, count: { $sum: 1 } } },
  ];
  const results = await Model.aggregate(pipeline);
  const map = new Map();
  for (const r of results) {
    map.set(r._id.toString(), r.count);
  }
  return map;
};

/*
  Recalculates trending_score for every track based on
  engagement velocity within the configured time window.
*/
export const recalculateTrendingScores = async () => {
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_MS);

  console.log(`[Trending Job] Recalculating scores since ${since.toISOString()}...`);

  // Gather engagement maps in parallel
  const [playMap, likeMap, repostMap, commentMap] = await Promise.all([
    aggregateRecent(PlayHistory, "track_id", since),
    aggregateRecent(Like, "track_id", since),
    aggregateRecent(Repost, "track_id", since),
    aggregateRecent(Comment, "track_id", since),
  ]);

  // Collect all unique track IDs that had any activity
  const activeTrackIds = new Set([
    ...playMap.keys(),
    ...likeMap.keys(),
    ...repostMap.keys(),
    ...commentMap.keys(),
  ]);

  // Build bulk write operations
  const bulkOps = [];

  // Update active tracks with their calculated score
  for (const trackId of activeTrackIds) {
    const plays = playMap.get(trackId) || 0;
    const likes = likeMap.get(trackId) || 0;
    const reposts = repostMap.get(trackId) || 0;
    const comments = commentMap.get(trackId) || 0;

    const score =
      plays * WEIGHTS.play +
      likes * WEIGHTS.like +
      reposts * WEIGHTS.repost +
      comments * WEIGHTS.comment;

    bulkOps.push({
      updateOne: {
        filter: { _id: trackId },
        update: {
          $set: {
            trending_score: score,
            trending_score_updated_at: now,
          },
        },
      },
    });
  }

  // Reset inactive tracks (had a score but no recent activity)
  bulkOps.push({
    updateMany: {
      filter: {
        trending_score: { $gt: 0 },
        _id: { $nin: [...activeTrackIds] },
      },
      update: {
        $set: {
          trending_score: 0,
          trending_score_updated_at: now,
        },
      },
    },
  });

  if (bulkOps.length > 0) {
    await Track.bulkWrite(bulkOps);
  }

  console.log(
    `[Trending Job] Done. Updated ${activeTrackIds.size} active tracks, reset inactive ones.`
  );
};

/*
  Starts a cron job that recalculates trending scores every hour.
*/
export const startTrendingCron = () => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      await recalculateTrendingScores();
    } catch (error) {
      console.error("[Trending Job] Error:", error);
    }
  });

  console.log("[Trending Job] Cron scheduled — runs every hour.");
};
