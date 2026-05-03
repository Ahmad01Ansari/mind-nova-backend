import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      const isGmail = host.includes('gmail.com');

      this.transporter = nodemailer.createTransport({
        ...(isGmail ? { service: 'gmail' } : { host, port, secure: port === 465 }),
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        debug: true,
        logger: true,
      });
      this.logger.log(`Mail service initialized with ${isGmail ? 'Gmail Service' : `SMTP (${host}:${port})`}`);
    } else {
      this.logger.warn('SMTP credentials not found. Mail service will run in MOCK mode.');
      // Mock transporter
      this.transporter = {
        sendMail: async (options: any) => {
          this.logger.log(`
══════════════════════════════════════════════════════════
[MOCK MAIL]
To: ${options.to}
Subject: ${options.subject}
Body: ${options.text}
CODE: ${options.text.match(/\d{6}/)?.[0]}
══════════════════════════════════════════════════════════
          `);
          return { messageId: 'mock-id' };
        },
      } as any;
    }
  }

  async sendOtp(email: string, otp: string) {
    const mailOptions = {
      from: `"MindNova" <${this.configService.get<string>('SMTP_FROM') || 'noreply@mindnova.app'}>`,
      to: email,
      subject: 'Verification Code - MindNova',
      text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 12px;">
          <h2 style="color: #5E4B8B; textAlign: center;">MindNova Verification</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f9; padding: 20px; textAlign: center; fontSize: 32px; fontWeight: bold; letterSpacing: 5px; color: #5E4B8B; margin: 20px 0; borderRadius: 8px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: 0; borderTop: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="fontSize: 12px; color: #888; textAlign: center;">© 2026 MindNova. All rights reserved.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}: ${error.message}`);
      throw new Error('Could not send verification email');
    }
  }
}
