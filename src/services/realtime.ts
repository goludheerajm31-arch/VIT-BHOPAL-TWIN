import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storage } from './storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { User } from '../types';

/**
 * ============================================================================
 * SUPABASE REALTIME STREAMING ARCHITECTURE (PHASE 5)
 * ============================================================================
 * Manages live PostgreSQL table changes streamed via Supabase Realtime WebSockets:
 * 1. Public Channel ('campus_public_stream'):
 *    - Events (INSERT, UPDATE, DELETE) -> instant live campus feed updates
 *    - Announcements (INSERT, UPDATE, DELETE) -> instant live notice updates
 *    - Campus Guides (INSERT, UPDATE, DELETE) -> instant guide updates
 *    - Faculty (INSERT, UPDATE, DELETE) -> live cabin status & consultation updates
 *    - Locations (INSERT, UPDATE, DELETE) -> live campus building & place updates
 *    - Publishers (INSERT, UPDATE, DELETE) -> live publisher profile updates
 * 2. Private User Channel ('user_private_stream_${userId}'):
 *    - Scoped strictly to authenticated user's session
 *    - Saved Items (INSERT, DELETE) -> synchronized bookmarks
 *    - Subscribed only on sign-in and immediately unsubscribed on sign-out
 * 3. Lifecycle & Failure Resilience:
 *    - Graceful reconnection with exponential backoff (max 5 retries, capped at 30s)
 *    - Network online/offline recovery listeners
 *    - Zero duplicate channels or memory leaks
 * ============================================================================
 */

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

class RealtimeClient {
  private publicChannel: RealtimeChannel | null = null;
  private userChannel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;
  private listeners: Set<(status: RealtimeStatus) => void> = new Set();
  private currentStatus: RealtimeStatus = 'disconnected';
  private reconnectTimeout: any = null;
  private retryCount = 0;
  private isOnlineListenerAttached = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.currentStatus === 'disconnected') {
          this.retryCount = 0;
          this.connect();
        }
      });
      this.isOnlineListenerAttached = true;
    }
  }

  /**
   * Initializes public stream subscription.
   */
  connect() {
    if (typeof window === 'undefined') return;

    if (!isSupabaseConfigured() || !supabase) {
      this.setStatus('disconnected');
      return;
    }

    // Reuse channel if already active or connecting
    if (this.publicChannel) return;

    this.setStatus('connecting');

    try {
      this.publicChannel = supabase
        .channel('campus_public_stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          (payload) => {
            storage.handleRealtimeEvent({
              table: 'events',
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
            storage.handleRealtimeEvent({
              table: 'announcements',
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
            storage.handleRealtimeEvent({
              table: 'campus_guides',
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
            storage.handleRealtimeEvent({
              table: 'faculty',
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
            storage.handleRealtimeEvent({
              table: 'locations',
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
            storage.handleRealtimeEvent({
              table: 'publishers',
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            this.retryCount = 0;
            this.setStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.setStatus('disconnected');
            this.scheduleReconnect();
          } else if (err) {
            console.warn('[Supabase Realtime] Channel status warning:', err);
            this.setStatus('disconnected');
            this.scheduleReconnect();
          }
        });
    } catch (err) {
      console.warn('[Supabase Realtime] Connect error:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Synchronizes user-specific private subscriptions with the authenticated user session.
   */
  syncAuth(user: User | null) {
    if (typeof window === 'undefined' || !supabase) return;

    const newUserId = user?.id || null;

    // If user hasn't changed, keep active subscription
    if (this.currentUserId === newUserId && this.userChannel) {
      return;
    }

    // 1. Clean up old user channel if user switched or logged out
    if (this.userChannel) {
      supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }

    this.currentUserId = newUserId;

    // 2. If logged in, create private authenticated subscription for saved_items
    if (newUserId && isSupabaseConfigured()) {
      try {
        this.userChannel = supabase
          .channel(`user_private_stream_${newUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'saved_items',
              filter: `user_id=eq.${newUserId}`,
            },
            (payload) => {
              storage.handleRealtimeEvent({
                table: 'saved_items',
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old,
              });
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[Supabase Realtime] User private channel subscription error:', err);
      }
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);

    // Limit backoff retries to prevent aggressive loops
    if (this.retryCount >= 5) {
      console.info('[Supabase Realtime] Max reconnect attempts reached. Waiting for next user action or network restore.');
      return;
    }

    this.retryCount++;
    const delayMs = Math.min(2000 * Math.pow(1.5, this.retryCount), 30000);

    this.reconnectTimeout = setTimeout(() => {
      if (this.publicChannel && supabase) {
        supabase.removeChannel(this.publicChannel);
        this.publicChannel = null;
      }
      this.connect();
    }, delayMs);
  }

  /**
   * Completely tears down all channels and timers (for logout or component unmount).
   */
  disconnect() {
    clearTimeout(this.reconnectTimeout);
    this.retryCount = 0;

    if (supabase) {
      if (this.publicChannel) {
        supabase.removeChannel(this.publicChannel);
        this.publicChannel = null;
      }
      if (this.userChannel) {
        supabase.removeChannel(this.userChannel);
        this.userChannel = null;
      }
    }

    this.currentUserId = null;
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
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn('[RealtimeClient] Status callback error:', err);
      }
    });
  }
}

export const realtimeClient = new RealtimeClient();
