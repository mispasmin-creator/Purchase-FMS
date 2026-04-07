import { useEffect, useRef } from "react";
import { supabase } from "../supabase";

/**
 * useRealtime - A reusable hook that subscribes to Supabase Realtime changes
 * for one or more tables and calls a callback whenever a change occurs.
 *
 * @param {string|string[]} tables - Table name or array of table names to listen to
 * @param {function} onChangeCallback - Function to call when any change is detected
 * @param {boolean} [enabled=true] - Whether the subscription is active
 */
export function useRealtime(tables, onChangeCallback, enabled = true) {
  const callbackRef = useRef(onChangeCallback);

  // Keep the callback ref up to date without resetting the subscription
  useEffect(() => {
    callbackRef.current = onChangeCallback;
  }, [onChangeCallback]);

  useEffect(() => {
    if (!enabled) return;

    const tableList = Array.isArray(tables) ? tables : [tables];
    const channelName = `realtime-hook-${tableList.join("-")}-${Date.now()}`;

    let channel = supabase.channel(channelName);

    tableList.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          callbackRef.current(payload);
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Subscribed to: ${tableList.join(", ")}`);
      }
    });

    return () => {
      console.log(`[Realtime] Unsubscribing from: ${tableList.join(", ")}`);
      supabase.removeChannel(channel);
    };
  }, [tables, enabled]);
}
