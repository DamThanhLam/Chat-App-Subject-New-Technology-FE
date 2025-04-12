import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type MessageStatus = "sending" | "sent" | "seen" | "failed";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  createAt: string;
  messageType: "group" | "private";
  contentType: "file" | "emoji" | "text";
  receiverId: string;
  status?: MessageStatus;
}

interface MessageState {
  messages: Message[];
}

const initialState: MessageState = {
  messages: [],
};

const messageSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload.sort(
        (a, b) => new Date(a.createAt).getTime() - new Date(b.createAt).getTime()
      );
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
      state.messages.sort(
        (a, b) => new Date(a.createAt).getTime() - new Date(b.createAt).getTime()
      );
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{ id: string; status: MessageStatus }>
    ) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) {
        msg.status = action.payload.status;
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const {
  setMessages,
  addMessage,
  updateMessageStatus,
  clearMessages,
} = messageSlice.actions;

export default messageSlice.reducer;
