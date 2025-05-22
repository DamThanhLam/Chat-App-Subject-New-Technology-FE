// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Auth } from "@aws-amplify/auth";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";

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

const RegisterScreen: React.FC = ({ navigation }: any) => {
  const route = useRoute();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const router = useRouter();
  const params = useLocalSearchParams();
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

  const data = (route.params as { data: any })?.data;

  useEffect(() => {
    if (userStore.id) {
      router.replace("/home");
    }
  }, [userStore.id]);

  useEffect(() => {
    if (data) {
      setForm((prevForm) => ({
        ...prevForm,
        ...data,
      }));
    }
  }, [route.params]);

  const countryCodes = [{ label: "Vietnam (+84)", value: "+84" }];

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
    if (!form.password.trim())
      newErrors.password = "Please enter a password";
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
  const isSmallScreen = width <= 320;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: theme.colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[
          styles.container,
          { 
            paddingHorizontal: isLargeScreen ? width * 0.15 : 24,
            paddingTop: isLargeScreen ? 40 : 24,
          }
        ]}>
          {/* App Logo/Title */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>App Chat</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Full Name:</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: errors.fullName ? theme.colors.notification : theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.card,
                  }
                ]}
                value={form.fullName}
                onChangeText={(text) => setForm({ ...form, fullName: text })}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.text + '80'}
              />
              {errors.fullName && (
                <Text style={[styles.errorText, { color: theme.colors.notification }]}>
                  {errors.fullName}
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Email:</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: errors.email ? theme.colors.notification : theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.card,
                  }
                ]}
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.text + '80'}
              />
              {errors.email && (
                <Text style={[styles.errorText, { color: theme.colors.notification }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number:</Text>
              <View style={styles.phoneInputContainer}>
                <View style={[
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
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    { 
                      borderColor: errors.phone ? theme.colors.notification : theme.colors.border,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.card,
                    }
                  ]}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.text + '80'}
                />
              </View>
              {errors.phone && (
                <Text style={[styles.errorText, { color: theme.colors.notification }]}>
                  {errors.phone}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Password:</Text>
              <View style={[
                styles.passwordInputContainer,
                { 
                  borderColor: errors.password ? theme.colors.notification : theme.colors.border,
                  backgroundColor: theme.colors.card,
                }
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.colors.text }]}
                  value={form.password}
                  onChangeText={(text) => {
                    setForm({ ...form, password: text });
                    checkPasswordRules(text);
                  }}
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor={theme.colors.text + '80'}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.showButton}
                >
                  <Text style={[styles.showText, { color: theme.colors.primary }]}>
                    {showPassword ? "HIDE" : "SHOW"}
                  </Text>
                </TouchableOpacity>
              </View>
              

        {/* Chỉ hiển thị quy tắc nếu có nhập password và có ít nhất 1 quy tắc không thỏa mãn */}
        {form.password && !Object.values(passwordRules).every(Boolean) && (
          <View style={styles.passwordRules}>
            {!passwordRules.minLength && (
              <Text style={{ color: theme.colors.text }}>
                ─ At least 8 characters
              </Text>
            )}
            {!passwordRules.lowercase && (
              <Text style={{ color: theme.colors.text }}>
                ─ Lowercase letter
              </Text>
            )}
            {!passwordRules.uppercase && (
              <Text style={{ color: theme.colors.text }}>
                ─ Uppercase letter
              </Text>
            )}
            {!passwordRules.symbol && (
              <Text style={{ color: theme.colors.text }}>
                ─ Symbol
              </Text>
            )}
          </View>
        )}
        {errors.password && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.password}</Text>}
      </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Confirm Password</Text>
              <View style={[
                styles.passwordInputContainer,
                { 
                  borderColor: errors.confirmPassword ? theme.colors.notification : theme.colors.border,
                  backgroundColor: theme.colors.card,
                }
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.colors.text }]}
                  value={form.confirmPassword}
                  onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                  placeholder="Confirm password"
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={theme.colors.text + '80'}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.showButton}
                >
                  <Text style={[styles.showText, { color: theme.colors.primary }]}>
                    {showConfirmPassword ? "HIDE" : "SHOW"}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorText, { color: theme.colors.notification }]}>
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={[styles.signInText, { color: theme.colors.text }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.replace("/LoginScreen")}>
                <Text style={[styles.signInLink, { color: theme.colors.primary }]}>
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
  },
  container: {
    flex: 1,
    paddingBottom: 40,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  formContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeContainer: {
    width: 120,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  showButton: {
    padding: 8,
  },
  showText: {
    fontSize: 14,
    fontWeight: '500',
  },
  passwordRulesContainer: {
    marginTop: 8,
  },
  passwordRulesTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  passwordRules: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: 12,
  },
  ruleText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;