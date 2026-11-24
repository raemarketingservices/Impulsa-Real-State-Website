-- Target schema for a future Supabase adapter. This app currently runs on SQLite.
-- Execute only in a new Supabase project; provision Auth users separately.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'agent' check(role in ('super_admin','admin','agent')),
  agent_id text,
  active boolean not null default true
);
create function public.current_role() returns text language sql stable security definer set search_path = public as $$ select role from public.profiles where id=auth.uid() and active=true $$;
create function public.current_agent() returns text language sql stable security definer set search_path = public as $$ select agent_id from public.profiles where id=auth.uid() and active=true $$;
create table public.records (
 kind text not null check(kind in ('properties','agents','owners','leads','locations','projects','courses','lessons','settings','applications','activities','files','progress')),
 id text not null,
 data jsonb not null,
 primary key(kind,id)
);
create index records_agent_idx on public.records ((data->>'agentId'));
create index records_city_idx on public.records ((data->>'city')) where kind='properties';
create index records_stage_idx on public.records ((data->>'stage')) where kind='leads';
create unique index property_code_unique on public.records ((data->>'code')) where kind='properties';
create sequence public.property_number start 1;
create function public.assign_property_code() returns trigger language plpgsql set search_path=public as $$
begin
 if new.kind='properties' then new.data=jsonb_set(new.data,'{code}',to_jsonb('IMP-'||lpad(nextval('public.property_number')::text,6,'0'))); end if;
 return new;
end; $$;
create trigger property_code before insert on public.records for each row execute function public.assign_property_code();
create table public.audit(id bigint generated always as identity primary key,user_id uuid,action text,kind text,record_id text,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create function public.record_audit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit(user_id,action,kind,record_id,before_data,after_data) values(auth.uid(),TG_OP,coalesce(new.kind,old.kind),coalesce(new.id,old.id),case when TG_OP<>'INSERT' then old.data end,case when TG_OP<>'DELETE' then new.data end);
 return coalesce(new,old);
end; $$;
create trigger records_audit after insert or update or delete on public.records for each row execute function public.record_audit();
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.audit enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.current_role() in ('admin','super_admin'));
create policy profile_manage on public.profiles for all to authenticated using(public.current_role()='super_admin') with check(public.current_role()='super_admin');
create policy admin_records on public.records for all to authenticated using(public.current_role() in ('admin','super_admin')) with check(public.current_role() in ('admin','super_admin'));
create policy agent_own_read on public.records for select to authenticated using(public.current_role()='agent' and ((kind in ('properties','leads','owners','activities') and data->>'agentId'=public.current_agent()) or (kind='progress' and data->>'userId'=auth.uid()::text) or (kind in ('agents','locations','projects')) or (kind='courses' and (data->>'published')::boolean=true)));
create policy agent_own_write on public.records for insert to authenticated with check(public.current_role()='agent' and kind in ('properties','leads','owners','activities') and data->>'agentId'=public.current_agent() and (kind<>'properties' or data->>'state' in ('Borrador','En revisión','Disponible','Reservada')));
create policy agent_own_update on public.records for update to authenticated using(public.current_role()='agent' and kind in ('properties','leads','owners','activities') and data->>'agentId'=public.current_agent()) with check(public.current_role()='agent' and kind in ('properties','leads','owners','activities') and data->>'agentId'=public.current_agent() and (kind<>'properties' or data->>'state' in ('Borrador','En revisión','Disponible','Reservada')));
-- Public catalog, inquiry creation, quiz grading, and lesson delivery must pass through
-- the future server adapter, which strips private owner IDs and quiz answer keys.
-- There is deliberately no anonymous write policy or direct client progress write policy.
create policy audit_admin_read on public.audit for select to authenticated using(public.current_role() in ('admin','super_admin'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 select name,name,false,26214400,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4'] from unnest(array['training-pdfs','training-images','training-videos','property-images','property-videos','property-documents','agent-avatars','agent-files']) name;
create policy private_files_read on storage.objects for select to authenticated using(public.current_role() in ('admin','super_admin') or (public.current_role()='agent' and ((storage.foldername(name))[1]=auth.uid()::text or bucket_id in ('training-pdfs','training-images','training-videos'))));
create policy private_files_insert on storage.objects for insert to authenticated with check(public.current_role() in ('admin','super_admin') or (public.current_role()='agent' and (storage.foldername(name))[1]=auth.uid()::text and bucket_id in ('property-images','property-videos','property-documents','agent-avatars','agent-files')));
commit;
