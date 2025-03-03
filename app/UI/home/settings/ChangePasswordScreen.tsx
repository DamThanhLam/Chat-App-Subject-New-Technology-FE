import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // Import icon thư viện
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Input Fields */}
      <Text style={[styles.label, { color: theme.colors.text }]}>Current password</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
        placeholder="password...."
        placeholderTextColor={theme.colors.text}
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <Text style={[styles.label, { color: theme.colors.text }]}>New password</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
        placeholder="new password...."
        placeholderTextColor={theme.colors.text}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Text style={[styles.label, { color: theme.colors.text }]}>Confirm password</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
        placeholder="confirm password...."
        placeholderTextColor={theme.colors.text}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: "red" }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.changeButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => alert("Password changed!")}
        >
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 15,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 10,
  },
  cancelText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  changeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  changeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ChangePasswordScreen;