import * as React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import {useColorScheme} from '@/hooks/useColorScheme';
import Index from './index';
import Root from './UI/authentication/Root';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FriendScreen from "./UI/authentication/FriendScreen";

const Stack = createNativeStackNavigator();

// Ngăn splash screen tự động ẩn trước khi ứng dụng tải xong
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  console.trace("Stack Trace của RootLayout.js");

  // React.useEffect(() => {
  //   async function hideSplashScreen() {
  //     await SplashScreen.hideAsync();
  //   }
  //   hideSplashScreen();
  // }, []);

  return (
    <NavigationThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack.Navigator >
        <Stack.Screen name="friend" component={FriendScreen}  options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationThemeProvider>
  );
}
