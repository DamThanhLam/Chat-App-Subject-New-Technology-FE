import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

interface ButtonProps {
  label?: string;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: object;
  type?: "primary" | "secondary" | "icon";
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ label, onPress, icon, style, type = "primary", children }) => {
  return (
    <TouchableOpacity
      style={[styles.button, styles[type], style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={styles.text}>{children || label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    margin: 5,
  },
  primary: {
    backgroundColor: "#007AFF",
  },
  secondary: {
    backgroundColor: "#D9D9D9",
  },
  icon: {
    marginRight: 5,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default Button;
