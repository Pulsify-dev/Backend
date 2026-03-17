
export default {
  sendVerificationEmail: async (email, token) => {
    console.log(`\n📧 [MOCK EMAIL] To: ${email}`);
    console.log(`Subject: Verify your Pulsify Account`);
    console.log(`Body: Click here to verify -> http://localhost:3000/v1/auth/verify-email?token=${token}\n`);
    return true;
  },

  sendPasswordResetEmail: async (email, token) => {
    console.log(`\n📧 [MOCK EMAIL] To: ${email}`);
    console.log(`Subject: Reset your Pulsify Password`);
    console.log(`Body: Use this token to reset your password: ${token}\n`);
    return true;
  }
};