import { createClient } from "@supabase/supabase-js";

export const AUTH_COOKIE = "complyra_session";

export type AuthProvider = "mock" | "supabase";

type LoginResult = {
  ok: boolean;
  message?: string;
};

export async function authenticate(
  provider: AuthProvider,
  email: string,
  password: string
): Promise<LoginResult> {
  if (provider === "mock") {
    const expectedEmail = process.env.MOCK_AUTH_EMAIL ?? process.env.COMPLYRA_MOCK_AUTH_EMAIL ?? "demo@complyra.local";
    const expectedPassword = process.env.MOCK_AUTH_PASSWORD ?? process.env.COMPLYRA_MOCK_AUTH_PASSWORD ?? "complyra123";

    if (email.toLowerCase() !== expectedEmail.toLowerCase() || password !== expectedPassword) {
      return { ok: false, message: "Invalid mock credentials." };
    }

    return { ok: true };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      ok: false,
      message: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const client = createClient(url, key);
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
