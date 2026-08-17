-- Preserve the accepted legal versions even when an email confirmation link is
-- opened on another device. This trigger reads only the explicit consent
-- snapshot written by the BIXBO signup form. It does not touch health data.

alter table public.user_legal_consents
add column if not exists onboarding_completed_at timestamptz;

create or replace function public.capture_bixbo_signup_legal_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent jsonb := new.raw_user_meta_data -> 'bixbo_legal_consent';
  accepted_at timestamptz;
begin
  if consent is null
     or consent ->> 'termsAccepted' <> 'true'
     or consent ->> 'privacyAcknowledged' <> 'true'
     or consent ->> 'healthConsent' <> 'true'
     or nullif(consent ->> 'termsVersion', '') is null
     or nullif(consent ->> 'privacyVersion', '') is null
     or nullif(consent ->> 'healthConsentVersion', '') is null then
    return new;
  end if;

  begin
    accepted_at := coalesce(nullif(consent ->> 'stagedAt', '')::timestamptz, now());
  exception when others then
    accepted_at := now();
  end;

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
    consent ->> 'termsVersion',
    accepted_at,
    consent ->> 'privacyVersion',
    accepted_at,
    consent ->> 'healthConsentVersion',
    accepted_at,
    null,
    now()
  )
  on conflict (user_id) do update set
    terms_version = excluded.terms_version,
    terms_accepted_at = excluded.terms_accepted_at,
    privacy_version = excluded.privacy_version,
    privacy_acknowledged_at = excluded.privacy_acknowledged_at,
    health_consent_version = excluded.health_consent_version,
    health_consent_at = excluded.health_consent_at,
    health_consent_withdrawn_at = null,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.capture_bixbo_signup_legal_consent() from public, anon, authenticated;

drop trigger if exists bixbo_capture_signup_legal_consent on auth.users;
create trigger bixbo_capture_signup_legal_consent
after insert on auth.users
for each row execute function public.capture_bixbo_signup_legal_consent();
