'use client';

import { useEffect, useState, useCallback } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  gameCode?: string;
  requireInteraction?: boolean;
  actions?: { action: string; title: string }[];
}

export interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isRegistered: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (options: NotificationOptions) => void;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check support and current permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
    }

    // Check if service worker is already registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/sw.js').then((registration) => {
        if (registration) {
          setSwRegistration(registration);
          setIsRegistered(true);
        }
      });
    }
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Notifications] Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[Notifications] Service Worker registered:', registration.scope);
      setSwRegistration(registration);
      setIsRegistered(true);
      return registration;
    } catch (error) {
      console.error('[Notifications] Service Worker registration failed:', error);
      return null;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('[Notifications] Not supported in this browser');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      
      // Register service worker if permission granted
      if (result === 'granted' && !isRegistered) {
        await registerServiceWorker();
      }
      
      return result as NotificationPermission;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return 'denied';
    }
  }, [isSupported, isRegistered, registerServiceWorker]);

  // Send a notification
  const sendNotification = useCallback((options: NotificationOptions) => {
    if (!isSupported) {
      console.warn('[Notifications] Not supported');
      return;
    }

    if (permission !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return;
    }

    // If we have a service worker, use it
    if (swRegistration) {
      swRegistration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon.svg',
        tag: options.tag || 'moonfall-notification',
        data: {
          url: options.url || '/',
          gameCode: options.gameCode,
        },
        requireInteraction: options.requireInteraction || false,
      });
    } else {
      // Fallback to regular notification
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon.svg',
        tag: options.tag || 'moonfall-notification',
      });

      notification.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };
    }
  }, [isSupported, permission, swRegistration]);

  return {
    permission,
    isSupported,
    isRegistered,
    requestPermission,
    sendNotification,
    registerServiceWorker,
  };
}

// Game-specific notification messages
export const GAME_NOTIFICATIONS = {
  gameStarted: (gameName: string, gameCode: string) => ({
    title: '🎮 La partie commence !',
    body: `${gameName} démarre. Découvrez votre rôle !`,
    tag: `game-start-${gameCode}`,
    url: `/game/${gameCode}`,
    gameCode,
    requireInteraction: true,
  }),
  
  phaseChange: (phase: string, gameCode: string) => {
    const phaseMessages: Record<string, { title: string; body: string }> = {
      nuit: {
        title: '🌙 La nuit tombe...',
        body: 'Le village s\'endort. Les loups se réveillent.',
      },
      jour: {
        title: '☀️ Le jour se lève !',
        body: 'Le village se réveille. Qui a été attaqué ?',
      },
      conseil: {
        title: '🗳️ Conseil du village',
        body: 'Il est temps de voter pour éliminer un suspect !',
      },
      terminee: {
        title: '🏆 Partie terminée !',
        body: 'Découvrez les résultats de la partie.',
      },
    };

    const message = phaseMessages[phase] || {
      title: 'Moonfall',
      body: `Nouvelle phase : ${phase}`,
    };

    return {
      ...message,
      tag: `phase-${phase}-${gameCode}`,
      url: `/game/${gameCode}`,
      gameCode,
      requireInteraction: phase === 'conseil',
    };
  },
  
  yourTurn: (action: string, gameCode: string) => ({
    title: '🎯 À vous de jouer !',
    body: action,
    tag: `turn-${gameCode}`,
    url: `/game/${gameCode}`,
    gameCode,
    requireInteraction: true,
  }),
  
  eliminated: (gameCode: string) => ({
    title: '💀 Vous avez été éliminé...',
    body: 'Vous êtes maintenant spectateur de la partie.',
    tag: `eliminated-${gameCode}`,
    url: `/game/${gameCode}`,
    gameCode,
  }),
  
  missionAssigned: (missionTitle: string, gameCode: string) => ({
    title: '📋 Nouvelle mission !',
    body: missionTitle,
    tag: `mission-${gameCode}`,
    url: `/game/${gameCode}`,
    gameCode,
    requireInteraction: true,
  }),
  
  wolfChat: (senderName: string, gameCode: string) => ({
    title: '🐺 Message des loups',
    body: `${senderName} a envoyé un message`,
    tag: `wolf-chat-${gameCode}`,
    url: `/game/${gameCode}`,
    gameCode,
  }),
};
