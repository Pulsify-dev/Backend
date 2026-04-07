import appleSignin from "apple-signin-auth";
import { UnauthorizedError } from "../../utils/errors.utils.js";

class AppleOAuthStrategy {
  async verifyToken(identityToken) {
    try {
      const payload = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false,
      });

      return {
        providerId: payload.sub,
        email: payload.email,
        displayName: "Apple User", // Apple only sends the real name once to the frontend
        avatarUrl: null,
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid Apple identity token.");
    }
  }
}

export default AppleOAuthStrategy;
