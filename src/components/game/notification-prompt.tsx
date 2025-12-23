'use client';

import { useState } from 'react';
import { useNotifications } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';

interface NotificationPromptProps {
  onPermissionChange?: (permission: 'granted' | 'denied' | 'default') => void;
}

export function NotificationPrompt({ onPermissionChange }: NotificationPromptProps) {
  const { user } = useAuth();
  const { permission, isSupported, requestPermission, subscribeToPush } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show if not supported or already granted
  if (!isSupported || permission === 'granted') {
    return null;
  }

  // Don't show if denied (user made their choice)
  if (permission === 'denied') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
        <p>🔕 Les notifications sont désactivées.</p>
        <p className="text-xs text-amber-300/70 mt-1">
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
      
      // If permission granted and user is authenticated, subscribe to push
      if (result === 'granted' && user) {
        await subscribeToPush();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <h4 className="font-medium text-purple-200">Activer les notifications</h4>
          <p className="text-sm text-purple-300/70 mt-1">
            {user 
              ? "Recevez des alertes même quand l'app est fermée !"
              : "Recevez des alertes quand c'est votre tour ou quand la phase change !"
            }
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
    granted: { icon: '🔔', color: 'text-green-400', label: 'Notifications activées' },
    denied: { icon: '🔕', color: 'text-red-400', label: 'Notifications désactivées' },
    default: { icon: '🔔', color: 'text-amber-400', label: 'Notifications en attente' },
  };

  const config = statusConfig[permission];

  return (
    <div className={`flex items-center gap-1 text-xs ${config.color}`} title={config.label}>
      <span>{config.icon}</span>
    </div>
  );
}
