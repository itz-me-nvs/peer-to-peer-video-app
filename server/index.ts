import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {origin: 'http://localhost:5173',  methods: ['GET', 'POST']}});

const PORT = 5000;
const HOST = process.env.HOST || '0.0.0.0'; // default to 0.0.0.0 for LAN access


app.get('/', (req: Request, res: Response)=> {
  res.send('Hello World')
})


io.on('connection', (socket)=> {
  console.log('socket', socket.id);

 
  socket.on('join-room', (roomID, userName)=> {
    console.log('roomID', roomID, userName);

     socket.emit('test', {message: 'hello'})

    socket.join(roomID);
    socket.to(roomID).emit('user-joined', {
      socketId: socket.id,
      userName
    })

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