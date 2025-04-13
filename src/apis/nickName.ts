// src/apis/nickname.ts
import { API_BASE_URL, getAuthHeaders } from "../utils/config";

// Đặt hoặc cập nhật tên gợi nhớ
export const setNickname = async (
  targetUserId: string,
  nickname: string
): Promise<{ message: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/nickname/set/${targetUserId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ nickname }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Không thể đặt tên gợi nhớ");
  }

  const data = await response.json();
  return data;
};

// Lấy tên gợi nhớ
export const getNickname = async (
  targetUserId: string
): Promise<{ nickname: string | null }|null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/nickname/get/${targetUserId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(errorData)
    return null;
  }

  const data = await response.json();
  return data;
};
