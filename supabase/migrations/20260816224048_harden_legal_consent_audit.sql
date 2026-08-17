-- Keep legal-consent audit rows server-controlled and make current legal versions
-- part of the cloud-health gate. Browser clients retain read access to their own
-- row, but cannot directly insert or rewrite audit timestamps/withdrawal state.

create or replace function public.capture_bixbo_signup_legal_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent jsonb := new.raw_user_meta_data -> 'bixbo_legal_consent';
  accepted_at timestamptz := now();
begin
  if consent is null
     or consent ->> 'termsAccepted' <> 'true'
     or consent ->> 'privacyAcknowledged' <> 'true'
     or consent ->> 'healthConsent' <> 'true'
     or consent ->> 'termsVersion' <> '2026-08-16'
     or consent ->> 'privacyVersion' <> '2026-08-16'
     or consent ->> 'healthConsentVersion' <> '2026-08-16' then
    return new;
  end if;

  insert into public.user_legal_consents (
    user_id,
    terms_version,
    terms_accepted_at,
    privacy_version,
    privacy_acknowledged_at,
    health_consent_version,
    health_consent_at,
    health_consent_withdrawn_at,
    updated_at
  ) values (
    new.id,
    '2026-08-16',
    accepted_at,
    '2026-08-16',
    accepted_at,
    '2026-08-16',
    accepted_at,
    null,
    accepted_at
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.capture_bixbo_signup_legal_consent() from public, anon, authenticated;

drop policy if exists "users_insert_own_legal_consent" on public.user_legal_consents;
drop policy if exists "users_update_own_legal_consent" on public.user_legal_consents;
revoke insert, update on public.user_legal_consents from authenticated;

grant select on public.user_legal_consents to authenticated;

create or replace function private.bixbo_health_consent_active(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_legal_consents consent
    where consent.user_id = target_user
      and consent.terms_version = '2026-08-16'
      and consent.privacy_version = '2026-08-16'
      and consent.health_consent_version = '2026-08-16'
      and consent.health_consent_withdrawn_at is null
  );
$$;

revoke all on function private.bixbo_health_consent_active(uuid) from public, anon;
grant execute on function private.bixbo_health_consent_active(uuid) to authenticated, service_role;
