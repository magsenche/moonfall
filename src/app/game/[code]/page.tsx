import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GameClient } from './game-client';

interface GamePageProps {
  params: Promise<{ code: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { code } = await params;
  const supabase = await createClient();

  // Partie + référentiel des rôles en parallèle (indépendants — les attendre
  // en séquence doublait le TTFB de la page)
  const [{ data: game, error }, { data: roles }] = await Promise.all([
    supabase
      .from('games')
      .select(`
        *,
        players (
          id,
          pseudo,
          is_alive,
          is_mj,
          role_id,
          created_at,
          avatar_url
        )
      `)
      .eq('code', code.toUpperCase())
      .single(),
    supabase.from('roles').select('*').eq('is_active', true),
  ]);

  if (error || !game) {
    redirect('/');
  }

  return (
    <GameClient 
      initialGame={game} 
      roles={roles || []} 
    />
  );
}
