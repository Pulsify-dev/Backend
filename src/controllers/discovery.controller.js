import discoveryService from "../services/discovery.service.js";

// ─────────────────────────────────────────────────────────────────────────────
//  GET /feed
//  Authenticated user's personal activity feed.
// ─────────────────────────────────────────────────────────────────────────────

const getPersonalFeed = async (req, res, next) => {
    try {
        const userId = req.user.user_id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid page or limit parameters.",
            });
        }

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

export default {
    getPersonalFeed,
    getUserProfileFeed,
    resolveResource,
};