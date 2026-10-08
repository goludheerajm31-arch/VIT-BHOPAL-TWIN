import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DATA_CHANGE_EVENT } from './storage';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * ============================================================================
 * SUPABASE REALTIME STREAMING ARCHITECTURE
 * ============================================================================
 * NOTE: Live PostgreSQL table changes are streamed via Supabase Realtime.
 * Because authentication is intentionally being implemented in a subsequent phase,
 * realtime authorization is NOT currently a production security boundary.
 * RLS authorization on realtime channels will be enforced during the authentication phase.
 * ============================================================================
 */

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

class RealtimeClient {
  private supabaseChannel: RealtimeChannel | null = null;
  private listeners: Set<(status: RealtimeStatus) => void> = new Set();
  private currentStatus: RealtimeStatus = 'disconnected';
  private reconnectTimeout: any = null;

  connect() {
    if (typeof window === 'undefined') return;

    if (!isSupabaseConfigured() || !supabase) {
      this.setStatus('disconnected');
      return;
    }

    if (this.supabaseChannel) return;

    this.setStatus('connecting');

    try {
      this.supabaseChannel = supabase
        .channel('campus_realtime_stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          (payload) => {
            this.broadcastDataChange({
              type: `EVENT_${payload.eventType}`,
              table: 'events',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'locations' },
          (payload) => {
            this.broadcastDataChange({
              type: `LOCATION_${payload.eventType}`,
              table: 'locations',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'faculty' },
          (payload) => {
            this.broadcastDataChange({
              type: `FACULTY_${payload.eventType}`,
              table: 'faculty',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          (payload) => {
            this.broadcastDataChange({
              type: `ANNOUNCEMENT_${payload.eventType}`,
              table: 'announcements',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'publishers' },
          (payload) => {
            this.broadcastDataChange({
              type: `PUBLISHER_${payload.eventType}`,
              table: 'publishers',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'saved_items' },
          (payload) => {
            this.broadcastDataChange({
              type: `SAVED_${payload.eventType}`,
              table: 'saved_items',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campus_guides' },
          (payload) => {
            this.broadcastDataChange({
              type: `GUIDE_${payload.eventType}`,
              table: 'campus_guides',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('connected');
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            this.setStatus('disconnected');
            this.scheduleReconnect();
          } else if (err) {
            this.setStatus('disconnected');
            this.scheduleReconnect();
          }
        });
    } catch (err) {
      console.warn('[Supabase Realtime] Channel subscription error:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private broadcastDataChange(detail: any) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(DATA_CHANGE_EVENT, {
        detail,
      })
    );
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  disconnect() {
    clearTimeout(this.reconnectTimeout);
    if (this.supabaseChannel && supabase) {
      supabase.removeChannel(this.supabaseChannel);
      this.supabaseChannel = null;
    }
    this.setStatus('disconnected');
  }

  getStatus(): RealtimeStatus {
    return this.currentStatus;
  }

  onStatusChange(cb: (status: RealtimeStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentStatus);
    return () => this.listeners.delete(cb);
  }

  private setStatus(status: RealtimeStatus) {
    this.currentStatus = status;
    this.listeners.forEach((cb) => cb(status));
  }
}

export const realtimeClient = new RealtimeClient();
