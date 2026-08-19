'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { MotionButton } from '@/components/ui';

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Moonfall — Les règles en 2 minutes',
          text: 'Lis les règles avant la partie de ce week-end !',
          url,
        });
        return;
      } catch {
        // partage annulé → fallback copie
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MotionButton variant="secondary" size="sm" className="gap-2" onClick={handleShare}>
      {copied ? (
        <>
          <Check className="w-4 h-4" /> Lien copié !
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" /> Partager aux joueurs
        </>
      )}
    </MotionButton>
  );
}
