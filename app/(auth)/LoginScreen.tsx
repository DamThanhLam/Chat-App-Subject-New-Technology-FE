// @ts-nocheck
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "aws-amplify";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/src/redux/slices/UserSlice";
import { Redirect, useRouter } from "expo-router";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { RootState } from "@/src/redux/store";
import { connectSocket, initSocket } from "@/src/socket/socket";

export default function LoginScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useSelector((state: RootState) => state.user);
  const [showPassword, setShowPassword] = useState(false);

  // Nếu chưa đăng nhập (user.id rỗng), chuyển hướng sang màn hình login
  useEffect(() => {
    if (user.id) {
      router.replace("/home");
    }
  }, [user.id]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Xử lý sự kiện back trên Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true; // báo đã xử lý event
      };
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [router])
  );

  // Xử lý sự kiện back trên Web (nếu cần tùy chỉnh)
  useEffect(() => {
    if (Platform.OS === "web") {
      const onPopState = () => {
        router.back();
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, [router]);

  const handleLogin = async () => {
    try {
      const user = await Auth.signIn(username, password);

      dispatch(
        setUser({
          id: user.attributes.sub,
          name: user.attributes.name,
          email: user.attributes.email,
          phoneNumber: "",
        })
      );
      // Thông báo khi đăng nhập thành công
      if (Platform.OS === "web") {
        window.alert(`Thành công: Xin chào ${user.attributes.name}`);
      } else {
        Alert.alert("Thành công", `Xin chào ${user.attributes.name}`);
      }
      await connectSocket();

      router.push("/home");
    } catch (error: any) {
      if (error.code === "UserNotConfirmedException") {
        router.push({
          pathname: "/OTPVerificationScreen",
          params: { user: JSON.stringify({ username }) },
        });
        return;
      }
      const errorMsg = error.message || "Đăng nhập thất bại.";
      // Phân nhánh hiển thị thông báo theo nền tảng:
      if (Platform.OS === "web") {
        window.alert(`Lỗi: ${errorMsg}`);
      } else {
        Alert.alert("Lỗi", errorMsg);
      }
    }
  };

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            LOG IN
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Content */}
        <View
          style={[
            styles.content,
            { paddingHorizontal: isLargeScreen ? width * 0.2 : 24 },
          ]}
        >
          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={colors.text + "80"}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  height: isLargeScreen ? 56 : 48,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
              Password
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  height: isLargeScreen ? 56 : 48,
                },
              ]}
            >
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={colors.text + "80"}
                secureTextEntry={!showPassword}
                style={[styles.passwordInput, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.text + "80"}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.replace("/ForgotScreen")}
              style={styles.forgotPasswordButton}
            >
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Login</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => router.replace("/RegisterScreen")}>
              <Text style={[styles.signUpText, { color: colors.primary }]}>
                SIGN UP
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  // Content styles
  content: {
    flex: 1,
    justifyContent: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  showButton: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  // Footer styles
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    marginRight: 4,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
