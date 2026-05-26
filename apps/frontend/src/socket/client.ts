import { type Socket, io } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../../packages/types/src/socket.js";

export type LoudroomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: LoudroomSocket | null = null;

export function getSocket(): LoudroomSocket {
  if (!socket) {
    socket = io("/", {
      path: "/socket.io",
      autoConnect: false,
      withCredentials: true,
    });
  }

  return socket;
}
