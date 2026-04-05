-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (mirrors Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  notification_email text,
  created_at timestamptz default now()
);

-- Mailboxes connected via IMAP
create table public.mailboxes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  email_address text not null,
  password text not null,
  imap_host text not null,
  imap_port integer default 993,
  last_scanned_at timestamptz,
  created_at timestamptz default now()
);

-- Detected replies
create table public.replies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  mailbox_id uuid references public.mailboxes(id) on delete cascade,
  message_id text not null unique,
  thread_id text,
  from_email text,
  from_name text,
  subject text,
  snippet text,
  body text,
  received_at timestamptz,
  is_positive boolean default false,
  ai_reasoning text,
  notified boolean default false,
  created_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.mailboxes enable row level security;
alter table public.replies enable row level security;

create policy "Users see own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users see own accounts" on public.mailboxes for all using (auth.uid() = user_id);
create policy "Users see own replies" on public.replies for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, notification_email)
  values (new.id, new.email, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
