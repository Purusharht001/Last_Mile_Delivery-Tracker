export interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}

// Swappable channel interface — EmailChannel below is the concrete
// implementation used in production. SmsChannel logs instead of sending,
// since reliable free-tier SMS delivery isn't guaranteed; swapping in a
// paid provider (e.g. Twilio) means implementing this same interface.
export interface NotificationChannel {
  send(message: NotificationMessage): Promise<{ success: boolean }>;
}
