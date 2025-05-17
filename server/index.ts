import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

// Express app and HTTP server setup
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS support
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Constants
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Default to LAN-safe binding

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send('WebRTC Signaling Server is running.');
});

// Handle socket connection
io.on('connection', (socket: Socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  socket.on('join-room', ({ roomID, userName }: { roomID: string; userName: string }) => {
    const clientsInRoom = io.sockets.adapter.rooms.get(roomID);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;

    console.log(`📥 ${userName} is trying to join room ${roomID}`);
    console.log(`👥 Current clients in room: ${numClients}`);

    if (numClients >= 2) {
      socket.emit('room-full', { isRoomFull: true });
      console.log('❌ Room is full');
      return;
    }

    socket.join(roomID);

    if (numClients === 1) {
      // Notify the first client that a second user has joined
      socket.to(roomID).emit('user-joined', {
        socketId: socket.id,
        userName,
      });
      console.log(`✅ ${userName} joined room ${roomID} and notified existing peer`);
    } else {
      console.log(`✅ ${userName} joined room ${roomID}`);
    }

    // Handle WebRTC signaling
    socket.on('signal', ({ to, signal }: { to: string; signal: any }) => {
      console.log(`📡 Signal from ${socket.id} to ${to}`);
      io.to(to).emit('signal', {
        from: socket.id,
        signal
      });
    });

    // Notify other clients on disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);
      socket.to(roomID).emit('user-left', socket.id);
    });
  });
});

// Start the server
server.listen(PORT, HOST as any, () => {
  console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
});
