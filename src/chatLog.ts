/**
 * Supabase chat logging — fire-and-forget insert of every exchange.
 * Uses the Supabase REST API directly to avoid adding the full SDK.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export interface ChatLogEntry {
  question: string;
  answer: string;
  mode: "online" | "offline";
  language: "en" | "fil";
  timestamp: string;
  boat_id: string;
}

/**
 * Logs a chat exchange to Supabase. Fails silently — logging should never
 * block or break the user experience.
 */
export async function logChatExchange(entry: ChatLogEntry): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return; // Not configured yet

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(entry),
    });
  } catch {
    // Silent fail — logging is best-effort
  }
}
