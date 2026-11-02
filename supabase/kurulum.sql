-- Robot Ev Oyunu — Supabase kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Birden fazla çalıştırmak güvenlidir.

-- 1) Tablo
create table if not exists public.task_logs (
  id             bigint generated always as identity primary key,
  oyuncu_kodu    text         not null check (char_length(oyuncu_kodu) between 4 and 40),
  komut          text         not null check (char_length(komut) between 1 and 200),
  basari         boolean      not null,
  kavrama_torku  numeric(6,2) not null check (kavrama_torku between 0 and 100),
  hata_yuzdesi   numeric(6,2) not null check (hata_yuzdesi between 0 and 100),
  kapak_torku    numeric(6,2)          check (kapak_torku is null or kapak_torku between 0 and 100),
  zaman          timestamptz  not null default now()
);

comment on table public.task_logs is 'Robot Ev Oyunu görev kayıtları. Kişisel bilgi yok; oyuncu_kodu rastgele üretilir.';

create index if not exists task_logs_zaman_idx on public.task_logs (zaman desc);

-- 2) Satır güvenliği (RLS) AÇIK
alter table public.task_logs enable row level security;

-- 3) Yetkiler: anonim kullanıcı yalnızca EKLEYEBİLİR ve OKUYABİLİR.
--    Silme ve güncelleme yetkisi hiç verilmez.
revoke all on public.task_logs from anon, authenticated;
grant select, insert on public.task_logs to anon, authenticated;

-- 4) Politikalar (eski kopyaları silip yeniden kurar)
drop policy if exists "anon ekleyebilir" on public.task_logs;
drop policy if exists "anon okuyabilir"  on public.task_logs;

create policy "anon ekleyebilir" on public.task_logs
  for insert to anon, authenticated
  with check (true);

create policy "anon okuyabilir" on public.task_logs
  for select to anon, authenticated
  using (true);

-- UPDATE ve DELETE için politika YOK => RLS bunları engeller (ayrıca yetki de yok).
