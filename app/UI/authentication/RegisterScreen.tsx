import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { Auth } from '@aws-amplify/auth';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

// Định nghĩa kiểu cho state
interface FormState {
  fullName: string;
  phone: string;
  countryCode: string; // Mã quốc gia (ví dụ: '+84', '+1', ...)
  password: string;
  confirmPassword: string;
}

interface PasswordRules {
  minLength: boolean; // Ít nhất 8 ký tự
  lowercase: boolean; // Có chữ cái thường
  uppercase: boolean; // Có chữ cái in hoa
  symbol: boolean; // Có ký tự đặc biệt
}

interface Errors {
  fullName?: string;
  phone?: string;
  countryCode?: string;
  password?: string;
  confirmPassword?: string;
  email?: String
}

const RegisterScreen: React.FC = ({ navigation }: any) => {
  const route = useRoute();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const [form, setForm] = useState<FormState & { email: string }>({
    fullName: '',
    phone: '',
    countryCode: '+84',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    symbol: false,
  });

  // Kiểm tra dữ liệu từ route (nếu có, ví dụ sau khi quay lại từ OTP)
  useEffect(() => {
    const data = (route.params as { data: any })?.data;
    if (data) {
      setForm((prevForm) => ({
        ...prevForm,
        ...data, // Ghi đè các giá trị từ data nếu có
      }));
    }
  }, [route.params]);

  // Danh sách mã quốc gia (có thể mở rộng)
  const countryCodes = [
    { label: 'Vietnam (+84)', value: '+84' },
    // { label: 'United Kingdom (+44)', value: '+44' },
    // { label: 'Japan (+81)', value: '+81' },
  ];

  // Hàm kiểm tra các quy tắc mật khẩu
  const checkPasswordRules = (password: string) => {
    const minLength = password.length >= 8;
    const lowercase = /[a-z]/.test(password);
    const uppercase = /[A-Z]/.test(password);
    const symbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);

    setPasswordRules({
      minLength,
      lowercase,
      uppercase,
      symbol,
    });
  };


  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateFields = (): boolean => {
    let newErrors: Errors & { email?: string } = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Please enter complete information';
    if (!form.phone.trim()) newErrors.phone = 'Please enter complete information';
    if (!form.email.trim()) newErrors.email = 'Please enter email';
    else if (!validateEmail(form.email)) newErrors.email = 'Invalid email format';
    if (!form.password.trim()) newErrors.password = 'Please enter complete information';
    if (!form.confirmPassword.trim()) newErrors.confirmPassword = 'Please enter complete information';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && Object.values(passwordRules).every(Boolean);
  };

  const handleRegister = async () => {
    if (validateFields()) {
      try {
        const fullPhone = `${form.countryCode}${form.phone}`; // Tạo số điện thoại đầy đủ
        const { user } = await Auth.signUp({
          username: form.email, // Sử dụng số điện thoại đầy đủ làm username
          password: form.password,
          attributes: {
            name: form.fullName,
            phone_number: fullPhone, 
            email: form.email
          },
        });
        console.log(user)
        // Chuyển đến màn hình OTP để xác nhận
        navigation.navigate('otp-verification', { user: user }); // Truyền trực tiếp data qua params
      } catch (error: any) {
        Alert.alert('Lỗi', error.message);
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
        {errors.fullName && (
          <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.fullName}</Text>
        )}
      </View>
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
        {errors.email && (
          <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.email}</Text>
        )}
      </View>
      {/* Phone with Country Code */}
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
        {errors.phone && (
          <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.phone}</Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Password:</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={form.password}
          onChangeText={(text) => {
            setForm({ ...form, password: text });
            checkPasswordRules(text); // Kiểm tra quy tắc mật khẩu khi nhập
          }}
          placeholder="Enter password"
          secureTextEntry
          placeholderTextColor={theme.colors.text}
        />
        <View style={styles.passwordRules}>
          <Text style={{ color: theme.colors.text }}>
            {passwordRules.minLength ? '✔' : '─'} Password must be at least 8 characters
          </Text>
          <Text style={{ color: theme.colors.text }}>
            {passwordRules.lowercase ? '✔' : '─'} Use a lowercase letter
          </Text>
          <Text style={{ color: theme.colors.text }}>
            {passwordRules.uppercase ? '✔' : '─'} Use an uppercase letter
          </Text>
          <Text style={{ color: theme.colors.text }}>
            {passwordRules.symbol ? '✔' : '─'} Use a symbol
          </Text>
        </View>
        {errors.password && (
          <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.password}</Text>
        )}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={{ color: theme.colors.text }}>Confirm password:</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={form.confirmPassword}
          onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
          placeholder="Confirm password"
          secureTextEntry
          placeholderTextColor={theme.colors.text}
        />
        {errors.confirmPassword && (
          <Text style={[styles.errorText, { color: theme.colors.notification }]}>{errors.confirmPassword}</Text>
        )}
      </View>

      {/* Register Button */}
      <Button
        title="Register"
        onPress={handleRegister}
        color={theme.colors.primary}
      />

      {/* Sign in Link */}
      <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
        <Text style={[styles.signInText, { color: theme.colors.primary }]}>or Sign in</Text>
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
    fontWeight: 'bold',
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginRight: 10,
    overflow: 'hidden',
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
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
});

export default RegisterScreen;