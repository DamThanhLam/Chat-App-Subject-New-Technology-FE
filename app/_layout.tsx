import "../src/configs/aws-config";
import { useFonts } from "expo-font";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { Provider, useSelector } from "react-redux"; // ✅ Import
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor, RootState } from "@/src/redux/store"; // ✅ Import store
import CallDialog from "@/components/CallDialog";
import { useAppTheme, ThemeProvider } from "@/src/theme/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme } = useAppTheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      {" "}
      {/* ✅ WRAP App with Redux Provider */}
      <PersistGate loading={null} persistor={persistor}>
        <CallDialog />
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
