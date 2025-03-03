import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

// Định nghĩa theme tùy chỉnh
const lightTheme = {
  background: "#fff",
  text: "#000",
  card: "#f0f0f0",
  primary: "#007AFF",
  border: "#ccc",
};

const darkTheme = {
  background: "#1c2526",
  text: "#fff",
  card: "#2d3839",
  primary: "#40c4ff",
  border: "#555",
};

// Định nghĩa kiểu cho ThemeContext
interface ThemeContextType {
  isDarkMode: boolean;
  theme: typeof lightTheme;
  toggleTheme: () => void;
}

// Tạo Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme(); // Lấy chế độ hệ thống
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === "dark");

  // Tải trạng thái từ AsyncStorage khi khởi động
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "dark");
        } else {
          setIsDarkMode(systemColorScheme === "dark"); // Mặc định theo hệ thống
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  // Lưu trạng thái khi thay đổi
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem("theme", newMode ? "dark" : "light");
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  // Chọn theme dựa trên isDarkMode
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook để sử dụng ThemeContext
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};