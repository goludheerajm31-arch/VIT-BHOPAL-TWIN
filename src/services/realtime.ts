import { DATA_CHANGE_EVENT } from './storage';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<(status: RealtimeStatus) => void> = new Set();
  private currentStatus: RealtimeStatus = 'disconnected';
  private reconnectTimeout: any = null;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) return;

    this.setStatus('connecting');

    try {
      this.eventSource = new EventSource('/api/realtime/events');

      this.eventSource.onopen = () => {
        this.setStatus('connected');
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          // When any real-time mutation arrives, notify storage cache to refresh & notify UI
          window.dispatchEvent(
            new CustomEvent(DATA_CHANGE_EVENT, {
              detail: payload,
            })
          );
        } catch (err) {
          // Ignore heartbeat or non-json ping
        }
      };

      this.eventSource.onerror = () => {
        this.setStatus('disconnected');
        this.eventSource?.close();
        this.eventSource = null;

        // Auto reconnect after 3s
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 3000);
      };
    } catch (err) {
      this.setStatus('disconnected');
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimeout);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
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
