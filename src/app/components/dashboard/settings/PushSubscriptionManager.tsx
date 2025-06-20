'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@//lib/stores/authStore';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscriptionManager({ onMessage }: { onMessage: (msg: string, isError?: boolean) => void }) {
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) {
            setIsSubscribed(true);
            setSubscription(sub);
          }
        });
      });
    }
  }, []);
  
  const subscribeUser = async () => {
    if (!user || !vapidPublicKey) {
      onMessage('Required information is missing for subscription.', true);
      return;
    }

    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(sub),
      });

      setSubscription(sub);
      setIsSubscribed(true);
      setPermission('granted');
      onMessage('Push notifications enabled!');
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
      const err = error as Error;
      onMessage(`Error enabling notifications: ${err.message}`, true);
      setPermission(Notification.permission);
    }
  };

  const unsubscribeUser = async () => {
    if (!user || !subscription) return;
    try {
      await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setIsSubscribed(false);
      setSubscription(null);
      setPermission('default');
      onMessage('Push notifications disabled.');
    } catch (error) {
        const err = error as Error;
        onMessage(`Error disabling notifications: ${err.message}`, true);
    }
  };

  const handleToggleSubscription = () => {
    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  };

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg text-red-700 dark:text-red-200">
        <p className="font-semibold">Push notifications are blocked.</p>
        <p className="text-sm">You&apos;ll need to enable them in your browser settings to receive push alerts.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">Browser Push Notifications</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">Receive alerts directly in your browser.</p>
      </div>
      <button
        onClick={handleToggleSubscription}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          isSubscribed
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {isSubscribed ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
} 