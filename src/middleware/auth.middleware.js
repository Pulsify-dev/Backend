import tokenUtility from "../utils/jwt.utils.js";
import userRepository from "../repositories/user.repository.js";

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing or invalid Bearer token." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = tokenUtility.verifyToken(token, false);

    if (!decoded) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Token expired or invalid." });
    }
    const liveUser = await userRepository.findById(decoded.user_id);

    if (!liveUser) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User no longer exists." });
    }

    if (liveUser.is_suspended) {
      return res
        .status(403)
        .json({ status: "fail", message: "Forbidden: Suspended account." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Authentication failed." });
  }
};

// Like requireAuth, but doesn't reject — just attaches req.user if a valid
// token is present.  Useful for endpoints that serve both guests and members.
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const decoded = tokenUtility.verifyToken(token, false);
    if (!decoded) return next();

    const liveUser = await userRepository.findById(decoded.user_id);
    if (liveUser && !liveUser.is_suspended) {
      req.user = decoded;
    }
  } catch (_) {
    // Token is invalid / expired — treat as guest
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }
  next();
};

const requireTier = (allowedTiers) => {
  return (req, res, next) => {
    if (!req.user || !allowedTiers.includes(req.user.tier)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient plan quota or tier." });
    }
    next();
  };
};

export default {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireTier,
};
