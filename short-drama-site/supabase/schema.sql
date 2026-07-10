create extension if not exists pg_trgm;

create table if not exists platforms (
  id text primary key,
  slug text unique not null,
  name text not null,
  domain text unique not null,
  color text not null default '#d94f45',
  offline_note text not null default ''
);

create table if not exists dramas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_zh text not null default '',
  title_en text not null,
  title text,
  original_title text,
  synopsis text not null default '',
  description text,
  poster_url text not null default '',
  cover text,
  genre text[] not null default '{}',
  episode_count integer check (episode_count is null or episode_count > 0),
  episodes integer check (episodes is null or episodes > 0),
  country text not null default 'Global',
  language text not null default 'en',
  languages text[] not null default '{}',
  regions text[] not null default '{}',
  trending_score integer not null default 0,
  published boolean not null default false,
  search_document text generated always as (lower(title_zh || ' ' || title_en)) stored,
  updated_at timestamptz not null default now()
);

create index if not exists dramas_search_trgm on dramas using gin (search_document gin_trgm_ops);

create table if not exists drama_aliases (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references dramas(id) on delete cascade,
  value text not null,
  normalized_value text generated always as (lower(regexp_replace(value, '[[:space:][:punct:]]', '', 'g'))) stored,
  unique (drama_id, normalized_value)
);
create index if not exists aliases_search_trgm on drama_aliases using gin (normalized_value gin_trgm_ops);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references dramas(id) on delete cascade,
  platform_id text not null references platforms(id),
  platform text,
  url text unique not null check (url like 'https://%'),
  video_id text,
  play_type text not null default 'external' check (play_type in ('direct', 'embed', 'external', 'unavailable')),
  playback_status text not null default 'available' check (playback_status in ('available', 'login_required', 'expired', 'private')),
  quality_score integer not null default 70,
  last_check_time timestamptz not null default now(),
  language text not null default 'other',
  region text not null default 'Global',
  status text not null default 'active' check (status in ('active', 'limited', 'unavailable')),
  official boolean not null default false,
  published_at timestamptz,
  checked_at timestamptz not null default now(),
  source_proof text not null default ''
  ,content_type text check (content_type is null or content_type in ('full_series', 'episode'))
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references dramas(id) on delete cascade,
  platform text not null references platforms(id),
  url text unique not null check (url like 'https://%'),
  video_id text,
  play_type text not null default 'external' check (play_type in ('direct', 'embed', 'external', 'unavailable')),
  status text not null default 'available' check (status in ('available', 'login_required', 'expired', 'private')),
  quality_score integer not null default 70,
  last_check_time timestamptz not null default now()
);

create table if not exists subtitles (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  language text not null default 'zh-Hans',
  start_time numeric not null,
  end_time numeric not null,
  original_text text not null,
  translated_text text not null,
  source text not null check (source in ('captions', 'asr', 'ocr', 'cache')),
  confidence_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subtitles_video_time on subtitles (video_id, language, start_time);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  url text unique not null check (url like 'https://%'),
  title text,
  note text,
  contact text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists crawl_runs (
  id uuid primary key default gen_random_uuid(),
  platform_id text references platforms(id),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  discovered integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists personal_account_connections (
  id uuid primary key default gen_random_uuid(),
  platform_id text unique not null references platforms(id),
  mode text not null default 'manual' check (mode in ('guest', 'personal_account', 'manual')),
  account_label text,
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'expired', 'needs_action', 'disabled')),
  last_sync_time timestamptz,
  synced_drama_count integer not null default 0,
  failed_count integer not null default 0,
  login_required_count integer not null default 0,
  private_count integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table platforms enable row level security;
alter table dramas enable row level security;
alter table drama_aliases enable row level security;
alter table resources enable row level security;
alter table sources enable row level security;
alter table subtitles enable row level security;
alter table submissions enable row level security;
alter table crawl_runs enable row level security;
alter table personal_account_connections enable row level security;

create policy "public read platforms" on platforms for select using (true);
create policy "public read published dramas" on dramas for select using (published = true);
create policy "public read published aliases" on drama_aliases for select using (exists (select 1 from dramas where dramas.id = drama_id and dramas.published));
create policy "public read official resources" on resources for select using (official = true and status <> 'unavailable' and exists (select 1 from dramas where dramas.id = drama_id and dramas.published));
create policy "public read available sources" on sources for select using (status <> 'expired' and exists (select 1 from dramas where dramas.id = drama_id and dramas.published));
create policy "public read subtitles" on subtitles for select using (true);
create policy "public submit pending" on submissions for insert with check (status = 'pending');

insert into platforms (id, slug, name, domain, offline_note) values
  ('youtube', 'youtube', 'YouTube', 'youtube.com', '部分内容可通过 YouTube Premium 在官方应用内离线观看。'),
  ('reelshort', 'reelshort', 'ReelShort', 'reelshort.com', '请以 ReelShort 官方应用当前提供的离线能力为准。'),
  ('dramabox', 'dramabox', 'DramaBox', 'dramabox.com', '请在 DramaBox 官方应用内查看缓存与离线选项。'),
  ('netshort', 'netshort', 'NetShort', 'netshort.com', '请在 NetShort 官方应用内查看可用的离线方式。'),
  ('shortmax', 'shortmax', 'ShortMax', 'shortmax.app', '请以 ShortMax 官方应用当前提供的离线能力为准。'),
  ('goodshort', 'goodshort', 'GoodShort', 'goodshort.com', '请以 GoodShort 官方应用当前提供的离线能力为准。'),
  ('flextv', 'flextv', 'FlexTV', 'flextv.cc', '请以 FlexTV 官方应用当前提供的离线能力为准。'),
  ('dailymotion', 'dailymotion', 'Dailymotion', 'dailymotion.com', '仅展示 Dailymotion 官方页面提供的观看或离线选项。'),
  ('tiktok', 'tiktok', 'TikTok', 'tiktok.com', '仅展示 TikTok 官方应用当前允许的保存或离线观看选项。')
on conflict (id) do update set name = excluded.name, domain = excluded.domain, offline_note = excluded.offline_note;
