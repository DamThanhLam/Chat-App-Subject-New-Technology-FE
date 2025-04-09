import * as SecureStore from 'expo-secure-store';

// Lưu token
export const saveToken = async (token: string) => {
  // try {
  //   await SecureStore.setItemAsync('access_token', token);
  //   console.log("Token saved successfully");
  // } catch (error) {
  //   console.error("Error saving token", error);
  // }
};

// Lấy token
export const getToken = async () => {
  // try {
  //   const token = await SecureStore.getItemAsync('access_token');
  //   return token;
  // } catch (error) {
  //   console.error("Error getting token", error);
  // }
};

// Xóa token
export const deleteToken = async () => {
  try {
    await SecureStore.deleteItemAsync('access_token');
    console.log("Token deleted successfully");
  } catch (error) {
    console.error("Error deleting token", error);
  }
};
