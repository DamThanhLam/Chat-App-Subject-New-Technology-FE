import { API_BASE_URL, getAuthHeaders } from "../utils/config";
import { Friend, Message, UserInfo } from "@/src/interface/interface";
import { getNickname } from "./nickName";

// Lấy danh sách bạn bè
export const fetchFriends = async (): Promise<Friend[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("Không thể lấy danh sách bạn bè");
  }

  const data = await response.json();
  return data.friends || [];
};

// Lấy thông tin người dùng dựa trên friendId
export const fetchUserInfo = async (friendId: string): Promise<UserInfo> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/user/${friendId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(
      `Lỗi khi lấy thông tin người dùng ${friendId}:`,
      errorData.message
    );
    return { friendId, displayName: friendId, avatar: null };
  }

  const userData = await response.json();
  const resultNickname = await getNickname(friendId);
  return {
    friendId,
    displayName: resultNickname && resultNickname.nickname? resultNickname.nickname : userData.name || friendId,
    avatar: userData.urlAVT || null,
  };
};

// Lấy tin nhắn mới nhất cho một người bạn
export const fetchLatestMessage = async (
  friendId: string
): Promise<Message | null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/message/get-latest-message?friendId=${friendId}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    console.error(`Không thể lấy tin nhắn mới nhất cho ${friendId}`);
    return null;
  }

  const messageData = await response.json();
  return messageData || null;
};
