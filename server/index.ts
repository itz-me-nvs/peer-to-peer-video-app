import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {origin: '*',  methods: ['GET', 'POST']}});

const PORT = 5000;
const HOST = process.env.HOST || '0.0.0.0'; // default to 0.0.0.0 for LAN access


app.get('/', (req: Request, res: Response)=> {
  res.send('Hello World')
})


io.on('connection', (socket)=> {
  console.log('socket', socket.id);

 
  socket.on('join-room', (data)=> {
    console.log('roomID', data);

    const roomID = data.roomID;
    const userName = data.userName;

    let clientsInRoom = io.sockets.adapter.rooms.get(roomID);
    console.log('clientsInRoom', clientsInRoom);
    
    let numClients = clientsInRoom ? clientsInRoom.size : 0;
    console.log('numClients', numClients);

    if(numClients == 0){
        socket.join(roomID);
    }
    else if(numClients == 1){
       //this message ("join") will be received only by the first client since the client has not joined the room yet
       socket.in(roomID).emit('user-joined', {
      socketId: socket.id,
      userName
    })

      socket.join(roomID);
    }
    
    if(numClients >= 2) {
      socket.emit('room-full', {isRoomFull: true});
      return;
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