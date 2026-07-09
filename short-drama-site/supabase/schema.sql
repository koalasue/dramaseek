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
  synopsis text not null default '',
  poster_url text not null default '',
  episode_count integer check (episode_count is null or episode_count > 0),
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
  url text unique not null check (url like 'https://%'),
  language text not null default 'other',
  region text not null default 'Global',
  status text not null default 'active' check (status in ('active', 'limited', 'unavailable')),
  official boolean not null default false,
  published_at timestamptz,
  checked_at timestamptz not null default now(),
  source_proof text not null default ''
  ,content_type text check (content_type is null or content_type in ('full_series', 'episode'))
);

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

alter table platforms enable row level security;
alter table dramas enable row level security;
alter table drama_aliases enable row level security;
alter table resources enable row level security;
alter table submissions enable row level security;
alter table crawl_runs enable row level security;

create policy "public read platforms" on platforms for select using (true);
create policy "public read published dramas" on dramas for select using (published = true);
create policy "public read published aliases" on drama_aliases for select using (exists (select 1 from dramas where dramas.id = drama_id and dramas.published));
create policy "public read official resources" on resources for select using (official = true and status <> 'unavailable' and exists (select 1 from dramas where dramas.id = drama_id and dramas.published));
create policy "public submit pending" on submissions for insert with check (status = 'pending');

insert into platforms (id, slug, name, domain, offline_note) values
  ('youtube', 'youtube', 'YouTube', 'youtube.com', '部分内容可通过 YouTube Premium 在官方应用内离线观看。'),
  ('reelshort', 'reelshort', 'ReelShort', 'reelshort.com', '请以 ReelShort 官方应用当前提供的离线能力为准。'),
  ('dramabox', 'dramabox', 'DramaBox', 'dramabox.com', '请在 DramaBox 官方应用内查看缓存与离线选项。'),
  ('netshort', 'netshort', 'NetShort', 'netshort.com', '请在 NetShort 官方应用内查看可用的离线方式。'),
  ('dailymotion', 'dailymotion', 'Dailymotion', 'dailymotion.com', '仅展示 Dailymotion 官方页面提供的观看或离线选项。'),
  ('tiktok', 'tiktok', 'TikTok', 'tiktok.com', '仅展示 TikTok 官方应用当前允许的保存或离线观看选项。')
on conflict (id) do update set name = excluded.name, domain = excluded.domain, offline_note = excluded.offline_note;
