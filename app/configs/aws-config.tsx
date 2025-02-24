import AsyncStorage from '@react-native-async-storage/async-storage';
const awsConfig = {
    Auth: {
      region: 'ap-southeast-1', // Thay bằng region của bạn
      userPoolId: 'ap-southeast-1_ndsmcRLds', // Thay bằng User Pool ID
      userPoolWebClientId: 'kfi2pfo7movb0ckei37gbf75', // Thay bằng App Client ID
      mandatorySignIn: false, // Tùy chọn
    },
    Storage: AsyncStorage, // Để lưu trữ thông tin phiên
  };
  
  export default awsConfig;