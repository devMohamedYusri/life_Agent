// app/hooks/useRealtime.ts
import { useEffect, useState } from 'react';
import { client } from '../supabase';
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

export function useRealTime<T>(
  table: string,
  filter: string,
  callback: (payload: T) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const newChannel = client
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          callback(payload.new as T);
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      if (channel) {
        client.removeChannel(channel);
      }
    };
  }, [table, filter, callback]);

  return channel;
}