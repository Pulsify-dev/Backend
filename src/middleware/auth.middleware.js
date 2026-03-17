import tokenUtility from "../utils/jwt.utils.js";

const requireAuth = (req, res, next) => {
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

    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Authentication failed." });
  }
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
  requireAdmin,
  requireTier,
};
