import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

const { accessSecret, refreshSecret, accessExpiry, refreshExpiry } = config.jwt;

export default {
  generateAccessToken: (payload) => {
    return jwt.sign(payload, accessSecret, { expiresIn: accessExpiry });
  },

  generateRefreshToken: (payload) => {
    return jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiry });
  },

  generateVerificationToken: (userId) => {
    return jwt.sign({ user_id: userId }, accessSecret, { expiresIn: "24h" });
  },

  verifyToken: (token, isRefresh = false) => {
    try {
      const secret = isRefresh ? refreshSecret : accessSecret;
      return jwt.verify(token, secret);
    } catch (err) {
      return null;
    }
  },
};
