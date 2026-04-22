import redisClient from "../config/redis.js";

/**
 * Generic cache utility.
 * All methods are safe to call even when Redis is unavailable — they
 * simply return null / do nothing so the app falls back to MongoDB.
 */
const cache = {
  /**
   * Get a cached value by key.
   * @returns {any|null} Parsed value or null on miss / error.
   */
  async get(key) {
    if (!redisClient) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(`[Cache] GET error for "${key}":`, err.message);
      return null;
    }
  },

  /**
   * Set a value in cache.
   * @param {string} key
   * @param {any}    value  — will be JSON-stringified.
   * @param {number} ttl    — time-to-live in seconds.
   */
  async set(key, value, ttl) {
    if (!redisClient) return;
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttl);
    } catch (err) {
      console.warn(`[Cache] SET error for "${key}":`, err.message);
    }
  },

  /**
   * Delete one or more keys (exact match).
   */
  async del(...keys) {
    if (!redisClient) return;
    try {
      await redisClient.del(...keys);
    } catch (err) {
      console.warn(`[Cache] DEL error:`, err.message);
    }
  },

  /**
   * Delete all keys matching a glob pattern (e.g. "trending:*").
   */
  async delPattern(pattern) {
    if (!redisClient) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      console.warn(`[Cache] DEL pattern error for "${pattern}":`, err.message);
    }
  },
};

export default cache;
