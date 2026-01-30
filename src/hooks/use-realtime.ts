"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (payload: unknown) => void;
  onUpdate?: (payload: unknown) => void;
  onDelete?: (payload: unknown) => void;
}

export function useRealtime({
  table,
  schema = "public",
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    const setupChannel = () => {
      const channelConfig: Record<string, unknown> = {
        event: "*",
        schema,
        table,
      };

      if (filter) {
        channelConfig.filter = filter;
      }

      channel = supabase
        .channel(`${table}-changes`)
        .on(
          "postgres_changes" as never,
          channelConfig as never,
          (payload: { eventType: string; new: unknown; old: unknown }) => {
            switch (payload.eventType) {
              case "INSERT":
                onInsert?.(payload.new);
                break;
              case "UPDATE":
                onUpdate?.(payload.new);
                break;
              case "DELETE":
                onDelete?.(payload.old);
                break;
            }
          }
        )
        .subscribe();
    };

    setupChannel();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [table, schema, filter, onInsert, onUpdate, onDelete]);
}

export function useGrievanceRealtime(
  grievanceId: string,
  callbacks: {
    onMessageInsert?: (message: unknown) => void;
    onNoteInsert?: (note: unknown) => void;
    onStepUpdate?: (step: unknown) => void;
  }
) {
  useRealtime({
    table: "grievance_messages",
    filter: `grievance_id=eq.${grievanceId}`,
    onInsert: callbacks.onMessageInsert,
  });

  useRealtime({
    table: "grievance_notes",
    filter: `grievance_id=eq.${grievanceId}`,
    onInsert: callbacks.onNoteInsert,
  });

  useRealtime({
    table: "grievance_steps",
    filter: `grievance_id=eq.${grievanceId}`,
    onUpdate: callbacks.onStepUpdate,
  });
}
