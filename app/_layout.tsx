import * as React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/useColorScheme";
// import Index from './index';
import Root from "./UI/authentication/Root";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChangePasswordScreen from "./UI/authentication/ChangePasswordScreen";
import ProfileScreen from "./UI/profile/ProfileScreen";
import SettingsScreen from "@/app/UI/settings/SettingSreen";
export type RootStackParamList = {
  login: undefined;
  register: undefined;
  "otp-verification": undefined;
  "change-password": undefined;
  profile: undefined;
  settings: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <NavigationThemeProvider
      value={colorScheme === "light" ? DarkTheme : DefaultTheme}
    >
      <StatusBar style="auto" />
      <Stack.Navigator>
        {/* <Stack.Screen name="index" component={Index}  options={{ headerShown: false }} /> */}
        {/* <Stack.Screen
          name="auth"
          component={Root}
          options={{ headerShown: false }}
        /> */}
        <Stack.Screen name="settings" component={SettingsScreen} />
        <Stack.Screen name="profile" component={ProfileScreen} />
        <Stack.Screen name="change-password" component={ChangePasswordScreen} />
      </Stack.Navigator>
    </NavigationThemeProvider>
  );
}
