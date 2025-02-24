import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import LoginScreen from "./LoginScreen"; // Giả sử đây là màn hình login của bạn
import { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Amplify } from '@aws-amplify/core';
import awsConfig from "@/app/configs/aws-config";
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegisterScreen from "./RegisterScreen";
import OTPVerificationScreen from "./OTPVerificationScreen";
import { Provider } from "react-redux";
import { store } from "@/app/redux/store";

Amplify.configure(awsConfig);

const Stack = createNativeStackNavigator();

export default function Root() {
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme == 'dark' ? DarkTheme : DefaultTheme;

  return (
    <Provider store={store}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary }, // Màu xanh giống như hình
          headerTintColor: theme.colors.text,
          headerTitleAlign: "left",
        }}
      >
        <Stack.Screen name="login" component={LoginScreen} />
        <Stack.Screen name="register" component={RegisterScreen} />
        <Stack.Screen name="otp-verification" component={OTPVerificationScreen} options={{ headerShown: false,gestureEnabled: false }} />
      </Stack.Navigator>
    </Provider>
  );
}
