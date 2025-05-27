import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { Auth } from "@aws-amplify/auth";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/theme/theme";

interface FormState {
  fullName: string;
  phone: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  email: string;
}

interface PasswordRules {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  symbol: boolean;
}

interface Errors {
  fullName?: string;
  phone?: string;
  countryCode?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
}

const RegisterScreen: React.FC = () => {
  const { theme } = useAppTheme(); // Use custom theme hook
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const userStore = useSelector((state: RootState) => state.user);
  const { width } = useWindowDimensions();

  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    countryCode: "+84",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    symbol: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userStore.id) {
      router.replace("/home");
    }
  }, [userStore.id, router]);

  useEffect(() => {
    try {
      if (data) {
        const parsed = JSON.parse(data as string);
        checkPasswordRules(parsed.password);
        setForm((prevForm) => ({
          ...prevForm,
          ...parsed,
        }));
      }
    } catch (err) {
      console.error("Failed to parse data:", err);
    }
  }, [data]);

  const checkPasswordRules = (password: string) => {
    setPasswordRules({
      minLength: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password),
    });
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateFields = (): boolean => {
    let newErrors: Errors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Please enter full name";
    if (!form.phone.trim()) newErrors.phone = "Please enter phone number";
    if (!form.email.trim()) newErrors.email = "Please enter email";
    else if (!validateEmail(form.email))
      newErrors.email = "Invalid email format";
    if (!form.password.trim()) newErrors.password = "Please enter a password";
    if (!form.confirmPassword.trim())
      newErrors.confirmPassword = "Please confirm password";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return (
      Object.keys(newErrors).length === 0 &&
      Object.values(passwordRules).every(Boolean)
    );
  };

  const handleResendOtp = async (email: string) => {
    try {
      await Auth.resendSignUp(email);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Gửi lại OTP thất bại.");
    }
  };

  const handleRegister = async () => {
    if (validateFields()) {
      try {
        const fullPhone = `${form.countryCode}${form.phone}`;
        const { user } = await Auth.signUp({
          username: form.email,
          password: form.password,
          attributes: {
            name: form.fullName,
            phone_number: fullPhone,
            email: form.email,
          },
        }).catch((e) => {
          console.log(e);
          if (e.name === "UsernameExistsException") {
            handleResendOtp(form.email);
            router.replace({
              pathname: "/OTPVerificationScreen",
              params: {
                data: JSON.stringify(form),
              },
            });
            return;
          }
          throw e;
        });
        router.push({
          pathname: "/OTPVerificationScreen",
          params: {
            user: JSON.stringify(user),
            data: JSON.stringify(form),
          },
        });
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const isLargeScreen = width >= 768;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { backgroundColor: theme.colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.container,
            {
              paddingHorizontal: isLargeScreen ? width * 0.1 : 16,
              paddingTop: isLargeScreen ? 40 : 24,
            },
          ]}
        >
          {/* App Logo/Title */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontSize: isLargeScreen ? 32 : 28,
                },
              ]}
            >
              App Chat
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Full Name:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: errors.fullName
                      ? theme.colors.notification
                      : theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.card,
                    fontSize: isLargeScreen ? 18 : 16,
                    paddingVertical: isLargeScreen ? 16 : 12,
                    fontStyle: "italic",
                  },
                ]}
                value={form.fullName}
                onChangeText={(text) => setForm({ ...form, fullName: text })}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.text + "80"}
              />
              {errors.fullName && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.notification },
                  ]}
                >
                  {errors.fullName}
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Email:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: errors.email
                      ? theme.colors.notification
                      : theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.card,
                    fontSize: isLargeScreen ? 18 : 16,
                    paddingVertical: isLargeScreen ? 16 : 12,
                    fontStyle: "italic",
                  },
                ]}
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.text + "80"}
              />
              {errors.email && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.notification },
                  ]}
                >
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Phone Number:
              </Text>
              <View style={styles.phoneInputContainer}>
                {/* <View style={[
                  styles.countryCodeContainer,
                  { 
                    borderColor: errors.phone ? theme.colors.notification : theme.colors.border,
                    backgroundColor: theme.colors.card,
                  }
                ]}>
                  <Picker
                    selectedValue={form.countryCode}
                    onValueChange={(value: string) => setForm({ ...form, countryCode: value })}
                    style={[styles.picker, { color: theme.colors.text }]}
                    dropdownIconColor={theme.colors.text}
                  >
                    {countryCodes.map((code) => (
                      <Picker.Item key={code.value} label={code.label} value={code.value} />
                    ))}
                  </Picker>
                </View> */}
                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      borderColor: errors.phone
                        ? theme.colors.notification
                        : theme.colors.border,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.card,
                      fontSize: isLargeScreen ? 18 : 16,
                      paddingVertical: isLargeScreen ? 16 : 12,
                      fontStyle: "italic",
                    },
                  ]}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.text + "80"}
                />
              </View>
              {errors.phone && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.notification },
                  ]}
                >
                  {errors.phone}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Password:
              </Text>
              <View
                style={[
                  styles.passwordInputContainer,
                  {
                    borderColor: errors.password
                      ? theme.colors.notification
                      : theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      color: theme.colors.text,
                      fontSize: isLargeScreen ? 18 : 16,
                      fontStyle: "italic",
                    },
                  ]}
                  value={form.password}
                  onChangeText={(text) => {
                    setForm({ ...form, password: text });
                    checkPasswordRules(text);
                  }}
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor={theme.colors.text + "80"}
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
              {form.password &&
                !Object.values(passwordRules).every(Boolean) && (
                  <View style={styles.passwordRules}>
                    {!passwordRules.minLength && (
                      <Text
                        style={[
                          styles.ruleText,
                          {
                            color: theme.colors.text,
                            fontSize: isLargeScreen ? 14 : 12,
                            fontStyle: "italic",
                          },
                        ]}
                      >
                        ─ At least 8 characters
                      </Text>
                    )}
                    {!passwordRules.lowercase && (
                      <Text
                        style={[
                          styles.ruleText,
                          {
                            color: theme.colors.text,
                            fontSize: isLargeScreen ? 14 : 12,
                            fontStyle: "italic",
                          },
                        ]}
                      >
                        ─ Lowercase letter
                      </Text>
                    )}
                    {!passwordRules.uppercase && (
                      <Text
                        style={[
                          styles.ruleText,
                          {
                            color: theme.colors.text,
                            fontSize: isLargeScreen ? 14 : 12,
                            fontStyle: "italic",
                          },
                        ]}
                      >
                        ─ Uppercase letter
                      </Text>
                    )}
                    {!passwordRules.symbol && (
                      <Text
                        style={[
                          styles.ruleText,
                          {
                            color: theme.colors.text,
                            fontSize: isLargeScreen ? 14 : 12,
                            fontStyle: "italic",
                          },
                        ]}
                      >
                        ─ Symbol
                      </Text>
                    )}
                  </View>
                )}
              {errors.password && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.notification },
                  ]}
                >
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Confirm Password
              </Text>
              <View
                style={[
                  styles.passwordInputContainer,
                  {
                    borderColor: errors.confirmPassword
                      ? theme.colors.notification
                      : theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      color: theme.colors.text,
                      fontSize: isLargeScreen ? 18 : 16,
                      fontStyle: "italic",
                    },
                  ]}
                  value={form.confirmPassword}
                  onChangeText={(text) =>
                    setForm({ ...form, confirmPassword: text })
                  }
                  placeholder="Confirm password"
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={theme.colors.text + "80"}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.showButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={isLargeScreen ? 24 : 20}
                    color={theme.colors.text + "80"}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.notification },
                  ]}
                >
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                {
                  backgroundColor: theme.colors.primary,
                  paddingVertical: isLargeScreen ? 16 : 14,
                },
              ]}
              onPress={handleRegister}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.registerButtonText,
                  { fontSize: isLargeScreen ? 18 : 16 },
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text
                style={[
                  styles.signInText,
                  {
                    color: theme.colors.text,
                    fontSize: isLargeScreen ? 16 : 14,
                  },
                ]}
              >
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.replace("/LoginScreen")}>
                <Text
                  style={[
                    styles.signInLink,
                    {
                      color: theme.colors.primary,
                      fontSize: isLargeScreen ? 16 : 14,
                    },
                  ]}
                >
                  SIGN IN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontWeight: "700",
    marginBottom: 8,
  },
  formContainer: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
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
  passwordRules: {
    flexDirection: "column",
    marginTop: 8,
    gap: 8,
  },
  ruleText: {
    fontWeight: "400",
  },
  errorText: {
    fontWeight: "400",
    marginTop: 4,
  },
  registerButton: {
    width: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  registerButtonText: {
    color: "white",
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 4,
  },
  signInText: {
    fontWeight: "400",
  },
  signInLink: {
    fontWeight: "600",
  },
});

export default RegisterScreen;
