import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { useColorScheme } from "react-native";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import OTPVerificationScreen from "./OTPVerificationScreen";
import ChangePasswordScreen from "./ChangePasswordScreen"; // Import màn hình đổi mật khẩu
import ProfileScreen from "../profile/ProfileScreen"; // Import m
import { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Amplify } from "@aws-amplify/core";
import awsConfig from "@/app/configs/aws-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "@/app/redux/store";
import SettingsScreen from "@/app/UI/settings/SettingSreen";

Amplify.configure(awsConfig);

export type RootStackParamList = {
  login: undefined;
  register: undefined;
  "otp-verification": undefined;
  "change-password": undefined;
  profile: undefined;
  settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Root() {
  const colorScheme = useColorScheme();
  const theme = colorScheme == "dark" ? DarkTheme : DefaultTheme;

  return (
    <Provider store={store}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: theme.colors.text,
            headerTitleAlign: "left",
          }}
        >
          {/* <Stack.Screen name="login" component={LoginScreen} />
          <Stack.Screen name="register" component={RegisterScreen} />
          <Stack.Screen
            name="otp-verification"
            component={OTPVerificationScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          /> */}
          <Stack.Screen name="settings" component={SettingsScreen} />
          <Stack.Screen
            name="change-password"
            component={ChangePasswordScreen}
          />
          <Stack.Screen name="profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
