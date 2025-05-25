import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify } from 'aws-amplify';
const awsConfig = {
  Auth: {
    region: 'ap-southeast-1', // Thay bằng region của bạn
    userPoolId: 'ap-southeast-1_fHq2ABxoo', // Thay bằng User Pool ID
    userPoolWebClientId: '5his0fgcddddqdgvt8470ro7bt', // Thay bằng App Client ID
    mandatorySignIn: false, // Tùy chọn
  },
  Storage: AsyncStorage, // Để lưu trữ thông tin phiên
};
Amplify.configure(awsConfig);

export default awsConfig;