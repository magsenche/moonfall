// Supabase Edge Function pour envoyer des Web Push Notifications
// Cette fonction est déclenchée par un webhook quand la phase change
// v4 - Fixed subscription query to use two separate queries

import { createClient } from 'npm:@supabase/supabase-js@2'

// Web Push encryption library
import webpush from 'npm:web-push@3.6.7'

interface GamePhaseChangePayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: {
    id: string
    game_id: string
    event_type: string
    data: Record<string, unknown>
  }
  schema: 'public'
  old_record: null | Record<string, unknown>
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Configure Web Push with VAPID keys
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@moonfall.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// Phase names for notifications (maps game status to notification content)
const PHASE_NOTIFICATIONS: Record<string, { emoji: string; title: string; body: string }> = {
  nuit: {
    emoji: '🌙',
    title: 'La nuit tombe...',
    body: 'Les loups-garous se réveillent. Fermez les yeux !'
  },
  jour: {
    emoji: '☀️',
    title: 'Le jour se lève',
    body: 'Découvrez qui a été victime cette nuit...'
  },
  conseil: {
    emoji: '🗳️',
    title: 'Conseil du village',
    body: 'Votez pour éliminer un suspect !'
  }
}

// Event types that trigger notifications
const EVENT_NOTIFICATIONS: Record<string, { emoji: string; title: string; body: string }> = {
  game_started: {
    emoji: '🎮',
    title: 'La partie commence !',
    body: 'Découvrez votre rôle secret...'
  },
  game_ended: {
    emoji: '🏆',
    title: 'Partie terminée !',
    body: 'Découvrez les résultats...'
  },
  player_eliminated: {
    emoji: '💀',
    title: 'Élimination !',
    body: 'Un joueur a été éliminé...'
  },
  // Mission events
  mission_created: {
    emoji: '📋',
    title: 'Nouvelle mission !',
    body: 'Une nouvelle mission a été créée pour toi.'
  },
  mission_validate: {
    emoji: '✅',
    title: 'Mission réussie !',
    body: 'Une mission vient d\'être validée !'
  },
  mission_fail: {
    emoji: '❌',
    title: 'Mission échouée',
    body: 'Une mission a échoué...'
  }
}

// Get notification info from event
function getNotificationInfo(event_type: string, data: Record<string, unknown>): { emoji: string; title: string; body: string } | null {
  // For phase changes, read the new phase from data
  if (event_type === 'phase_changed') {
    const newPhase = (data?.to || data?.new_phase || data?.phase) as string
    return PHASE_NOTIFICATIONS[newPhase] || null
  }
  
  // For mission events, customize with mission title
  if (event_type === 'mission_created') {
    const missionTitle = data?.title as string || 'Une mission'
    return {
      emoji: '📋',
      title: 'Nouvelle mission !',
      body: `"${missionTitle}" - C'est pour toi !`
    }
  }
  
  if (event_type === 'mission_validate') {
    const missionTitle = data?.title as string || 'Ta mission'
    return {
      emoji: '✅',
      title: 'Mission réussie !',
      body: `"${missionTitle}" a été validée !`
    }
  }
  
  if (event_type === 'mission_fail') {
    const missionTitle = data?.title as string || 'Ta mission'
    return {
      emoji: '❌',
      title: 'Mission échouée',
      body: `"${missionTitle}" a échoué...`
    }
  }
  
  // For other events, check if they have a notification configured
  return EVENT_NOTIFICATIONS[event_type] || null
}

Deno.serve(async (req) => {
  try {
    const payload: GamePhaseChangePayload = await req.json()

    // Only process game events
    if (payload.table !== 'game_events') {
      return new Response(JSON.stringify({ message: 'Not a game event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { game_id, event_type, data } = payload.record

    // Check if this is a notification-worthy event
    const notificationInfo = getNotificationInfo(event_type, data as Record<string, unknown> || {})
    if (!notificationInfo) {
      return new Response(JSON.stringify({ message: 'Event type not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get game info
    const { data: game } = await supabase
      .from('games')
      .select('code, name')
      .eq('id', game_id)
      .single()

    if (!game) {
      console.error('[Push] Game not found:', game_id)
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get all players in the game
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, user_id, pseudo')
      .eq('game_id', game_id)

    if (!allPlayers || allPlayers.length === 0) {
      return new Response(JSON.stringify({ message: 'No players to notify' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Filter players based on event type
    // For mission events, only notify assigned players
    let targetPlayers = allPlayers
    const eventData = data as Record<string, unknown> || {}
    
    if (event_type === 'mission_created') {
      const assignedPlayerIds = eventData.assigned_player_ids as string[] | undefined
      if (assignedPlayerIds && assignedPlayerIds.length > 0) {
        targetPlayers = allPlayers.filter(p => assignedPlayerIds.includes(p.id))
      }
    } else if (event_type === 'mission_validate' || event_type === 'mission_fail') {
      // For mission completion, notify the winner/assigned player
      const targetId = payload.record.target_id
      if (targetId) {
        targetPlayers = allPlayers.filter(p => p.id === targetId)
      }
    }

    // Get push subscriptions - by user_id OR player_id
    const playerIds = targetPlayers.map(p => p.id)
    const userIds = targetPlayers.map(p => p.user_id).filter(Boolean) as string[]
    
    // Query subscriptions by player_id
    const { data: subsByPlayer } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('player_id', playerIds)
    
    // Query subscriptions by user_id (if any)
    let subsByUser: typeof subsByPlayer = []
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds)
      subsByUser = data || []
    }
    
    // Combine and dedupe by endpoint
    const allSubs = [...(subsByPlayer || []), ...subsByUser]
    const subscriptions = allSubs.filter((sub, index, self) => 
      index === self.findIndex(s => s.endpoint === sub.endpoint)
    )

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }


    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: `${notificationInfo.emoji} ${notificationInfo.title}`,
      body: notificationInfo.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `${game.code}-${event_type}`,
      data: {
        url: `/game/${game.code}`,
        gameCode: game.code,
        eventType: event_type
      }
    })

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }
          
          await webpush.sendNotification(pushSubscription, notificationPayload)
          return { success: true, endpoint: sub.endpoint }
        } catch (error) {
          console.error('[Push] Failed for:', sub.endpoint.slice(0, 50), error)
          
          // If subscription is invalid, delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return new Response(JSON.stringify({
      message: 'Push notifications sent',
      sent: successful,
      failed
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Push] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
