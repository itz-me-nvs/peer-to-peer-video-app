import express, { Request, Response } from "express";
import http from "http";
import { Server, Socket } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms: any = {}; // roomID => Set of socketIds

const PORT = 5000;
const HOST = process.env.HOST || "0.0.0.0"; // default to 0.0.0.0 for LAN access

app.get("/", (req: Request, res: Response) => {
  res.send("WebRTC Signaling Server is running.");
});

io.on("connection", (socket: Socket) => {
  console.log("socket", socket.id);

  socket.on(
    "join-room",
    ({ roomID, userName }: { roomID: string; userName: string }) => {
      console.log("roomID", roomID, "userName", userName);

      let clientsInRoom = io.sockets.adapter.rooms.get(roomID);
      console.log("clientsInRoom", clientsInRoom);

      let numClients = clientsInRoom ? clientsInRoom.size : 0;
      console.log("numClients", numClients);

      // notify the user if the room is full
      if (numClients > 2) {
        socket.emit("room-full", { isRoomFull: true });
        console.log("❌ Room is full");
        return;
      }

      if (!rooms[roomID]) rooms[roomID] = new Set();
      const existingUsers = Array.from(rooms[roomID]);
      rooms[roomID].add(socket.id);
      socket.join(roomID);

      // Notify the new user with existing user IDs
      socket.emit("user-joined", {
        socketId: socket.id,
        existingUsers,
      });

      // Notify other users about the new user
      socket.to(roomID).emit("new-user", socket.id);

      socket.on("signal", (data) => {
        console.log("signal", data);

        io.to(data.to).emit("signal", {
          from: socket.id,
          signal: data.signal,
        });
      });

      socket.on("disconnect", () => {
        for (const roomId in rooms) {
          if (rooms[roomId].has(socket.id)) {
            rooms[roomId].delete(socket.id);
            socket.to(roomId).emit("user-left", socket.id);

            if (rooms[roomId].size === 0) {
              delete rooms[roomId];
            }

            break;
          }
        }

        socket.to(roomID).emit("user-left", socket.id);
      });
    }
  );
});

server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});
