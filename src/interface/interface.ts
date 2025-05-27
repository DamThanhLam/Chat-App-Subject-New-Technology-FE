export interface Friend {
  id: string;
  senderId: string;
  receiverId: string;
  senderAVT: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createAt: string;
  updateAt: string;
}

export interface Message {
  id: string;
  conversationId: string | null;
  senderId: string;
  message:
  | string
  | { data: string; filename: string; mimetype: string; size: number };
  createdAt: string;
  updatedAt: string;
  parentMessage?: Message;
  readed: string[];
  messageType: "group" | "private";
  contentType: "file" | "emoji" | "text";
  receiverId: string;
  status: "recall" | "delete" | "readed" | "sended" | "received";
}

export interface UserInfo {
  friendId: string;
  displayName: string;
  avatar: string | null;
}
export interface FriendUserDetail {
  _id: string;
  name: string;
  urlAVT: string;
}

export interface DisplayConversation {
  friendId: string;
  displayName: string;
  avatar: string;
  lastMessage: Message | null;
}
