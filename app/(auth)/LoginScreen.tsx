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
      router.replace('/home');
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
      console.log(user);
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
      router.push("/home/HomeScreen");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>LOGIN</Text>
          {/* View rỗng để cân đối */}
          <View style={{ width: 24 }} />
        </View>

        {/* Nội dung Login */}
        <View style={[styles.content, { paddingHorizontal: isLargeScreen ? 100 : 20 }]}>
          <TextInput
            placeholder="email"
            style={[
              styles.input,
              { color: colors.text, fontSize: isLargeScreen ? 18 : 16 },
            ]}
            placeholderTextColor={colors.text}
            value={username}
            onChangeText={setUsername}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              secureTextEntry={!showPassword}
              style={[
                styles.input,
                { flex: 1, color: colors.text, fontSize: isLargeScreen ? 18 : 16 },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.text}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={[styles.showText, { fontSize: isLargeScreen ? 16 : 14 }]}>
                {showPassword ? "HIDE" : "SHOW"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.replace("/ForgotScreen")}>
            <Text style={[styles.signInText, { color: colors.primary }]}>
              Forgot password
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/RegisterScreen")}>
            <Text style={[styles.signInText, { color: colors.primary }]}>
              Do you have not account?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: colors.primary,
                bottom: isLargeScreen ? 40 : 20,
                right: isLargeScreen ? 40 : 20,
              },
            ]}
            onPress={handleLogin}
          >
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>


      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  signInText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  // Header style
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  // Nội dung login
  content: {
    flex: 1,
    justifyContent: "center",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "gray",
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  showText: {
    color: "gray",
    fontWeight: "bold",
    marginLeft: 10,
  },
  nextButton: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
