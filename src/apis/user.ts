import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
export const fetchUserInfo = async (userId: string): Promise<any> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Không thể lấy thông tin người dùng với ID: ${userId}`);
  }

  const data = await response.json();
  return data;
};
