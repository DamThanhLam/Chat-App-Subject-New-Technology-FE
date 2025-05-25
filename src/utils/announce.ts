import { Platform, Alert } from "react-native";

export function showError(message: string) {
  if (Platform.OS === "web") {
    alert(`❌ Error: ${message}`);
  } else {
    Alert.alert("Lỗi", message);
  }
}
