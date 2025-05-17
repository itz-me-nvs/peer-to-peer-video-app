import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {origin: '*',  methods: ['GET', 'POST']}});

const PORT = 5000;
const HOST = process.env.HOST || '0.0.0.0'; // default to 0.0.0.0 for LAN access


app.get('/', (req: Request, res: Response)=> {
  res.send('WebRTC Signaling Server is running.')
})


io.on('connection', (socket: Socket)=> {
  console.log('socket', socket.id);

 
  socket.on('join-room', ({ roomID, userName }: { roomID: string; userName: string })=> {
    console.log('roomID', roomID, 'userName', userName);

    let clientsInRoom = io.sockets.adapter.rooms.get(roomID);
    console.log('clientsInRoom', clientsInRoom);
    
    let numClients = clientsInRoom ? clientsInRoom.size : 0;
    console.log('numClients', numClients);

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

     socket.on('signal', data => {
      console.log("signal", data);
      
      io.to(data.to).emit('signal', {
        from: socket.id,
        signal: data.signal,
      });
    });

    socket.on('disconnect', () => {
      socket.to(roomID).emit('user-left', socket.id);
    });

  })
})


server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});