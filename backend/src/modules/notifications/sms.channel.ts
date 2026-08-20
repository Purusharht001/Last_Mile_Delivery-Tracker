import { NotificationChannel, NotificationMessage } from "./notification.channel";

// Stub implementation: logs the message instead of delivering it via a paid
// SMS gateway. Implements the same NotificationChannel interface as
// EmailChannel, so swapping in Twilio (or similar) later is a drop-in change
// with no callers needing to change.
export class SmsChannel implements NotificationChannel {
  async send(message: NotificationMessage): Promise<{ success: boolean }> {
    // eslint-disable-next-line no-console
    console.log(`[sms:stub] to=${message.to} body="${message.body}"`);
    return { success: true };
  }
}
