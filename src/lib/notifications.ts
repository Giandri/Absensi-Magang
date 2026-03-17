import { prisma } from "./prisma";
import webpush from "./webpush";

export async function sendNotification({
  userId,
  title,
  message,
  url = "/",
  type = "info",
}: {
  userId: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  try {
    // 1. Save to database history
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        url,
      },
    });

    // 2. Fetch all active push subscriptions for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    // 3. Send push messages
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            url,
          })
        );
      } catch (error: any) {
        // If subscription is expired or invalid, remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Removing expired subscription: ${sub.endpoint}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("Error sending push notification to endpoint:", sub.endpoint, error);
        }
      }
    });

    await Promise.all(pushPromises);
    return notification;
  } catch (error) {
    console.error("sendNotification error:", error);
    return null;
  }
}
