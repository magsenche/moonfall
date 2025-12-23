import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LobbyClient } from './lobby-client';

interface GamePageProps {
  params: Promise<{ code: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { code } = await params;
  const supabase = await createClient();

  // Fetch game data
  const { data: game, error } = await supabase
    .from('games')
    .select(`
      *,
      players (
        id,
        pseudo,
        is_alive,
        is_mj,
        role_id,
        created_at
      )
    `)
    .eq('code', code.toUpperCase())
    .single();

  if (error || !game) {
    redirect('/');
  }

  // Get roles for display (only when game has started)
  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .eq('is_active', true);

  return (
    <LobbyClient 
      initialGame={game} 
      roles={roles || []} 
    />
  );
}
