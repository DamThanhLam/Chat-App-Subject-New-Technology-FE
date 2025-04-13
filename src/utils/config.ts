import { Auth } from "aws-amplify";

export const API_BASE_URL = "http://localhost:3000/api";

export const getAuthHeaders = async () => {
  try {
    const session = await Auth.currentSession();
    const accessToken = session.getIdToken().getJwtToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  } catch (error) {
    console.error("Lỗi khi lấy token xác thực:", error);
    throw new Error("Không thể lấy token xác thực");
  }
};

export const getCurrentUserId = async () => {
  try {
    const session = await Auth.currentSession();
    return session.getIdToken().payload.sub;
  } catch (error) {
    console.error("Lỗi khi lấy userId:", error);
    throw new Error("Không thể lấy userId");
  }
};
