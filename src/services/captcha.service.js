export default {
  verify: async (captchaToken) => {
    if (!captchaToken) return false;
    console.log(`[Mock CAPTCHA] Verified token: ${captchaToken}`);
    return true;
  },
};
