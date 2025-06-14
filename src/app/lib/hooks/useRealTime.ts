// app/hooks/useRealtime.ts
import { useEffect } from 'react';
import { client } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

interface RealtimePayload<T extends JsonObject> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  schema: string;
  table: string;
  commitTimestamp: string;
}

export function useRealtimeUpdates<T extends JsonObject>(
  table: string, 
  callback: (payload: RealtimePayload<T>) => void
) {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = client
      .channel(`${table}_changes`)
      .on<T>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as T | null,
            old: payload.old as T | null,
            schema: payload.schema,
            table: payload.table,
            commitTimestamp: payload.commit_timestamp
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, table, callback]);
}