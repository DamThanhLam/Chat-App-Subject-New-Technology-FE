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
import { setCallOffer } from "../redux/slices/CallSlice";

const SOCKET_SERVER = DOMAIN + ":3000";
let socket: Socket | null = null;
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const peerConnection = new RTCPeerConnection(configuration);
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

  if (!socket || !socket.connected) {
    const newSocket = initSocket(jwtToken);

    // Remove existing listeners if any before reconnecting
    if (socket) {
      // List of events to clean up to avoid duplicates
      const eventsToCleanup = [
        "group-deleted",
        "removed-from-group",
        "userLeft",
        "group-message",
        "message-deleted",
        "message-recalled",
        "group-renamed",
        "userJoinedGroup",
        "reponse-approve-into-group",
        "response-invite-join-group",
        "block-chatting",
      ];

      // Clean up all potentially duplicated listeners
      eventsToCleanup.forEach((event) => {
        socket?.off(event);
      });
    }

    newSocket.connect();
    newSocket.emit("join");

    // Xử lý tin nhắn chat đơn
    newSocket.on("private-message", (data) => {
      console.log("Got private message:", data);
      store.dispatch(addMessage(data));
    });

    // // Xử lý tin nhắn nhóm
    // newSocket.on("group-message", (data) => {
    //   console.log("Got group message:", data);
    //   store.dispatch(addMessage(data));
    // });

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
    // newSocket.on("userJoinedGroup", (data) => {
    //   console.log("User joined group:", data);
    //   store.dispatch(
    //     addGroupMember({
    //       conversationId: data.conversationId,
    //       user: data.user,
    //     })
    //   );
    // });

    // newSocket.on("userLeft", (data) => {
    //   console.log("User left group:", data);
    //   store.dispatch(
    //     removeGroupMember({
    //       conversationId: data.conversationId,
    //       userId: data.userId,
    //     })
    //   );
    // });

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

    // // Xử lý sự kiện nhóm bị xóa
    // newSocket.on("group-deleted", (data) => {
    //   console.log("Group deleted:", data);
    //   store.dispatch(
    //     removeConversation({
    //       conversationId: data.conversationId,
    //     })
    //   );
    // });

    newSocket.on("offer", (data: { from: string; offer: any }) => {
      console.log("Offer received:", data);
      store.dispatch(setCallOffer({ from: data.from, offer: data.offer }));
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
    return newSocket;
  } else {
    return socket;
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

export const socket_call = async (typeCall: "PRIVATE" | "GROUP", to: string, video: boolean) => {


  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const socket = getSocket()
  if (socket) {
    socket.emit("offer", { offer, to: to });
  } else {
    await connectSocket().then(socket => {
      socket.emit("offer", { offer, to: to });
    })
  }
}
export const handle_socket_accept_office = async ({ offer, from }: any) => {
  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  await emit(from, { answer: answer })
}
const emit = async (to: string, data: any) => {
  if (socket) {
    socket.emit("offer", { ...data, to: to });
  } else {
    await connectSocket().then(socket => {
      socket.emit("offer", { ...data, to: to });
    })
  }
}