-- Run once in your Supabase project's SQL Editor. No account/password values here.
create table if not exists public.luminous_documents (
  key text primary key check (key in ('content', 'account')),
  document jsonb not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
alter table public.luminous_documents enable row level security;
revoke all on public.luminous_documents from public, anon, authenticated;
grant select, insert, update on public.luminous_documents to service_role;

-- Atomic compare-and-swap prevents multiple Vercel instances overwriting edits.
create or replace function public.luminous_save_document(
  p_key text, p_document jsonb, p_expected_version bigint
) returns setof public.luminous_documents
language plpgsql security invoker set search_path = public as $$
begin
  if p_key not in ('content', 'account') or p_expected_version < 0 then
    raise exception 'Invalid document';
  end if;
  if p_expected_version = 0 then
    return query insert into public.luminous_documents(key, document, version)
      values(p_key, p_document, 1) on conflict (key) do nothing returning *;
  else
    return query update public.luminous_documents
      set document = p_document, version = version + 1, updated_at = now()
      where key = p_key and version = p_expected_version returning *;
  end if;
end;
$$;
revoke all on function public.luminous_save_document(text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.luminous_save_document(text, jsonb, bigint) to service_role;

-- Private bucket; images are delivered through the authenticated server's /media route.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('luminous-media', 'luminous-media', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
