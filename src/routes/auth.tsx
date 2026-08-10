import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "BIXBO — Sign in" },
      { name: "description", content: "Sign in to sync your BIXBO diary across devices and share with your partner." },
      { property: "og:title", content: "BIXBO — Sign in" },
      { property: "og:description", content: "Sync BIXBO across devices and share with your partner." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!cancelled && data.session) navigate({ to: "/settings" });
      })
      .catch((error) => {
        if (!cancelled) setMsg(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { display_name: name || undefined } },
        });
        if (error) throw error;
        setMsg("Account created. If email confirmation is on, check your inbox — otherwise you're signed in.");
        setTimeout(() => navigate({ to: "/settings" }), 400);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/settings" });
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const startOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    setMsg(null);

    try {
      const redirectTo = `${window.location.origin}/auth`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error(`${provider === "google" ? "Google" : "Apple"} sign-in URL was not returned.`);

      window.location.assign(data.url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const google = () => void startOAuth("google");
  const apple = () => void startOAuth("apple");

  return (
    <AppShell title="Sign in" big>
      <div className="mx-auto max-w-sm space-y-4 px-5 pt-6 pb-24">
        <p className="text-sm text-muted-foreground">
          Sign in to keep your BIXBO diary safely in the cloud and share with your partner using a code.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("in")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${mode === "in" ? "bg-primary text-primary-foreground" : "bg-surface ring-1 ring-border"}`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("up")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${mode === "up" ? "bg-primary text-primary-foreground" : "bg-surface ring-1 ring-border"}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border">
          {mode === "up" && (
            <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "up" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
          Continue with Google
        </Button>

        <Button variant="outline" className="w-full" onClick={apple} disabled={busy}>
          Continue with Apple / iCloud
        </Button>

        {msg && <p className="text-sm text-destructive">{msg}</p>}

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground underline">
            Back to app
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
