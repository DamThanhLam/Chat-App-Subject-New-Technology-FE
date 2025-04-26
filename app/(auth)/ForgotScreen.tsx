// @ts-nocheck
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "aws-amplify";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

export default function ForgotScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<"REQUEST" | "RESET">("REQUEST");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [router])
  );

  useEffect(() => {
    if (Platform.OS === "web") {
      const onPop = () => router.back();
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
  }, [router]);

  const isLarge = width >= 768;

  const handleRequestCode = async () => {
    if (!username) {
      setMessage({ type: "error", text: "Vui lòng nhập email hoặc số điện thoại." });
      return;
    }
    try {
      await Auth.forgotPassword(username);
      setMessage({
        type: "success",
        text: "Đã gửi mã xác thực. Vui lòng kiểm tra email hoặc SMS.",
      });
      setStep("RESET");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Không thể gửi mã xác thực.",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword) {
      setMessage({ type: "error", text: "Vui lòng nhập mã xác thực và mật khẩu mới." });
      return;
    }
    try {
      await Auth.forgotPasswordSubmit(username, code, newPassword);
      setMessage({
        type: "success",
        text: "Mật khẩu đã được đặt lại. Đang chuyển hướng...",
      });
      setTimeout(() => router.replace("/LoginScreen"), 1500);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Không thể đặt lại mật khẩu.",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Forgot Password
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.content, { paddingHorizontal: isLarge ? 100 : 20 }]}>
          {step === "REQUEST" && (
            <>
              <TextInput
                placeholder="Email"
                style={[styles.input, { color: colors.text, fontSize: isLarge ? 18 : 16 }]}
                placeholderTextColor={colors.text}
                value={username}
                onChangeText={setUsername}
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleRequestCode}
              >
                <Text style={styles.buttonText}>Send Code</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "RESET" && (
            <>
              <TextInput
                placeholder="Verification Code"
                style={[styles.input, { color: colors.text, fontSize: isLarge ? 18 : 16 }]}
                placeholderTextColor={colors.text}
                value={code}
                onChangeText={setCode}
              />
              <TextInput
                placeholder="New Password"
                secureTextEntry
                style={[styles.input, { color: colors.text, fontSize: isLarge ? 18 : 16 }]}
                placeholderTextColor={colors.text}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleResetPassword}
              >
                <Text style={styles.buttonText}>Reset Password</Text>
              </TouchableOpacity>
            </>
          )}

          {message && (
            <Text
              style={{
                marginTop: 15,
                color: message.type === "success" ? "green" : "red",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {message.text}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});