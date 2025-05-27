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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "aws-amplify";
import { useRouter, useFocusEffect } from "expo-router";
import { OtpInput } from "react-native-otp-entry";
import { useAppTheme } from "@/src/theme/theme";

interface PasswordRules {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  symbol: boolean;
}

export default function ForgotScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState<"REQUEST" | "RESET">("REQUEST");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    symbol: false,
  });

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const checkPasswordRules = (password: string) => {
    setPasswordRules({
      minLength: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password),
    });
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
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
  const isSmall = width <= 320;

  const handleRequestCode = async () => {
    if (!username) {
      setMessage({ type: "error", text: "Vui lòng nhập email." });
      return;
    }
    try {
      await Auth.forgotPassword(username);
      setMessage({
        type: "success",
        text: "Đã gửi mã xác thực. Vui lòng kiểm tra email.",
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
      setMessage({
        type: "error",
        text: "Vui lòng nhập mã xác thực và mật khẩu mới.",
      });
      return;
    }

    if (!Object.values(passwordRules).every(Boolean)) {
      setMessage({
        type: "error",
        text: "Mật khẩu không đáp ứng yêu cầu bảo mật.",
      });
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

  // Define default success and error colors if not in theme
  const successColor = "#4CAF50";
  const errorColor = "#F44336";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.container, { justifyContent: "center" }]}>
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={isLarge ? 28 : 24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.colors.text, fontSize: isLarge ? 22 : 20 },
            ]}
          >
            Forgot Password
          </Text>
          <View style={{ width: isLarge ? 28 : 24 }} />
        </View>

        <View style={[styles.contentWrapper, { height: height * 0.7 }]}>
          <View
            style={[
              styles.content,
              {
                paddingHorizontal: isLarge ? width * 0.2 : isSmall ? 16 : 24,
              },
            ]}
          >
            <View
              style={[
                styles.formContainer,
                {
                  backgroundColor: theme.colors.card,
                  width: isLarge ? "80%" : "100%",
                  maxWidth: 500,
                  alignSelf: "center",
                },
              ]}
            >
              {step === "REQUEST" ? (
                <>
                  <Text
                    style={[
                      styles.formTitle,
                      {
                        color: theme.colors.text,
                        fontSize: isLarge ? 18 : 16,
                      },
                    ]}
                  >
                    Email
                  </Text>
                  <TextInput
                    placeholder="Nhập email"
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                        fontSize: isLarge ? 18 : 16,
                        backgroundColor: theme.colors.background,
                      },
                    ]}
                    placeholderTextColor={theme.colors.text + "80"}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleRequestCode}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { fontSize: isLarge ? 18 : 16 },
                      ]}
                    >
                      Gửi mã xác thực
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.formTitle,
                      {
                        color: theme.colors.text,
                        fontSize: isLarge ? 18 : 16,
                      },
                    ]}
                  >
                    Mã xác thực
                  </Text>
                  <OtpInput
                    numberOfDigits={6}
                    onTextChange={(text) => setCode(text)}
                    focusColor={theme.colors.primary}
                    theme={{
                      containerStyle: styles.otpContainer,
                      pinCodeContainerStyle: {
                        ...styles.otpBox,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                      },
                      pinCodeTextStyle: {
                        fontSize: isLarge ? 20 : 18,
                        color: theme.colors.text,
                        fontWeight: "600",
                      },
                      placeholderTextStyle: {
                        color: theme.colors.text + "80",
                      },
                    }}
                  />

                  <Text
                    style={[
                      styles.formTitle,
                      {
                        color: theme.colors.text,
                        fontSize: isLarge ? 18 : 16,
                        marginTop: 20,
                      },
                    ]}
                  >
                    Mật khẩu mới
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                      },
                    ]}
                  >
                    <TextInput
                      placeholder="Nhập mật khẩu mới"
                      secureTextEntry={!showPassword}
                      style={[
                        styles.passwordInput,
                        {
                          color: theme.colors.text,
                          fontSize: isLarge ? 18 : 16,
                        },
                      ]}
                      placeholderTextColor={theme.colors.text + "80"}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        checkPasswordRules(text);
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.showButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={isLarge ? 24 : 20}
                        color={theme.colors.text + "80"}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Password rules */}
                  {newPassword &&
                    !Object.values(passwordRules).every(Boolean) && (
                      <View style={styles.passwordRules}>
                        {!passwordRules.minLength && (
                          <Text
                            style={[
                              styles.passwordRule,
                              {
                                color: theme.colors.text,
                                fontSize: isLarge ? 14 : 13,
                              },
                            ]}
                          >
                            ─ At least 8 characters
                          </Text>
                        )}
                        {!passwordRules.lowercase && (
                          <Text
                            style={[
                              styles.passwordRule,
                              {
                                color: theme.colors.text,
                                fontSize: isLarge ? 14 : 13,
                              },
                            ]}
                          >
                            ─ Lowercase letter
                          </Text>
                        )}
                        {!passwordRules.uppercase && (
                          <Text
                            style={[
                              styles.passwordRule,
                              {
                                color: theme.colors.text,
                                fontSize: isLarge ? 14 : 13,
                              },
                            ]}
                          >
                            ─ Uppercase letter
                          </Text>
                        )}
                        {!passwordRules.symbol && (
                          <Text
                            style={[
                              styles.passwordRule,
                              {
                                color: theme.colors.text,
                                fontSize: isLarge ? 14 : 13,
                              },
                            ]}
                          >
                            ─ Symbol
                          </Text>
                        )}
                      </View>
                    )}

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: theme.colors.primary, marginTop: 20 },
                    ]}
                    onPress={handleResetPassword}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { fontSize: isLarge ? 18 : 16 },
                      ]}
                    >
                      Đặt lại mật khẩu
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {message && (
                <View
                  style={[
                    styles.messageContainer,
                    {
                      backgroundColor:
                        message.type === "success"
                          ? `${successColor}20`
                          : `${errorColor}20`,
                      borderColor:
                        message.type === "success" ? successColor : errorColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color:
                          message.type === "success"
                            ? successColor
                            : errorColor,
                        fontSize: isLarge ? 16 : 14,
                      },
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              )}
            </View>
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
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  formContainer: {
    borderRadius: 12,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontWeight: "500",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  otpContainer: {
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
  },
  showButton: {
    padding: 8,
  },
  passwordRules: {
    marginTop: 8,
    marginBottom: 12,
  },
  passwordRule: {
    marginLeft: 8,
    marginBottom: 4,
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  messageContainer: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  messageText: {
    textAlign: "center",
    fontWeight: "500",
  },
});
