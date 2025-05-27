// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, useWindowDimensions, StatusBar } from 'react-native';
import { BackHandler } from 'react-native';
import { Auth } from '@aws-amplify/auth';
import { useDispatch, useSelector } from 'react-redux';
import { OtpInput } from 'react-native-otp-entry';
import timer from 'react-native-timer';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { RootState } from '@/src/redux/store';
import { useAppTheme } from '@/src/theme/theme'; 

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [otp, setOtp] = useState('');
  const [resendTime, setResendTime] = useState(30);
  const [resetKey, setResetKey] = useState(0);
  const dispatch = useDispatch();
  const otpRef = useRef<any>(null);
  const { data } = useLocalSearchParams();
  const [userSend, setUserSend] = useState(null);
  const userStore = useSelector((state: RootState) => state.user);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();

  useEffect(() => {
    if (data) {
      setUserSend(JSON.parse(data as string));
    }
  }, [data]);

  useEffect(() => {
    if (userStore && userStore.id) {
      router.replace('/home');
    }
  }, [userStore]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const backAction = () => true;
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, []);

  useEffect(() => {
    timer.clearInterval('resendTimer');
    return () => timer.clearInterval('resendTimer');
  }, []);

  useEffect(() => {
    startCountdown();
  }, []);

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
        if (!userSend?.email) {
          showDialog('Lỗi!', 'Không nhận được thông tin tài khoản.');
          return;
        }
        await Auth.confirmSignUp(userSend.email, code);
        setIsSuccessModalVisible(true);
      } catch (error: any) {
        showDialog('Lỗi!', error.message || 'Xác nhận OTP thất bại.');
      }
    } else {
      showDialog('Lỗi!', 'Vui lòng nhập đủ 6 số OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (!userSend?.email) {
      setDialog({ visible: true, title: 'Lỗi!', message: 'Không nhận được thông tin số điện thoại.' });
      return;
    }
    try {
      await Auth.resendSignUp(userSend.email);
      setResetKey((prev) => prev + 1);
      setDialog({ visible: true, title: 'Thành công', message: 'Mã OTP đã được gửi lại!' });
      startCountdown();
    } catch (error: any) {
      setDialog({ visible: true, title: 'Lỗi!', message: error.message || 'Gửi lại OTP thất bại.' });
    }
  };

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.contentContainer,
          {
            width: isLargeScreen ? '80%' : '100%',
            maxWidth: 500,
        paddingHorizontal: isLargeScreen ? 40 : 24
          },
        ]}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Ionicons
            name="lock-closed"
            size={isLargeScreen ? 48 : 40}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
            fontSize: isLargeScreen ? 32 : 28
              },
            ]}
          >
            Xác thực OTP
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.text,
            fontSize: isLargeScreen ? 18 : 16
              },
            ]}
          >
            Nhập mã OTP được gửi đến {'\n'}
            <Text style={[styles.emailText, { color: theme.colors.primary }]}>
              {userSend?.email || 'email của bạn'}
            </Text>
          </Text>
        </View>

        {/* OTP Input Section */}
        <View style={styles.otpSection}>
          <OtpInput
            key={resetKey}
            numberOfDigits={6}
            onTextChange={setOtp}
            onFilled={handleVerifyOtp}
            focusColor={theme.colors.primary}
            theme={{
              containerStyle: styles.otpContainer,
              pinCodeContainerStyle: [
                styles.otpBox,
                {
                  width: isSmallScreen ? 40 : 48,
                  height: isSmallScreen ? 40 : 48,
                  borderColor: theme.colors.text + '20',
                  backgroundColor: theme.colors.card,
                },
              ],
              pinCodeTextStyle: {
                fontSize: isLargeScreen ? 20 : 18,
                color: theme.colors.text,
                fontWeight: '600'
              },
              placeholderTextStyle: {
                color: theme.colors.text + '80',
              },
            }}
            type="numeric"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            disabled={isResendDisabled}
            onPress={handleResendOtp}
            style={styles.resendButton}
          >
            <Text
              style={[
                styles.resendText,
                {
                  color: isResendDisabled ? theme.colors.text + '80' : theme.colors.primary,
                  fontSize: isLargeScreen ? 16 : 14,
                },
              ]}
            >
              {isResendDisabled ? `Gửi lại OTP sau ${resendTime}s` : 'Gửi lại mã OTP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.replace({ pathname: '/RegisterScreen', params: { data: JSON.stringify(userSend) } })
            }
            style={styles.changeEmailButton}
          >
            <Text
              style={[
                styles.changeEmailText,
                {
                  color: theme.colors.primary,
                  fontSize: isLargeScreen ? 16 : 14,
                },
              ]}
            >
              Thay đổi email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            {
              backgroundColor: theme.colors.primary,
              paddingVertical: isLargeScreen ? 18 : 14,
            },
          ]}
          onPress={() => handleVerifyOtp(otp)}
        >
          <Text
            style={[
              styles.verifyButtonText,
              {
                fontSize: isLargeScreen ? 16 : 14,
              },
            ]}
          >
            Xác nhận
          </Text>
          <Ionicons name="chevron-forward-outline" size={isLargeScreen ? 24 : 20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      {isSuccessModalVisible && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              styles.modalContent,
              {
                width: isLargeScreen ? '50%' : '80%',
                maxWidth: 400,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: isLargeScreen ? 18 : 16 }]}>
              Thành công
            </Text>
            <Text
              style={[
                styles.modalMessage,
                { color: theme.colors.text},
              ]}
            >
              Xác nhận OTP thành công! Vui lòng đăng nhập.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                setIsSuccessModalVisible(false);
                router.replace('/LoginScreen');
              }}
            >
              <Text style={[styles.modalButtonText, { fontSize: isLargeScreen ? 16 : 14 }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
  },
  otpSection: {
    width: '100%',
    marginBottom: 32,
  },
  otpContainer: {
    width: '100%',
    justifyContent: 'space-between',
  },
  otpBox: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  resendButton: {
    padding: 8,
  },
  resendText: {
    fontWeight: '500',
  },
  changeEmailButton: {
    padding: 8,
  },
  changeEmailText: {
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  verifyButton: {
    width: '100%',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OTPVerificationScreen;