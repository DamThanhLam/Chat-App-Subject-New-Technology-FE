import { Conversation } from "@/src/models/Conversation";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;
  inviteJoinGroupResponse: { conversationId: string; message: string } | null;
}

const initialState: ConversationState = {
  conversations: [],
  currentConversationId: null,
  inviteJoinGroupResponse: null,
};

// Tạo slice
const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    // Thêm hoặc cập nhật danh sách cuộc trò chuyện
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },

    // Thêm một cuộc trò chuyện mới
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.some(
        (conv) => conv.id === action.payload.id
      );
      if (!exists) {
        state.conversations.push(action.payload);
      }
    },

    // Cập nhật tên nhóm
    updateGroupName: (
      state,
      action: PayloadAction<{ conversationId: string; newGroupName: string }>
    ) => {
      const { conversationId, newGroupName } = action.payload;
      const conversation = state.conversations.find(
        (conv) => conv.id === conversationId
      );
      if (conversation) {
        conversation.groupName = newGroupName;
        conversation.updateAt = new Date().toISOString();
      }
    },

    // Thêm thành viên mới vào nhóm
    addGroupMember: (
      state,
      action: PayloadAction<{
        conversationId: string;
        user: { method: string; id: string };
      }>
    ) => {
      const { conversationId, user } = action.payload;
      const conversation = state.conversations.find(
        (conv) => conv.id === conversationId
      );
      if (conversation) {
        const exists = conversation.participants.some((p) => p.id === user.id);
        if (!exists) {
          conversation.participants.push(user);
          conversation.participantsIds.push(user.id);
          conversation.updateAt = new Date().toISOString();
        }
      }
    },

    // Xóa thành viên khỏi nhóm
    removeGroupMember: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>
    ) => {
      const { conversationId, userId } = action.payload;
      const conversation = state.conversations.find(
        (conv) => conv.id === conversationId
      );
      if (conversation) {
        conversation.participants = conversation.participants.filter(
          (p) => p.id !== userId
        );
        conversation.participantsIds = conversation.participantsIds.filter(
          (id) => id !== userId
        );
        conversation.updateAt = new Date().toISOString();
      }
    },

    // Xóa cuộc trò chuyện (khi nhóm bị xóa)
    removeConversation: (
      state,
      action: PayloadAction<{ conversationId: string }>
    ) => {
      const { conversationId } = action.payload;
      state.conversations = state.conversations.filter(
        (conv) => conv.id !== conversationId
      );
      if (state.currentConversationId === conversationId) {
        state.currentConversationId = null;
      }
    },

    // Cập nhật permission (ví dụ: bật/tắt thông báo, bật/tắt chấp nhận tham gia)
    updatePermission: (
      state,
      action: PayloadAction<{
        conversationId: string;
        permission: { chat: boolean; acceptJoin: boolean };
      }>
    ) => {
      const { conversationId, permission } = action.payload;
      const conversation = state.conversations.find(
        (conv) => conv.id === conversationId
      );
      if (conversation) {
        conversation.permission = permission;
        conversation.updateAt = new Date().toISOString();
      }
    },

    // Lưu kết quả mời tham gia nhóm (từ sự kiện response-invite-join-group)
    setInviteJoinGroupResponse: (
      state,
      action: PayloadAction<{ conversationId: string; message: string }>
    ) => {
      state.inviteJoinGroupResponse = {
        conversationId: action.payload.conversationId,
        message: action.payload.message,
      };
    },

    // Xóa kết quả mời tham gia nhóm (sau khi hiển thị thông báo)
    clearInviteJoinGroupResponse: (state) => {
      state.inviteJoinGroupResponse = null;
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateGroupName,
  addGroupMember,
  removeGroupMember,
  removeConversation,
  updatePermission,
  setInviteJoinGroupResponse,
  clearInviteJoinGroupResponse,
} = conversationSlice.actions;

export default conversationSlice.reducer;
