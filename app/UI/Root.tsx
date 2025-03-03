import * as React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import {useColorScheme} from '@/hooks/useColorScheme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import RootHome from './home/Root'
import LoginScreen from './authentication/LoginScreen';
import RegisterScreen from './authentication/RegisterScreen';
import OTPVerificationScreen from './authentication/OTPVerificationScreen';
import ChatScreen from './home/chat/ChatScreen';

const Stack = createNativeStackNavigator();

// Ngăn splash screen tự động ẩn trước khi ứng dụng tải xong
// SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  console.trace("Stack Trace của RootLayout.js");

  // React.useEffect(() => {
  //   async function hideSplashScreen() {
  //     await SplashScreen.hideAsync();
  //   }
  //   hideSplashScreen();
  // }, []);

  return (
    <NavigationThemeProvider
      value={theme}
    >
      <StatusBar style="auto" />
      <Stack.Navigator >
        <Stack.Screen name="home-root" component={RootHome} options={{ headerShown: false }} />
        <Stack.Screen name="login" component={LoginScreen} />
        <Stack.Screen name="register" component={RegisterScreen} />
        <Stack.Screen name="otp-verification" component={OTPVerificationScreen} options={{ headerShown: false,gestureEnabled: false }} />
        <Stack.Screen name='chat' component={ChatScreen}  />
      </Stack.Navigator>
    </NavigationThemeProvider>
  );
}

