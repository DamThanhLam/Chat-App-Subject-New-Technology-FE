import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Auth } from '@aws-amplify/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '@/app/redux/slices/UserSlice';
import { OtpInput } from 'react-native-otp-entry';
import timer from 'react-native-timer'; // Import thư viện

const OTPVerificationScreen: React.FC = ({ navigation, route }: any) => {
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [otp, setOtp] = useState("");
  const [resendTime, setResendTime] = useState(30); // Khởi tạo thời gian đếm ngược 30 giây
  const user = (route.params as { user: any })?.user;
  const dispatch = useDispatch();
  const previousRoute = navigation.getState().routes.at(-2)?.name;
  const otpRef = useRef<any>(null);
  const [resetKey, setResetKey] = useState(0);

  // Chặn nút back
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
    });

    return () => {
      backHandler.remove();
      unsubscribe();
      timer.clearInterval('resendTimer'); // Dọn dẹp timer khi component unmount
    };
  }, [navigation]);

  // Tự động gửi OTP lần đầu nếu không phải từ register
  useEffect(() => {
    if (user?.username && previousRoute !== "register") {
      handleResendOtp();
    }
  }, [user?.username]);

  // Hàm bắt đầu đếm ngược
  const startCountdown = () => {
    setResendTime(30); // Reset thời gian về 30 giây
    setIsResendDisabled(true); // Vô hiệu hóa nút gửi lại
    timer.setInterval(
      'resendTimer',
      () => {
        setResendTime((prev) => {
          if (prev > 0) {
            return prev - 1; // Giảm 1 giây
          } else {
            timer.clearInterval('resendTimer'); // Dừng timer khi hết thời gian
            setIsResendDisabled(false); // Kích hoạt nút gửi lại
            return 0;
          }
        });
      },
      1000 // Cập nhật mỗi giây
    );
  };

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const handleVerifyOtp = async (code: string) => {
    if (code.length === 6) {
      try {
        if (!user?.username) {
          Alert.alert('Lỗi!', 'Không nhận được thông tin tài khoản.');
          return;
        }
        await Auth.confirmSignUp(user.username, code);
        navigation.replace('auth',{screen:'login'});
        Alert.alert('Thành công', 'Xác nhận OTP thành công! Vui lòng đăng nhập.');
      } catch (error: any) {
        Alert.alert('Lỗi!', error.message || 'Xác nhận OTP thất bại.');
      }
    } else {
      Alert.alert('Lỗi!', 'Vui lòng nhập đủ 6 số OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (!user?.username) {
      Alert.alert('Lỗi!', 'Không nhận được thông tin số điện thoại.');
      return;
    }

    try {
      await Auth.resendSignUp(user.username); // Uncomment khi dùng API thực tế
      setResetKey((prev) => prev + 1); // Reset OTP input
      Alert.alert('Thành công', 'Mã OTP đã được gửi lại!');
      startCountdown(); // Bắt đầu đếm ngược
    } catch (error: any) {
      Alert.alert('Lỗi!', error.message || 'Gửi lại OTP thất bại.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Xác thực OTP</Text>
      <Text style={[styles.subtitle, { color: theme.colors.text }]}>
        Nhập mã OTP được gửi đến {user?.username || 'không xác định'}
      </Text>

      <OtpInput
        key={resetKey} // Reset OTP input khi gửi lại
        numberOfDigits={6}
        onTextChange={(text) => setOtp(text)}
        onFilled={handleVerifyOtp}
        focusColor="#007AFF"
        theme={{
          containerStyle: styles.otpContainer,
          pinCodeContainerStyle: styles.otpBox,
          pinCodeTextStyle: { fontSize: 18, color: theme.colors.text },
          placeholderTextStyle: { color: theme.colors.text },
        }}
        type="numeric"
      />

      <TouchableOpacity disabled={isResendDisabled} onPress={handleResendOtp}>
        <Text
          style={[
            styles.resendText,
            { color: isResendDisabled ? 'gray' : theme.colors.primary },
          ]}
        >
          {isResendDisabled
            ? `Gửi lại OTP sau ${resendTime}s`
            : 'Gửi lại mã OTP'}
        </Text>
      </TouchableOpacity>
      <Text
        style={[
          styles.resendText,
          { color: theme.colors.primary, textDecorationLine: 'underline' },
        ]}
        onPress={() => navigation.replace("register", { user })}
      >
        Thay đổi {user.username}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  otpContainer: { width: '100%', height: 100 },
  otpBox: { width: 50, height: 50, borderWidth: 1, borderRadius: 5, fontSize: 18, textAlign: 'center' },
  resendText: { fontSize: 16, marginTop: 10 },
});

export default OTPVerificationScreen;