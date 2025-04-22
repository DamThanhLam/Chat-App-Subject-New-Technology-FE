export interface Conversation {
  id: string;
  participants: {
    method: string;
    id: string;
  }[];
  participantsIds: string[]; // Trường mới để optimize query
  groupName?: string;
  lastMessage: any;
  createAt: string;
  updateAt: string;
  parentMessage: any;
  requestJoin: {
    method: string;
    id: string;
  }[];
  linkJoin: string;
  permission: {
    chat: boolean;
    acceptJoin: boolean;
  };
  listBlock: string[];
  leaderId: string;
  deputyId: string;
  avatarUrl?: string; // Thêm nếu cần
}
