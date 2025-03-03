import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Amplify } from '@aws-amplify/core';
import awsConfig from "@/app/configs/aws-config";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from "react-redux";
import { store } from "@/app/redux/store";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./HomeScreen";
import { Ionicons } from "@expo/vector-icons";
import SettingsRoot from "./settings/Root";

Amplify.configure(awsConfig);

const Stack = createBottomTabNavigator();

export default function Root() {
    const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
    const theme = colorScheme == 'dark' ? DarkTheme : DefaultTheme;

    return (
        <Provider store={store}>
            <Stack.Navigator
                screenOptions={({ route }) => ({
                    headerStyle: { backgroundColor: theme.colors.primary }, // Màu xanh giống như hình
                    headerTintColor: theme.colors.text,
                    headerTitleAlign: "left",
                    tabBarIcon: ({ color, size }) => {
                        const iconName =
                            route.name === "home" ? "home" :
                                route.name === "settings-root" ? "settings-outline" :
                                    "help-circle" as const;
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: "gray",
                })}
            >
                <Stack.Screen name="home" component={HomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="settings-root" component={SettingsRoot} options={{ headerShown: false }} />
            </Stack.Navigator>
        </Provider>
    );
}
