// src/apis/conversation.ts
import { Friend } from "@/src/interface/interface";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import { fetchUserInfo } from "@/src/apis/user";
// Tạo nhóm chat từ đoạn chat đôi
export const createGroupFromChat = async (
  friendUserId: string,
  additionalUserIds: string[] = [],
  groupName: string = "Nhóm mới"
): Promise<{ conversationId: string; message: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/conversation/create-group`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      friendUserId,
      additionalUserIds,
      groupName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Không thể tạo nhóm");
  }

  const data = await response.json();
  return data;
};

// Lấy danh sách bạn bè (đã có trong HomeScreen, tái sử dụng)
export const fetchDetailFriends = async (
  currentUserId: string
): Promise<Friend[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("Không thể lấy danh sách bạn bè");
  }

  const data = await response.json();
  const friendList = data.friends || [];

  // Lấy thông tin chi tiết của từng người bạn
  const friendsWithDetails = await Promise.all(
    friendList.map(async (friend: any) => {
      const friendId =
        friend.senderId === currentUserId ? friend.receiverId : friend.senderId;
      try {
        const userInfo = await fetchUserInfo(friendId);
        return {
          _id: friendId,
          name: userInfo.name || friendId,
          urlAVT:
            userInfo.urlAVT ||
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        };
      } catch (error: any) {
        console.error("Lỗi khi lấy thông tin người dùng:", error.message);
        return {
          _id: friendId,
          name: friendId,
          urlAVT: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        };
      }
    })
  );

  return friendsWithDetails;
};
