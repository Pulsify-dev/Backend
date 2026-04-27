import discoveryService from "../services/discovery.service.js";
import searchService from "../services/search.service.js";

// ─────────────────────────────────────────────────────────────────────────────
//  GET /feed
//  Authenticated user's personal activity feed.
// ─────────────────────────────────────────────────────────────────────────────

const getPersonalFeed = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid page or limit parameters.",
            });
        }

        // Return personalized feed
        const userId = req.user.user_id;
        const result = await discoveryService.getPersonalFeed(userId, page, limit);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /users/:user_id/feed
//  Public profile feed for a specific artist.
// ─────────────────────────────────────────────────────────────────────────────

const getUserProfileFeed = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid page or limit parameters.",
            });
        }

        const result = await discoveryService.getUserProfileFeed(user_id, page, limit);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /resolve
//  Resolve standard URLs / permalinks into internal resources.
// ─────────────────────────────────────────────────────────────────────────────

const resolveResource = async (req, res, next) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "url query parameter is required.",
            });
        }

        const result = await discoveryService.resolveUrl(url);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /search
//  Global Search using Meilisearch
// ─────────────────────────────────────────────────────────────────────────────

const globalSearch = async (req, res, next) => {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Search query 'q' parameter is required.",
            });
        }

        const result = await searchService.globalSearch(q, limit, offset);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /trending
//  Trending tracks based on engagement velocity.
// ─────────────────────────────────────────────────────────────────────────────

const getTrending = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const genre = req.query.genre || null;

        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid page or limit parameters.",
            });
        }

        const result = await discoveryService.getTrending(page, limit, genre);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /charts
//  Top ranked tracks chart.
// ─────────────────────────────────────────────────────────────────────────────

const getCharts = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const genre = req.query.genre || null;

        if (limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid limit parameter.",
            });
        }

        const result = await discoveryService.getCharts(limit, genre);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /search/suggestions
//  Lightweight autocomplete for as-you-type search bar dropdown.
// ─────────────────────────────────────────────────────────────────────────────

const searchSuggestions = async (req, res, next) => {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 5;

        if (!q || !q.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query 'q' parameter is required.",
            });
        }

        const result = await searchService.searchSuggestions(q, limit);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /discover
//  Home page discovery hub — shelves of trending, charts, new releases,
//  and personalized recommendations.
// ─────────────────────────────────────────────────────────────────────────────

const getDiscoverHome = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || null;
        const shelves = await discoveryService.getDiscoverHome(userId);

        return res.status(200).json({
            success: true,
            data: shelves,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /feed/discover
//  TikTok-style "For You" reel feed — flat paginated stream of tracks.
// ─────────────────────────────────────────────────────────────────────────────

const getDiscoverFeed = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const userId = req.user?.user_id || null;

        const result = await discoveryService.getDiscoverFeed(userId, page, limit);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

export default {
    getPersonalFeed,
    getUserProfileFeed,
    resolveResource,
    globalSearch,
    searchSuggestions,
    getTrending,
    getCharts,
    getDiscoverHome,
    getDiscoverFeed,
};