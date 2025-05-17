import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const navigate = useNavigate();

  const joinRoom = () => {
    if (name && room) {
      navigate(`/room/${room}`, { state: { name } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-8 shadow-lg space-y-6">
        <h1 className="text-3xl font-bold text-center text-white">Welcome to Video Chat</h1>
        <p className="text-center text-gray-400">Enter your name and a room ID to start</p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={joinRoom}
            disabled={!name || !room}
            className={`w-full py-2 rounded-lg transition font-medium ${
              name && room
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
