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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>App Chat</Text>

      {/* Full Name */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Full name:</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={form.fullName}
          onChangeText={(text) => setForm({ ...form, fullName: text })}
          placeholder="Enter your full name"
          placeholderTextColor={theme.colors.text}
        />
        {errors.fullName && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.fullName}</Text>}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Email:</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={form.email}
          onChangeText={(text) => setForm({ ...form, email: text })}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.colors.text}
        />
        {errors.email && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.email}</Text>}
      </View>

      {/* Phone */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Phone:</Text>
        <View style={styles.phoneInputContainer}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.countryCode}
              onValueChange={(value: string) => setForm({ ...form, countryCode: value })}
              style={[styles.picker, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
            >
              {countryCodes.map((code) => (
                <Picker.Item key={code.value} label={code.label} value={code.value} />
              ))}
            </Picker>
          </View>
          <TextInput
            style={[styles.phoneInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.text}
          />
        </View>
        {errors.phone && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.phone}</Text>}
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Password:</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, flex: 1 }]}
            value={form.password}
            onChangeText={(text) => {
              setForm({ ...form, password: text });
              checkPasswordRules(text);
            }}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            placeholderTextColor={theme.colors.text}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={{ marginLeft: 10, color: theme.colors.primary }}>
              {showPassword ? "HIDE" : "SHOW"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.passwordRules}>
          <Text style={{ color: theme.colors.text }}>{passwordRules.minLength ? "✔" : "─"} At least 8 characters</Text>
          <Text style={{ color: theme.colors.text }}>{passwordRules.lowercase ? "✔" : "─"} Lowercase letter</Text>
          <Text style={{ color: theme.colors.text }}>{passwordRules.uppercase ? "✔" : "─"} Uppercase letter</Text>
          <Text style={{ color: theme.colors.text }}>{passwordRules.symbol ? "✔" : "─"} Symbol</Text>
        </View>
        {errors.password && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.password}</Text>}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Confirm password:</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, flex: 1 }]}
            value={form.confirmPassword}
            onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
            placeholder="Confirm password"
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor={theme.colors.text}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Text style={{ marginLeft: 10, color: theme.colors.primary }}>
              {showConfirmPassword ? "HIDE" : "SHOW"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.confirmPassword}</Text>}
      </View>

      <Button title="Register" onPress={handleRegister} color={theme.colors.primary} />

      <TouchableOpacity onPress={() =>  router.replace("/LoginScreen")}>
        <Text style={[styles.signInText, { color: theme.colors.primary }]}>
          or Sign in
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginRight: 10,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: 120,
  },
  phoneInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
  },
  passwordRules: {
    marginTop: 5,
  },
  signInText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
  },
});

export default RegisterScreen;
