import {
    NavigationContainer,
    DarkTheme,
    DefaultTheme,
  } from "@react-navigation/native";
  import { useColorScheme } from "react-native";
  import { createNativeStackNavigator } from "@react-navigation/native-stack";
  import { Amplify } from "@aws-amplify/core";
  import awsConfig from "@/app/configs/aws-config";
  import { Provider } from "react-redux";
  import { store } from "@/app/redux/store";
import SettingsScreen from "./SettingsSreen";
import ProfileScreen from "./ProfileScreen";
import ChangePasswordScreen from "./ChangePasswordScreen";
  
  Amplify.configure(awsConfig);
  
  const Stack = createNativeStackNavigator();
  
  export default function Root() {
    const colorScheme = useColorScheme();
    const theme = colorScheme == "dark" ? DarkTheme : DefaultTheme;
  
    return (
      <Provider store={store}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.primary }, // Màu xanh giống như hình
            headerTintColor: theme.colors.text,
            headerTitleAlign: "left",
          }}
          initialRouteName="settings"
        >
            <Stack.Screen name="settings" component={SettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="profile" component={ProfileScreen} />
            <Stack.Screen name="change-password" component={ChangePasswordScreen} />
            
        </Stack.Navigator>
      </Provider>
    );
  }
  