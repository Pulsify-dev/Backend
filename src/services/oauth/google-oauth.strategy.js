import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../utils/errors.utils.js";

class GoogleOAuthStrategy {
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async verifyToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      return {
        providerId: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture || null,
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid Google ID token.");
    }
  }
}

export default GoogleOAuthStrategy;
