create table if not exists public.cornerstone_telegram_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists cornerstone_telegram_messages_chat_created_idx
  on public.cornerstone_telegram_messages(chat_id, created_at desc);

alter table public.cornerstone_telegram_messages enable row level security;
