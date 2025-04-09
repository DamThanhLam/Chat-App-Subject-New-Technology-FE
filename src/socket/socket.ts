// socket.ts
import { io, Socket } from "socket.io-client";
import { DOMAIN } from "../configs/base_url";
import { Auth } from "aws-amplify";

const SOCKET_SERVER = DOMAIN + ":3000";
let socket: Socket;

export const initSocket = (token: string) => {
  if (!socket) {
    socket = io(SOCKET_SERVER, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
};
export const connectSocket = async () => {
  const session = await Auth.currentSession();
  const jwtToken = session.getIdToken().getJwtToken();
  const socket = getSocket()
  if (!socket || !socket.connected) {
    const newSocket = initSocket(jwtToken)
    newSocket.connect();
    newSocket.emit("join");
    setSocket(newSocket)
  }
}
export const getSocket = () => socket;
export const setSocket = (socketNew:Socket)=>{socket = socketNew}
export const disconnectSocket = () => socket?.disconnect();
