'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/notifications';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui';

interface NotificationPromptProps {
  playerId?: string;
  onPermissionChange?: (permission: 'granted' | 'denied' | 'default') => void;
}

export function NotificationPrompt({ playerId, onPermissionChange }: NotificationPromptProps) {
  const { permission, isSupported, isPushSubscribed, requestPermission, subscribeToPush } = useNotifications({ playerId });
  const [isLoading, setIsLoading] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Auto-subscribe to push if permission already granted and we have playerId
  useEffect(() => {
    const autoSubscribe = async () => {
      if (permission === 'granted' && playerId && !isPushSubscribed) {
        try {
          await subscribeToPush(playerId);
          setSubscribeStatus('success');
        } catch {
          // Auto-subscribe failed, will retry on user action
        }
      }
    };
    autoSubscribe();
  }, [permission, playerId, isPushSubscribed, subscribeToPush]);

  // Don't show if not supported
  if (!isSupported) {
    return null;
  }

  // Show success state briefly
  if (permission === 'granted' && (isPushSubscribed || subscribeStatus === 'success')) {
    return (
      <div className="bg-village-400/10 border border-village-400/30 rounded-lg p-3 text-sm text-village-300">
        <p><Bell className="w-4 h-4 inline -mt-0.5" /> Notifications activées ! Tu seras alerté des changements de phase.</p>
      </div>
    );
  }

  // Don't show if denied (user made their choice)
  if (permission === 'denied') {
    return (
      <div className="bg-moon-500/10 border border-moon-500/30 rounded-lg p-3 text-sm text-moon-300">
        <p><BellOff className="w-4 h-4 inline -mt-0.5" /> Les notifications sont désactivées.</p>
        <p className="text-xs text-moon-300/70 mt-1">
          Activez-les dans les paramètres de votre navigateur pour être alerté des événements du jeu.
        </p>
      </div>
    );
  }

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await requestPermission();
      onPermissionChange?.(result);
      
      // If permission granted, subscribe to push with playerId
      if (result === 'granted' && playerId) {
        const success = await subscribeToPush(playerId);
        setSubscribeStatus(success ? 'success' : 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-village-400/10 border border-village-400/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Bell className="w-6 h-6 text-village-300 shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-village-300">Activer les notifications</h4>
          <p className="text-sm text-village-300/70 mt-1">
            Recevez des alertes quand c&apos;est votre tour ou quand la phase change !
          </p>
          <Button 
            onClick={handleRequestPermission}
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={isLoading}
          >
            {isLoading ? 'Activation...' : 'Activer les notifications'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Badge showing notification status
export function NotificationBadge() {
  const { permission, isSupported } = useNotifications();

  if (!isSupported) return null;

  const statusConfig = {
    granted: { Icon: Bell, color: 'text-village-300', label: 'Notifications activées' },
    denied: { Icon: BellOff, color: 'text-blood-400', label: 'Notifications désactivées' },
    default: { Icon: Bell, color: 'text-moon-500', label: 'Notifications en attente' },
  };

  const config = statusConfig[permission];

  return (
    <div className={`flex items-center gap-1 text-xs ${config.color}`} title={config.label}>
      <config.Icon className="w-3.5 h-3.5" />
    </div>
  );
}
