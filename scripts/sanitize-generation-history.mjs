import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE_SIZE = 100;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function stripThinking(value) {
  return String(value ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/^\s*(<\|im_end\|>|<\|endoftext\|>)\s*$/gim, '')
    .trim();
}

let offset = 0;
let cleaned = 0;
let scanned = 0;

for (;;) {
  const { data, error } = await supabase
    .from('local_ai_jobs')
    .select('id,result,error_message')
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw error;
  if (!data?.length) break;
  scanned += data.length;

  for (const row of data) {
    const result = typeof row.result === 'string' ? stripThinking(row.result) : row.result;
    const errorMessage = typeof row.error_message === 'string' ? stripThinking(row.error_message) : row.error_message;
    if (result === row.result && errorMessage === row.error_message) continue;

    const { error: updateError } = await supabase
      .from('local_ai_jobs')
      .update({ result, error_message: errorMessage })
      .eq('id', row.id);
    if (updateError) throw updateError;
    cleaned += 1;
  }

  if (data.length < PAGE_SIZE) break;
  offset += PAGE_SIZE;
}

console.log(`Sanitized ${cleaned} of ${scanned} generation records.`);
