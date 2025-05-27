import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  Theme,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "device";

interface ThemeContextProps {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  mode: "device",
  theme: NavigationLightTheme,
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("device");

  useEffect(() => {
    AsyncStorage.getItem("themeMode")
      .then((savedMode) => {
        if (savedMode && ["light", "dark", "device"].includes(savedMode)) {
          setMode(savedMode as ThemeMode);
        }
      })
      .catch((error) => {
        console.error("Error loading theme from AsyncStorage:", error);
      });
  }, []);

  const changeMode = (newMode: ThemeMode) => {
    console.log("Setting theme mode to:", newMode);
    setMode(newMode);
    AsyncStorage.setItem("themeMode", newMode).catch((error) => {
      console.error("Error saving theme to AsyncStorage:", error);
    });
  };

  const theme =
    mode === "device"
      ? systemColorScheme === "dark"
        ? NavigationDarkTheme
        : NavigationLightTheme
      : mode === "dark"
      ? NavigationDarkTheme
      : NavigationLightTheme;

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode: changeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
