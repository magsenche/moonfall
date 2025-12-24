/**
 * WolfPack - Display wolf teammates
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import type { PartialPlayer } from '../hooks/types';

interface WolfPackProps {
  wolves: PartialPlayer[];
}

export function WolfPack({ wolves }: WolfPackProps) {
  if (wolves.length <= 1) return null;

  return (
    <Card className="mb-6 border border-red-500/30">
      <CardHeader>
        <CardTitle className="text-red-400 text-lg">
          🐺 Meute des Loups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {wolves.map((wolf) => (
            <li key={wolf.id} className="flex items-center gap-3 p-2 bg-red-500/10 rounded-lg">
              <PlayerAvatar playerId={wolf.id} pseudo={wolf.pseudo} size="sm" />
              <span className="text-white">{wolf.pseudo}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-red-400/70 mt-3">
          Chaque nuit, choisissez ensemble une victime.
        </p>
      </CardContent>
    </Card>
  );
}
