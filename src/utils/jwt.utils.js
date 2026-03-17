import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export default {
  generateAccessToken: (payload) => {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
  },

  generateRefreshToken: (payload) => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
  },

  generateVerificationToken: (userId) => {
    return jwt.sign({ user_id: userId }, ACCESS_SECRET, { expiresIn: "24h" });
  },

  verifyToken: (token, isRefresh = false) => {
    try {
      const secret = isRefresh ? REFRESH_SECRET : ACCESS_SECRET;
      return jwt.verify(token, secret);
    } catch (err) {
      return null;
    }
  },
};
