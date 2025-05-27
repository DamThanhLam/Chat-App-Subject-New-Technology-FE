import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Auth } from "aws-amplify";
import { useAppTheme } from "@/src/theme/theme";

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState({
    minLength: false,
    lowercase: false,
    uppercase: false,
    symbol: false,
  });

  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();

  const checkPasswordRules = (password: string) => {
    setPasswordRules({
      minLength: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password),
    });
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (!Object.values(passwordRules).every(Boolean)) {
      setError("Password does not meet all requirements.");
      return;
    }

    setLoading(true);
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, currentPassword, newPassword);
      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordRules({
        minLength: false,
        lowercase: false,
        uppercase: false,
        symbol: false,
      });
    } catch (err) {
      console.log("Change password error:", err);
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Change Password
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View
        style={[
          styles.container,
          { paddingHorizontal: isLargeScreen ? width * 0.2 : 16 },
        ]}
      >
        <View
          style={[
            styles.formContainer,
            {
              backgroundColor: theme.colors.card,
              shadowColor: "#000",
            },
          ]}
        >
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Current Password
            </Text>
            <View
              style={[
                styles.passwordInputContainer,
                {
                  borderColor: error ? "#FF4D4D" : theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  { color: theme.colors.text, fontStyle: "italic" },
                ]}
                placeholder="Enter current password"
                placeholderTextColor={theme.colors.text + "80"}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.showButton}
              >
                <Ionicons
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.text + "80"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              New Password
            </Text>
            <View
              style={[
                styles.passwordInputContainer,
                {
                  borderColor: error ? "#FF4D4D" : theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  { color: theme.colors.text, fontStyle: "italic" },
                ]}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.text + "80"}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  checkPasswordRules(text);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.showButton}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.text + "80"}
                />
              </TouchableOpacity>
            </View>

            {/* Password Rules */}
            {newPassword && !Object.values(passwordRules).every(Boolean) && (
              <View style={styles.passwordRules}>
                <Text
                  style={[
                    styles.passwordRuleTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Password must contain:
                </Text>
                {!passwordRules.minLength && (
                  <Text
                    style={[styles.passwordRule, { color: theme.colors.text }]}
                  >
                    • At least 8 characters
                  </Text>
                )}
                {!passwordRules.lowercase && (
                  <Text
                    style={[styles.passwordRule, { color: theme.colors.text }]}
                  >
                    • At least one lowercase letter
                  </Text>
                )}
                {!passwordRules.uppercase && (
                  <Text
                    style={[styles.passwordRule, { color: theme.colors.text }]}
                  >
                    • At least one uppercase letter
                  </Text>
                )}
                {!passwordRules.symbol && (
                  <Text
                    style={[styles.passwordRule, { color: theme.colors.text }]}
                  >
                    • At least one symbol (!@#$%^&* etc.)
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Confirm New Password
            </Text>
            <View
              style={[
                styles.passwordInputContainer,
                {
                  borderColor: error ? "#FF4D4D" : theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    fontStyle: "italic",
                  },
                ]}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.colors.text + "80"}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.showButton}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.text + "80"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          {error !== "" && (
            <View
              style={[
                styles.messageContainer,
                {
                  backgroundColor: "#FF4D4D20",
                  borderLeftColor: "#FF4D4D",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color="#FF4D4D" />
              <Text style={[styles.errorText, { color: "#FF4D4D" }]}>
                {error}
              </Text>
            </View>
          )}
          {success !== "" && (
            <View
              style={[
                styles.messageContainer,
                {
                  backgroundColor: "#4CAF5020",
                  borderLeftColor: "#4CAF50",
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.successText, { color: "#4CAF50" }]}>
                {success}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: "#FF4D4D",
                },
              ]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: "#ffffff" }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.changeButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.changeText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingTop: 20,
  },
  formContainer: {
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 10,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  showButton: {
    padding: 8,
    marginLeft: 8,
  },
  passwordRules: {
    marginTop: 8,
    paddingLeft: 8,
  },
  passwordRuleTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  passwordRule: {
    fontSize: 13,
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    marginVertical: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  successText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  changeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  changeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChangePasswordScreen;
