// socket.ts
import { io, Socket } from "socket.io-client";
import { DOMAIN } from "../configs/base_url";
import { store } from "../redux/store";
import { addMessage, updateMessageStatus } from "../redux/slices/MessageSlice";
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
  const session = await Auth.currentSession();//get session then login success the cognito
  const jwtToken = session.getIdToken().getJwtToken();//get JWT access token in the session
  const socket = getSocket() //
  if (!socket || !socket.connected) { //check socket is connected before performming new connect
    const newSocket = initSocket(jwtToken) //initial socket. Prepare to authentication in the BE
    
    newSocket.connect();
    newSocket.emit("join");

    newSocket.on("private-message", (data) => {
      console.log("Got message:", data);
      store.dispatch(addMessage(data));
    });

    newSocket.on("result", (data) => {
      console.log("Got result:", data);
      const { code, messageId } = data;

      let status: "sent" | "failed" = "sent";
      if (code === 200) {
        status = "sent";
      } else if (code === 400 || code === 405) {
        status = "failed";
      }

      store.dispatch(updateMessageStatus({ id: messageId, status }));
    });
// action to connect to BE
    newSocket.emit("join"); //publish join, that setup socket ip with sub of the jwt before publish other
    newSocket.on("private-message", (data) => {
      console.log("Got message:", data);
    });
    newSocket.on("result", (data) => {
      console.log("Got message:", data);
    });

    newSocket.on("error", (err) => {
      console.log("Error:", err);
    });
    setSocket(newSocket)

  }
}
export const getSocket = () => socket;
export const setSocket = (socketNew: Socket) => { socket = socketNew }
export const disconnectSocket = () => socket?.disconnect();
