import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../lib/socket";

const configuration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};


interface UserJoinedPayload {
  socketID: string;
}

interface SignalData {
  from: string;
  signal: {
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}

const RoomPage = () => {
  const { roomId } = useParams();
  console.log('roomId', roomId)
//   const { state } = useLocation();
//   const { name } = state as LocationState;
  const [_, setRemoteStream] = useState(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pc = useRef(new RTCPeerConnection(configuration));

  useEffect(() => {
    let otherUser: string | undefined;
    const init = async () => {
        console.log("called ");
        
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      localStream
        .getTracks()
        .forEach((track) => pc.current.addTrack(track, localStream));

      pc.current.ontrack = (e: any) => {
        setRemoteStream(e.streams[0]);
        if(remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      pc.current.onicecandidate = (event) => {
        if (event.candidate && otherUser) {
          socket.emit("signal", {
            to: otherUser,
            signal: {
              candidate: event.candidate,
            },
          });
        }
      };

      socket.emit("join-room", { roomID: roomId, userName: 'navasck' });

      socket.on('test', (message) => {
        console.log("message", message)
      })

      socket.on("user-joined", async ({ socketID }: UserJoinedPayload) => {
        console.log("socketID", socketID)
        otherUser = socketID;
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        socket.emit("signal", {
          to: socketID,
          signal: { offer },
        });
      });

      socket.on("signal", async ({ from, signal }: SignalData) => {
        otherUser = from;

        if (signal.offer) {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(signal.offer)
          );
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          socket.emit("signal", { to: from, signal: { answer } });
        }

         if (signal.answer) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(signal.answer));
        }
        if (signal.candidate) {
          await pc.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      });

       socket.on('user-left', () => {
        pc.current.close();
        alert("User left the call");
      });
    };

    init();


    return () => {
      pc.current.close();
      socket.disconnect();
    };

  }, [roomId]);

  return <div>
     <video ref={localVideoRef} autoPlay playsInline muted  />
      <video ref={remoteVideoRef} autoPlay playsInline />
  </div>;
};

export default RoomPage;
