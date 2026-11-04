
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Coalesce only requests that are identical and in flight at the same time.
// This does not cache responses, so every later refresh still reads fresh data.
const inFlightReads = new Map();

const deduplicatedFetch = (input, init) => {
  const hasCallerSignal = Boolean(init?.signal) || input instanceof Request;
  const request = new Request(input, init);
  if (request.method !== "GET" || hasCallerSignal) return fetch(request);

  const headers = Array.from(request.headers.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value}`)
    .join("\n");
  const key = `${request.method} ${request.url}\n${headers}`;

  let pending = inFlightReads.get(key);
  if (!pending) {
    pending = fetch(request).finally(() => inFlightReads.delete(key));
    inFlightReads.set(key, pending);
  }

  // Each Supabase caller must receive its own readable response body.
  return pending.then((response) => response.clone());
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: deduplicatedFetch },
});
