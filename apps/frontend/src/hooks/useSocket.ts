import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../../packages/types/src/socket.js";
import { getSocket } from "../socket/client.js";

export function useSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const socket = useMemo(() => getSocket(), []);
  const [, setConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  return socket;
}
