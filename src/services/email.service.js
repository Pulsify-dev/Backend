// src/services/email.service.js

// ── Mock Email Service (for testing) ────────────────────────
export default {
  sendVerificationEmail: async (email, token) => {
    console.log(`[Mock Email] Verification email to: ${email}`);
    console.log(`[Mock Email] Token: ${token}`);
    return true;
  },

  sendPasswordResetEmail: async (email, token) => {
    console.log(`[Mock Email] Password reset email to: ${email}`);
    console.log(`[Mock Email] Token: ${token}`);
    return true;
  },

  sendEmailChangeVerification: async (email, token) => {
    console.log(`[Mock Email] Email change verification to: ${email}`);
    console.log(`[Mock Email] Token: ${token}`);
    return true;
  },
};

// ── Real Email Service (uncomment for production) ───────────
// import nodemailer from "nodemailer";
//
// class EmailService {
//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: parseInt(process.env.SMTP_PORT, 10),
//       secure: true,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//       tls: {
//     rejectUnauthorized: false
//   }
//     });
//
//     this.defaultFrom =
//       process.env.EMAIL_FROM || '"Pulsify" <noreply@pulsify.app>';
//     this.apiUrl = process.env.API_URL;
//     this.clientUrl = process.env.CLIENT_URL;
//   }
//
//   async sendVerificationEmail(email, token) {
//     console.log("📧 [EmailService] Received email address:", email);
//
//     if (!email) {
//       console.error(
//         "❌ [EmailService] FATAL: Email is undefined. Cannot send mail.",
//       );
//       return false;
//     }
//
//     const verificationUrl = `${this.apiUrl}/auth/verify-email?token=${token}`;
//
//     await this.transporter.sendMail({
//       from: this.defaultFrom,
//       to: email,
//       subject: "Verify your Pulsify Account",
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px;">
//           <h2>Welcome to Pulsify! 🎵</h2>
//           <p>Please verify your account by clicking the button below:</p>
//           <a href="${verificationUrl}" style="background-color: #ff5500; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
//             Verify Email
//           </a>
//         </div>
//       `,
//     });
//     return true;
//   }
//
//   async sendPasswordResetEmail(email, token) {
//     const resetUrl = `${this.clientUrl}/reset-password?token=${token}`;
//
//     await this.transporter.sendMail({
//       from: this.defaultFrom,
//       to: email,
//       subject: "Reset Password",
//       html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
//     });
//     return true;
//   }
//   async sendEmailChangeVerification(email, token) {
//     const confirmUrl = `${this.apiUrl}/users/confirm-email?token=${token}`;
//
//     await this.transporter.sendMail({
//       from: this.defaultFrom,
//       to: email,
//       subject: "Confirm your new Pulsify Email Address",
//       html: `
//       <div style="font-family: Arial, sans-serif; padding: 20px;">
//         <h2>Confirm New Email 🎵</h2>
//         <p>You requested to change your Pulsify email address.</p>
//         <p>Please confirm this change by clicking the button below:</p>
//         <a href="${confirmUrl}" style="background-color: #ff5500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
//           Confirm Email
//         </a>
//         <p style="margin-top: 20px; font-size: 12px; color: #666;">
//           If you did not request this change, please ignore this email and your address will remain unchanged.
//         </p>
//       </div>
//     `,
//     });
//
//     return true;
//   }
// }
//
// export default new EmailService();
