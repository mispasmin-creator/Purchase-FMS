import { useEffect, useRef, useMemo } from "react";
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
  const debounceTimerRef = useRef(null);

  // Keep the callback ref up to date without resetting the subscription
  useEffect(() => {
    callbackRef.current = onChangeCallback;
  }, [onChangeCallback]);

  // Memoize the table list to prevent re-subscriptions on every render
  const tableList = useMemo(() => {
    const list = Array.isArray(tables) ? tables : [tables];
    return [...list].sort(); // Sort to ensure stability
  }, [JSON.stringify(tables)]);

  useEffect(() => {
    if (!enabled) return;

    // Use a stable channel name based on the table list
    const channelName = `realtime-hook-${tableList.join("-")}`;
    
    console.log(`[Realtime] Setting up subscription for: ${tableList.join(", ")}`);
    let channel = supabase.channel(channelName);

    tableList.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          console.log(`[Realtime] Change detected in ${table}:`, payload.eventType);
          
          // Internal debounce: wait 800ms before calling the callback
          // This handles rapid multiple events (like batch updates) efficiently
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            callbackRef.current(payload);
          }, 800);
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Subscribed to: ${tableList.join(", ")}`);
      }
      if (status === "CLOSED") {
        console.log(`[Realtime] Subscription closed for: ${tableList.join(", ")}`);
      }
      if (status === "CHANNEL_ERROR") {
        console.error(`[Realtime] Subscription error for: ${tableList.join(", ")}`);
      }
    });

    return () => {
      console.log(`[Realtime] Unsubscribing from: ${tableList.join(", ")}`);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [tableList, enabled]);
}
