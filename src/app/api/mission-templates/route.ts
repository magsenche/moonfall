import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// GET - List all mission templates (global)
export async function GET() {
  const { data: templates, error } = await supabase
    .from('mission_templates')
    .select('*')
    .eq('is_global', true)
    .eq('is_active', true)
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des templates' }, { status: 500 });
  }

  // Group by category for easier frontend consumption
  const byCategory: Record<string, typeof templates> = {};
  for (const template of templates || []) {
    const cat = template.category;
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(template);
  }

  return NextResponse.json({
    templates: templates || [],
    byCategory,
  });
}
