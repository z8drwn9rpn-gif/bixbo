-- Create table for Web Push subscriptions

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    endpoint text NOT NULL,

    p256dh text NOT NULL,

    auth text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions
ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
ON public.push_subscriptions(user_id);

CREATE POLICY "Users insert own push subscription"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
