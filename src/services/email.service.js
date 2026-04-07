import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: parseInt(process.env.SMTP_PORT, 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.defaultFrom =
      process.env.EMAIL_FROM || '"Pulsify" <noreply@pulsify.app>';
    this.clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${this.clientUrl}/v1/auth/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: this.defaultFrom,
      to: email,
      subject: "Verify your Pulsify Account",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Pulsify! 🎵</h2>
          <p>Please verify your account by clicking the button below:</p>
          <a href="${verificationUrl}" style="background-color: #ff5500; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Verify Email
          </a>
          <p>If the button doesn't work, copy and paste this link:<br/>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    });

    return true;
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${this.clientUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.defaultFrom,
      to: email,
      subject: "Reset your Pulsify Password",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #ff5500; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
          <p>If the button doesn't work, copy and paste this link:<br/>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return true;
  }

  async sendEmailChangeVerification(email, token) {
    const confirmUrl = `${this.clientUrl}/v1/profile/confirm-email?token=${token}`;

    await this.transporter.sendMail({
      from: this.defaultFrom,
      to: email,
      subject: "Confirm your new Pulsify Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Confirm New Email</h2>
          <p>Please confirm your new email address for your Pulsify account:</p>
          <a href="${confirmUrl}" style="background-color: #ff5500; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Confirm Email
          </a>
          <p>If the button doesn't work, copy and paste this link:<br/>
            <a href="${confirmUrl}">${confirmUrl}</a>
          </p>
          <p>If you did not request this change, please contact support immediately.</p>
        </div>
      `,
    });

    return true;
  }
}

export default new EmailService();
