import { io, Socket } from "socket.io-client";
import { DOMAIN } from "../configs/base_url";
import { Auth } from "aws-amplify";
import { store } from "../redux/store";
import { addMessage, updateMessageStatus } from "../redux/slices/MessageSlice";
import {
  setConversations,
  addConversation,
  updateGroupName,
  addGroupMember,
  removeGroupMember,
  removeConversation,
  setInviteJoinGroupResponse,
} from "../redux/slices/ConversationSlice";

const SOCKET_SERVER = DOMAIN + ":3000";
let socket: Socket | null = null;

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
  try {
    const session = await Auth.currentSession();
    const jwtToken = session.getIdToken().getJwtToken();
    const currentSocket = getSocket();

    if (!currentSocket || !currentSocket.connected) {
      const newSocket = initSocket(jwtToken);
      newSocket.connect();
      newSocket.emit("join");

      // Xử lý tin nhắn chat đơn
      newSocket.on("private-message", (data) => {
        console.log("Got private message:", data);
        store.dispatch(addMessage(data));
      });

      // Xử lý tin nhắn nhóm
      newSocket.on("group-message", (data) => {
        console.log("Got group message:", data);
        store.dispatch(addMessage(data));
      });

      // Xử lý kết quả gửi tin nhắn
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

      // Xử lý tin nhắn từ người nhận
      newSocket.on("receiver-message", (data) => {
        console.log("Got receiver message:", data);
        store.dispatch(addMessage(data));
      });

      // Xử lý sự kiện thành viên mới tham gia nhóm
      newSocket.on("userJoinedGroup", (data) => {
        console.log("User joined group:", data);
        store.dispatch(
          addGroupMember({
            conversationId: data.conversationId,
            user: data.user,
          })
        );
      });

      newSocket.on("userLeft", (data) => {
        console.log("User left group:", data);
        store.dispatch(
          removeGroupMember({
            conversationId: data.conversationId,
            userId: data.userId,
          })
        );
      });

      // // Xử lý sự kiện thành viên rời nhóm
      // newSocket.on("userLeftGroup", (data) => {
      //   console.log("User left group:", data);
      //   store.dispatch(
      //     removeGroupMember({
      //       conversationId: data.conversationId,
      //       userId: data.userId,
      //     })
      //   );
      // });

      // Xử lý sự kiện nhóm bị xóa
      newSocket.on("group-deleted", (data) => {
        console.log("Group deleted:", data);
        store.dispatch(
          removeConversation({
            conversationId: data.conversationId,
          })
        );
      });

      // Xử lý sự kiện mời tham gia nhóm
      newSocket.on(
        "response-invite-join-group",
        (data: {
          message: string;
          conversationId?: string;
          code?: number;
          error?: string;
        }) => {
          console.log("Invite join group response:", data);
          if (data.error) {
            console.error("Invite join group error:", data.error);
            return;
          }
          store.dispatch(
            setInviteJoinGroupResponse({
              conversationId: data.conversationId || "",
              message: data.message,
            })
          );
        }
      );

      // Xử lý lỗi socket
      newSocket.on("error", (err) => {
        console.log("Socket error:", err);
      });

      setSocket(newSocket);
    }

    return getSocket();
  } catch (error) {
    console.error("Error connecting socket:", error);
    throw error;
  }
};

export const getSocket = () => socket;

export const setSocket = (socketNew: Socket) => {
  socket = socketNew;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
