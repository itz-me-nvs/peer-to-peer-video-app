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
    <div>
      <h1>Video Chat</h1>
      <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Room ID" value={room} onChange={e => setRoom(e.target.value)} />
      <button onClick={joinRoom}>Join</button>
    </div>
  );
}

export default LandingPage;
