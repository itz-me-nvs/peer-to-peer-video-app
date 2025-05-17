import { io } from 'socket.io-client';
const socket = io('ws://localhost:5000', {
  transports: ['websocket'], // enforce WebSocket only - import.meta.env.VITE_SOCKET_URL
  secure: true
});
export default socket;