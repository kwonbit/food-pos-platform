import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (url.protocol !== "http:" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export const supabase =
  isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
