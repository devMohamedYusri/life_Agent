import webPush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  console.warn('VAPID keys are not configured. Push notifications will be disabled.');
} else {
    webPush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
    );
}

export const sendPushNotification = async (subscription: webPush.PushSubscription, payload: object) => {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return; // Silently fail if not configured
  }
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    // This often happens when a subscription is expired or invalid.
    // It's a good idea to handle this by deleting the subscription from your DB.
    console.error('Error sending push notification:', error);
    // Here you could emit an event to delete the invalid subscription.
  }
}; 