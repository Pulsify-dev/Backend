// export default {
//   verify: async (captchaToken) => {
//     if (!captchaToken) return false;
//     console.log(`[Mock CAPTCHA] Verified token: ${captchaToken}`);
//     return true;
//   },
// };

class CaptchaService {
  async verify(captchaToken) {
    if (!captchaToken) {
      return false;
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "[CaptchaService] CRITICAL: RECAPTCHA_SECRET_KEY is missing from environment variables.",
      );
      throw new Error(
        "Internal Server Error: Security configuration is incomplete.",
      );
    }

    try {
      const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: captchaToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return true;
      }

      console.warn(
        "[CaptchaService] CAPTCHA verification failed:",
        data["error-codes"],
      );
      return false;
    } catch (error) {
      console.error(
        "[CaptchaService] Network error communicating with CAPTCHA provider:",
        error.message,
      );
      return false;
    }
  }
}

export default new CaptchaService();
