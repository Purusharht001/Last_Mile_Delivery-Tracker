import { NotificationChannel as ChannelType, OrderStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { EmailChannel } from "./email.channel";
import { statusChangeTemplate } from "./templates";

const emailChannel = new EmailChannel();

export async function notifyOrderStatusChange(params: {
  orderId: string;
  customerEmail: string;
  customerId: string;
  status: OrderStatus;
  notes?: string | null;
}) {
  const { subject, body } = statusChangeTemplate(params.orderId, params.status, params.notes);
  const result = await emailChannel.send({ to: params.customerEmail, subject, body });

  await prisma.notification.create({
    data: {
      orderId: params.orderId,
      userId: params.customerId,
      channel: ChannelType.EMAIL,
      event: `STATUS_${params.status}`,
      status: result.success ? "SENT" : "FAILED",
    },
  });
}
