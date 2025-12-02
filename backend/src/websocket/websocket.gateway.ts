import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/user',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove socket from user rooms
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join user's private room
   */
  joinUserRoom(socketId: string, userId: string) {
    const room = `user:${userId}`;
    this.server.sockets.sockets.get(socketId)?.join(room);
    
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  /**
   * Leave user's private room
   */
  leaveUserRoom(socketId: string, userId: string) {
    const room = `user:${userId}`;
    this.server.sockets.sockets.get(socketId)?.leave(room);
    
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit balance update
   */
  emitBalanceUpdate(userId: string, balance: string) {
    this.emitToUser(userId, 'balance:update', {
      balance,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit level up
   */
  emitLevelUp(userId: string, data: any) {
    this.emitToUser(userId, 'level:up', data);
  }

  /**
   * Emit reward claimed
   */
  emitRewardClaimed(userId: string, type: string, amount: string) {
    this.emitToUser(userId, 'reward:claimed', {
      type,
      amount,
      timestamp: new Date().toISOString(),
    });
  }
}

