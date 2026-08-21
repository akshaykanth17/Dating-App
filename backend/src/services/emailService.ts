export interface IEmailService {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

export class EmailService implements IEmailService {
  private resendApiKey: string | undefined;
  private fromEmail: string;

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@heartsync.app';
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const subject = 'Verify your HeartSync account';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #e11d48; text-align: center;">Welcome to HeartSync!</h2>
        <p>Hi there,</p>
        <p>Thank you for signing up. Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: linear-gradient(135deg, #e11d48, #be123c); color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Must be 18+ to use HeartSync. If you did not register for this account, please ignore this email.</p>
      </div>
    `;

    await this.sendMail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const subject = 'Reset your HeartSync Password';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #e11d48; text-align: center;">Password Reset Request</h2>
        <p>Hi there,</p>
        <p>We received a request to reset your password for your HeartSync account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #e11d48, #be123c); color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This password reset link will expire in 1 hour. If you did not make this request, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">HeartSync Dating App Support</p>
      </div>
    `;

    await this.sendMail(email, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (this.resendApiKey) {
      try {
        // Dynamically load Resend in case the key is provided
        const { Resend } = await import('resend');
        const resend = new Resend(this.resendApiKey);
        await resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        console.log(`[EmailService] Sent email to ${to} via Resend.`);
      } catch (error) {
        console.error(`[EmailService] Failed to send email to ${to} via Resend:`, error);
      }
    } else {
      console.log('========================================================================');
      console.log(`[EmailService] (DEVELOPMENT LOG) To: ${to}`);
      console.log(`[EmailService] Subject: ${subject}`);
      console.log(`[EmailService] Body Preview:`);
      // Strip HTML tags for console printing
      console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
      console.log('========================================================================');
    }
  }
}

export const emailService = new EmailService();
