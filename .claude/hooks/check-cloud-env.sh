#!/bin/bash
# SessionStart (sessions cloud uniquement) : signale tout de suite un lancement
# sur le mauvais environnement, au lieu de le découvrir au premier appel Supabase.
# Warnings seulement — ne bloque jamais la session.

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "⚠️  NEXT_PUBLIC_SUPABASE_URL absente : session probablement lancée sur" \
    "l'environnement par défaut au lieu de « Moonfall »." \
    "Voir .claude/rules/sessions-cloud.md."
  exit 0
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" 2>/dev/null)
case "$code" in
  200|401) echo "✅ Env cloud Moonfall OK : Supabase joignable ($code)." ;;
  *) echo "⚠️  Supabase injoignable (code '$code') : politique réseau de" \
    "l'environnement ? Voir .claude/rules/sessions-cloud.md — ne pas contourner." ;;
esac
exit 0
