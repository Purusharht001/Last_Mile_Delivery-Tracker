import nodemailer, { Transporter } from "nodemailer";
import { env } from "../../config/env";
import { NotificationChannel, NotificationMessage } from "./notification.channel";

export class EmailChannel implements NotificationChannel {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      return null;
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      });
    }
    return this.transporter;
  }

  async send(message: NotificationMessage): Promise<{ success: boolean }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      // No SMTP configured (e.g. local dev without creds) — log instead of
      // throwing, so the rest of the order flow still works end to end.
      // eslint-disable-next-line no-console
      console.log(`[email:skipped-no-smtp] to=${message.to} subject="${message.subject}"`);
      return { success: false };
    }
    try {
      await transporter.sendMail({
        from: env.smtp.from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
      return { success: true };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[email:failed]", err);
      return { success: false };
    }
  }
}
