import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Alert } from '../shared/schema';

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected. Total clients:', wss.clients.size);

    ws.send(JSON.stringify({ type: 'connection', message: 'Connected to Vitals-Vision AI WebSocket' }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'camera_frame') {
          if (typeof msg.frame !== 'string' || !msg.frame.startsWith('data:image/') || msg.frame.length > 500000) {
            return;
          }
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'camera_frame',
                frame: msg.frame,
                deviceId: String(msg.deviceId || '').substring(0, 50),
                timestamp: msg.timestamp,
              }));
            }
          });
          return;
        }

        if (msg.type === 'camera_status') {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'camera_status',
                status: msg.status,
                deviceId: msg.deviceId,
              }));
            }
          });
          return;
        }

        console.log('[WS] Received:', msg.type);
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected. Total clients:', wss.clients.size);
    });
  });

  console.log('[WS] WebSocket server ready at /ws');
}

export function broadcastAlert(alert: Alert) {
  if (!wss) return;
  const message = JSON.stringify({
    type: 'new_alert',
    alert: {
      id: alert.id,
      alertType: alert.alertType,
      timestamp: alert.timestamp,
      confidenceScore: alert.confidenceScore,
      status: alert.status,
      isHighPriority: alert.isHighPriority,
      patientId: alert.patientId,
      roomNumber: alert.roomNumber,
      bodyPosition: alert.bodyPosition,
      detectionSource: alert.detectionSource,
    },
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastAlertResolved(alertId: number) {
  if (!wss) return;
  const message = JSON.stringify({
    type: 'alert_resolved',
    alertId,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastToAll(payload: object) {
  if (!wss) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
