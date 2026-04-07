import GoogleOAuthStrategy from "./google-oauth.strategy.js";
import FacebookOAuthStrategy from "./facebook-oauth.strategy.js";
import AppleOAuthStrategy from "./apple-oauth.strategy.js";
import { BadRequestError } from "../../utils/errors.utils.js";

class OAuthFactory {
  static getStrategy(provider) {
    switch (provider.toLowerCase()) {
      case "google":
        return new GoogleOAuthStrategy();
      case "facebook":
        return new FacebookOAuthStrategy();
      case "apple":
        return new AppleOAuthStrategy();
      default:
        throw new BadRequestError(`Unsupported OAuth provider: ${provider}`);
    }
  }
}

export default OAuthFactory;
