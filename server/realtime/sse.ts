import { Response } from 'express';

export interface RealtimeMessage {
  type: string;
  data?: any;
  timestamp: string;
}

class RealtimeHub {
  private clients: Set<Response> = new Set();

  addClient(res: Response) {
    this.clients.add(res);

    // Send initial connected confirmation
    this.sendToClient(res, {
      type: 'CONNECTED',
      data: { connectedClients: this.clients.size },
      timestamp: new Date().toISOString(),
    });

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(type: string, data?: any) {
    const message: RealtimeMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    const payload = `data: ${JSON.stringify(message)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  private sendToClient(res: Response, message: RealtimeMessage) {
    try {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (e) {
      this.clients.delete(res);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const realtimeHub = new RealtimeHub();
