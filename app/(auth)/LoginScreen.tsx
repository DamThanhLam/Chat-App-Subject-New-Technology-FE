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
  StatusBar,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "aws-amplify";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/src/redux/slices/UserSlice";
import { Redirect, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { connectSocket } from "@/src/socket/socket";
import { useAppTheme } from "@/src/theme/theme"; // Import the custom theme hook
import { RootState } from "@/src/redux/store";

export default function LoginScreen() {
  const { theme } = useAppTheme(); // Use custom theme hook
  const dispatch = useDispatch();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useSelector((state: RootState) => state.user);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Redirect to home if user is logged in
  useEffect(() => {
    if (user.id) {
      router.replace("/home");
    }
  }, [user.id, router]);

  // Handle back press on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      if (Platform.OS === "android") {
        BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () =>
          BackHandler.removeEventListener("hardwareBackPress", onBackPress);
      }
    }, [router])
  );

  // Handle back navigation on web
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
      // Platform-specific success alert
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
      if (Platform.OS === "web") {
        window.alert(`Lỗi: ${errorMsg}`);
      } else {
        Alert.alert("Lỗi", errorMsg);
      }
    }
  };

  const isLargeScreen = width >= 768;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container}>
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={isLargeScreen ? 28 : 24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.colors.text, fontSize: isLargeScreen ? 20 : 18 },
            ]}
          >
            LOG IN
          </Text>
          <View style={{ width: isLargeScreen ? 28 : 24 }} />
        </View>

        {/* Main Content */}
        <View
          style={[
            styles.content,
            { paddingHorizontal: isLargeScreen ? width * 0.2 : 24 },
          ]}
        >
          <View style={styles.formContainer}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text, fontSize: isLargeScreen ? 16 : 14 },
              ]}
            >
              Email
            </Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.text + "80"}
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  fontSize: isLargeScreen ? 18 : 16,
                  paddingVertical: isLargeScreen ? 16 : 12,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text
              style={[
                styles.label,
                {
                  color: theme.colors.text,
                  fontSize: isLargeScreen ? 16 : 14,
                  marginTop: 16,
                },
              ]}
            >
              Password
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  paddingVertical: isLargeScreen ? 16 : 12,
                },
              ]}
            >
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.text + "80"}
                secureTextEntry={!showPassword}
                style={[
                  styles.passwordInput,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 18 : 16,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={isLargeScreen ? 24 : 20}
                  color={theme.colors.text + "80"}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.replace("/ForgotScreen")}
              style={styles.forgotPasswordButton}
            >
              <Text
                style={[
                  styles.forgotPasswordText,
                  {
                    color: theme.colors.primary,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor: theme.colors.primary,
                  paddingVertical: isLargeScreen ? 16 : 14,
                },
              ]}
              onPress={handleLogin}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.loginButtonText,
                  { fontSize: isLargeScreen ? 18 : 16 },
                ]}
              >
                Login
              </Text>
              <Ionicons
                name="arrow-forward"
                size={isLargeScreen ? 24 : 20}
                color="white"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                {
                  color: theme.colors.text,
                  fontSize: isLargeScreen ? 16 : 14,
                },
              ]}
            >
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => router.replace("/RegisterScreen")}>
              <Text
                style={[
                  styles.signUpText,
                  {
                    color: theme.colors.primary,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
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
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    borderRadius: 12, // Match SettingsScreen
    paddingHorizontal: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12, // Match SettingsScreen
    borderWidth: 1,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  passwordInput: {
    flex: 1,
  },
  showButton: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 12,
  },
  forgotPasswordText: {
    fontWeight: "500",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12, // Match SettingsScreen
    paddingHorizontal: 24,
    marginTop: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: "white",
    fontWeight: "600",
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    marginRight: 4,
  },
  signUpText: {
    fontWeight: "600",
  },
});
