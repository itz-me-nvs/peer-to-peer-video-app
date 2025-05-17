import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../lib/socket";

const configuration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface UserJoinedPayload {
  socketId: string;
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
  const [isRoomFull, setIsRoomFull] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pc = useRef(new RTCPeerConnection(configuration));

  useEffect(() => {
    let otherUser: string | undefined;
    const init = async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      localStream
        .getTracks()
        .forEach((track) => pc.current.addTrack(track, localStream));

      pc.current.ontrack = (e: any) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = e.streams[0];
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

      socket.emit("join-room", { roomID: roomId, userName: "navasck" });

      socket.on("room-full", (data) => {
        setIsRoomFull(data.isRoomFull);
      });

      socket.on("user-joined", async ({ socketId }: UserJoinedPayload) => {
        otherUser = socketId;
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        socket.emit("signal", {
          to: socketId,
          signal: { offer },
        });
      });

      socket.on("signal", async ({ from, signal }: SignalData) => {
        otherUser = from;

        if (signal.offer) {
          const localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });

          if (localVideoRef.current)
            localVideoRef.current.srcObject = localStream;

          // Make sure to add local tracks again
          localStream.getTracks().forEach((track) => {
            pc.current.addTrack(track, localStream);
          });

          await pc.current.setRemoteDescription(
            new RTCSessionDescription(signal.offer)
          );
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          socket.emit("signal", { to: from, signal: { answer } });
        }

        if (signal.answer) {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(signal.answer)
          );
        }
        if (signal.candidate) {
          await pc.current.addIceCandidate(
            new RTCIceCandidate(signal.candidate)
          );
        }
      });

      socket.on("user-left", () => {
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

  return (
    <div>
      {isRoomFull == true ? (
        <p>Room is full</p>
      ) : (
        <>
          <video ref={localVideoRef} autoPlay playsInline muted />
          <video ref={remoteVideoRef} autoPlay playsInline />

          <button
            onClick={() => {
              pc.current.close();
              socket.disconnect();
            }}
          >
           Leave Call
          </button>
        </>
      )}
    </div>
  );
};

export default RoomPage;
