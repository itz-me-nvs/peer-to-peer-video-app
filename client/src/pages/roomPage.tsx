import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import socket from "../lib/socket";

// WebRTC configuration using a public STUN server
const configuration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface UserJoinedPayload {
  socketId: string;
  existingUsers: string[]
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
  const {state} = useLocation();
  const userName = state?.name || '';
  const [isRoomFull, setIsRoomFull] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const [remoteStreams, setRemoteStreams] = useState<{[id: string]: MediaStream}>({})

  const peerConnections = useRef<{[id: string]: RTCPeerConnection}>({});

  // References to video elements and media stream
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Peer connection instance
  // const pc = useRef(new RTCPeerConnection(configuration));

  useEffect(() => {
    // let otherUser: string | undefined;

    const init = async () => {

        // Handle full room scenario
      socket.on("room-full", (data) => {
        setIsRoomFull(data.isRoomFull);
      });


      // Request access to media devices
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = localStream;

      // Display local stream in local video element
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      // Add local tracks to the peer connection
      // localStream
      //   .getTracks()
      //   .forEach((track) => pc.current.addTrack(track, localStream));

      // When remote stream is received, attach it to the remote video element
      // pc.current.ontrack = (e: RTCTrackEvent) => {
      //   if (remoteVideoRef.current)
      //     remoteVideoRef.current.srcObject = e.streams[0];
      // };

      // // Send ICE candidates to remote peer
      // pc.current.onicecandidate = (event) => {
      //   if (event.candidate && otherUser) {
      //     socket.emit("signal", {
      //       to: otherUser,
      //       signal: {
      //         candidate: event.candidate,
      //       },
      //     });
      //   }
      // };

      socket.emit("join-room", { roomID: roomId, userName: userName });

    
      // When another user joins, initiate offer
      socket.on("user-joined", async ({ existingUsers }: UserJoinedPayload) => {
        // otherUser = socketId;
        // const offer = await pc.current.createOffer();
        // await pc.current.setLocalDescription(offer);
        // socket.emit("signal", {
        //   to: socketId,
        //   signal: { offer },
        // });


        for (const id of existingUsers) {
          createPeerConnection(id, true);
        }

      });

       socket.on("new-user", (socketId: string) => {
        createPeerConnection(socketId, false);
      });

      // Handle incoming signaling messages
      socket.on("signal", async ({ from, signal }: SignalData) => {
        // otherUser = from;
        const pc = peerConnections.current[from];

        if(!pc) return;

        if (signal.offer) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.offer)
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal", { to: from, signal: { answer } });
        }

        if (signal.answer) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.answer)
          );
        }
        if (signal.candidate) {
          await pc.addIceCandidate(
            new RTCIceCandidate(signal.candidate)
          );
        }
      });

      // When the other user leaves
      socket.on("user-left", (socketId: string) => {
        if(peerConnections.current[socketId]){
          peerConnections.current[socketId].close();
          delete peerConnections.current[socketId];
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
          });
        }
      });
    };

    init();

    return () => {
      Object.values(peerConnections).forEach(pc => pc.close());
      socket.disconnect();
    };
  }, [roomId]);


  const createPeerConnection = async(socketId: string, isInitiator: boolean)=> {
    const pc = new RTCPeerConnection(configuration);
    peerConnections.current[socketId] = pc;

    localStreamRef.current?.getTracks().forEach((track) => {
      if(localStreamRef.current) pc.addTrack(track, localStreamRef.current);
    });

        const remoteStream = new MediaStream();
    pc.ontrack = (e: RTCTrackEvent) => {
      e.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
        setRemoteStreams((prev)=> ({
          ...prev,
          [socketId]: remoteStream
        }))
      })
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", {
          to: socketId,
          signal: { candidate: event.candidate },
        });
      }
    };


    if(isInitiator){
      const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("signal", {
          to: socketId,
          signal: { offer },
        });
    }
  }

  // Toggle video stream
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
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
    Object.values(peerConnections).forEach((pc) => pc.close());
    socket.disconnect();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white flex flex-col items-center justify-center p-6">
      {isRoomFull ? (
        <p className="text-red-500 text-xl font-semibold">Room is full</p>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4 text-center">
            Live Video Call
          </h1>
       <div className="flex flex-wrap gap-6 justify-center">
        <video
          ref={localVideoRef}
          className="rounded-xl w-64 h-48 border-4 border-blue-500 bg-black"
          autoPlay
          muted
          playsInline
        />
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <video
            key={id}
            className="rounded-xl w-64 h-48 border-4 border-green-500 bg-black"
            autoPlay
            playsInline
            ref={(video) => {
              if (video && stream) video.srcObject = stream;
            }}
          />
        ))}
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
