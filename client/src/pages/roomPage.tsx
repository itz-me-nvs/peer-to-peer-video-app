import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../lib/socket";

// WebRTC configuration using a public STUN server
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
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // References to video elements and media stream
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Peer connection instance
  const pc = useRef(new RTCPeerConnection(configuration));

  useEffect(() => {
    let otherUser: string | undefined;

    const init = async () => {
      // Request access to media devices
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = localStream;

      // Display local stream in local video element
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      // Add local tracks to the peer connection
      localStream.getTracks().forEach((track) => pc.current.addTrack(track, localStream));

      // When remote stream is received, attach it to the remote video element
      pc.current.ontrack = (e: any) => {
        console.log('tracks', e.streams)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      // Send ICE candidates to remote peer
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

      // Handle full room scenario
      socket.on("room-full", (data) => {
        setIsRoomFull(data.isRoomFull);
      });

      // When another user joins, initiate offer
      socket.on("user-joined", async ({ socketId }: UserJoinedPayload) => {
        otherUser = socketId;
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        socket.emit("signal", {
          to: socketId,
          signal: { offer },
        });
      });

      // Handle incoming signaling messages
      socket.on("signal", async ({ from, signal }: SignalData) => {
        otherUser = from;

        if (signal.offer) {
          // If offer received, get local media again and respond with an answer
          const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          localStreamRef.current = localStream;

          if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

          localStream.getTracks().forEach((track) => pc.current.addTrack(track, localStream));

          await pc.current.setRemoteDescription(new RTCSessionDescription(signal.offer));
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

      // When the other user leaves
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

  // Toggle video stream
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        // track.enabled ? localVideoRef.current?.play() : localVideoRef.current?.pause();
        track.stop();
        // pc.current.removeTrack(track);
        setIsVideoEnabled(track.enabled);
      });
    }
  };

  // Toggle audio stream
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
      });
    }
  };

  // Leave the call and navigate back
  const leaveCall = () => {
    pc.current.close();
    socket.disconnect();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white flex flex-col items-center justify-center p-6">
      {isRoomFull ? (
        <p className="text-red-500 text-xl font-semibold">Room is full</p>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4 text-center">Live Video Call</h1>
          <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-center">
            <video ref={localVideoRef} className="rounded-xl w-80 h-60 bg-black border-4 border-blue-500 shadow-lg" autoPlay playsInline muted />
            <video ref={remoteVideoRef} className="rounded-xl w-80 h-60 bg-black border-4 border-green-500 shadow-lg" autoPlay playsInline />
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <button
              onClick={toggleVideo}
              className="bg-blue-600 px-5 py-2 rounded-full hover:bg-blue-700 transition shadow-md"
            >
              {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
            </button>
            <button
              onClick={toggleAudio}
              className="bg-yellow-600 px-5 py-2 rounded-full hover:bg-yellow-700 transition shadow-md"
            >
              {isAudioEnabled ? "Mute Audio" : "Unmute Audio"}
            </button>
            <button
              onClick={leaveCall}
              className="bg-red-600 px-5 py-2 rounded-full hover:bg-red-700 transition shadow-md"
            >
              Leave Call
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RoomPage;