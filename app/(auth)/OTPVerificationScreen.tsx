// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, useColorScheme, Alert } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Auth } from '@aws-amplify/auth';
import { useDispatch, useSelector } from 'react-redux';
import { OtpInput } from 'react-native-otp-entry';
import timer from 'react-native-timer';
import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation, useLocalSearchParams, Redirect } from "expo-router";
import { RootState } from '@/src/redux/store';

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [otp, setOtp] = useState("");
  const [resendTime, setResendTime] = useState(30);
  const [resetKey, setResetKey] = useState(0);
  const [dialog, setDialog] = useState({ visible: false, title: '', message: '' });
  const data = (params as { data: any })?.data;
  const dispatch = useDispatch();
  const otpRef = useRef<any>(null);
  const userStore = useSelector((state: RootState) => state.user);
  const { user } = useLocalSearchParams();
  const parsedUser = user ? JSON.parse(user as string) : null;
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

  useEffect(() => {
    if (userStore.id) {
      router.replace('/home');
    }
  }, [userStore.id]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const backAction = () => true;
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => {
        backHandler.remove();
      };
    }
  }, []);

  useEffect(() => {
    timer.clearInterval('resendTimer');
    return () => {
      timer.clearInterval('resendTimer');
    };
  }, []);

  useEffect(() => {
    if (parsedUser?.username) {
      handleResendOtp();
    }
  }, [parsedUser?.username]);

  const startCountdown = () => {
    setResendTime(30);
    setIsResendDisabled(true);
    timer.setInterval(
      'resendTimer',
      () => {
        setResendTime((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            timer.clearInterval('resendTimer');
            setIsResendDisabled(false);
            return 0;
          }
        });
      },
      1000
    );
  };

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const showDialog = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length === 6) {
      try {
        if (!parsedUser?.username) {
          showDialog('Lỗi!', 'Không nhận được thông tin tài khoản.');
          return;
        }

        await Auth.confirmSignUp(parsedUser.username, code);

        // Hiển thị dialog thành công, chờ người dùng nhấn "Đóng" mới replace
        setIsSuccessModalVisible(true);
      } catch (error: any) {
        showDialog('Lỗi!', error.message || 'Xác nhận OTP thất bại.');
      }
    } else {
      showDialog('Lỗi!', 'Vui lòng nhập đủ 6 số OTP.');
    }
  };


  const handleResendOtp = async () => {
    if (!parsedUser?.username) {
      setDialog({ visible: true, title: 'Lỗi!', message: 'Không nhận được thông tin số điện thoại.' });
      return;
    }

    try {
      await Auth.resendSignUp(parsedUser.username);
      setResetKey((prev) => prev + 1);
      setDialog({ visible: true, title: 'Thành công', message: 'Mã OTP đã được gửi lại!' });
      startCountdown();
    } catch (error: any) {
      setDialog({ visible: true, title: 'Lỗi!', message: error.message || 'Gửi lại OTP thất bại.' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Xác thực OTP</Text>
      <Text style={[styles.subtitle, { color: theme.colors.text }]}>Nhập mã OTP được gửi đến {parsedUser?.username || 'không xác định'}</Text>

      <OtpInput
        key={resetKey}
        numberOfDigits={6}
        onTextChange={setOtp}
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

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => handleVerifyOtp(otp)}
      >
        <Ionicons name="arrow-forward" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity disabled={isResendDisabled} onPress={handleResendOtp}>
        <Text style={[styles.resendText, { color: isResendDisabled ? 'gray' : theme.colors.primary }]}>
          {isResendDisabled ? `Gửi lại OTP sau ${resendTime}s` : 'Gửi lại mã OTP'}
        </Text>
      </TouchableOpacity>

      <Text
        style={[styles.resendText, { color: theme.colors.primary, textDecorationLine: 'underline' }]}
        onPress={() => router.push({ pathname: '/RegisterScreen', params: { user, data } })}
      >
        Thay đổi {parsedUser?.username}
      </Text>

      {isSuccessModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thành công</Text>
            <Text style={styles.modalMessage}>Xác nhận OTP thành công! Vui lòng đăng nhập.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setIsSuccessModalVisible(false);
                router.replace('/LoginScreen');
              }}
            >
              <Text style={styles.modalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  otpContainer: { width: '100%', height: 100 },
  otpBox: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    fontSize: 18,
    textAlign: 'center',
  },
  resendText: { fontSize: 16, marginTop: 10 },
  nextButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  // ✅ Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});


export default OTPVerificationScreen;