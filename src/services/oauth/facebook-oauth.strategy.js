import axios from "axios";
import { UnauthorizedError } from "../../utils/errors.utils.js";

class FacebookOAuthStrategy {
  async verifyToken(accessToken) {
    try {
      const { data } = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
      );

      return {
        providerId: data.id,
        email: data.email,
        displayName: data.name,
        avatarUrl: data.picture?.data?.url || null,
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid Facebook access token.");
    }
  }
}

export default FacebookOAuthStrategy;
