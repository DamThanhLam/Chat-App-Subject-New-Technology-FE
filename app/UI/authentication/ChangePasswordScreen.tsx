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

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change password</Text>
      </View>

      {/* Input Fields */}
      <Text style={styles.label}>Current password</Text>
      <TextInput
        style={styles.input}
        placeholder="password...."
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        placeholder="new password...."
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Text style={styles.label}>Confirm password</Text>
      <TextInput
        style={styles.input}
        placeholder="confirm password...."
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeButton}
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
    backgroundColor: "white",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 15,
    color: "#333",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingVertical: 8,
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  cancelButton: {
    backgroundColor: "red",
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
    backgroundColor: "#3b82f6",
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
