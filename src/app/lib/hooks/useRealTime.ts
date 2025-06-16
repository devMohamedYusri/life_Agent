// app/hooks/useRealtime.ts
import { useEffect, useState } from 'react';
import { client } from '../supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

// interface RealtimePayload<T extends JsonObject> {
//   eventType: 'INSERT' | 'UPDATE' | 'DELETE';
//   new: T | null;
//   old: T | null;
//   schema: string;
//   table: string;
//   commitTimestamp: string;
// }

export function useRealTime<T extends JsonObject>(
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

export function useRealTimeSync<T extends JsonObject>(
  table: string,
  filter: string,
  onInsert?: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void
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
        (payload: RealtimePostgresChangesPayload<T>) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new as T);
              break;
            case 'UPDATE':
              onUpdate?.(payload.new as T);
              break;
            case 'DELETE':
              onDelete?.(payload.old as T);
              break;
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      if (channel) {
        client.removeChannel(channel);
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete]);

  return channel;
}