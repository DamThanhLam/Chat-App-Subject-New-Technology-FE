import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

const Index = ({ navigation }: any) => {
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Biểu tượng tin nhắn */}
      <Image
        source={{
          uri: "https://cdn-icons-png.flaticon.com/512/1380/1380338.png",
        }}
        style={styles.logo}
      />
      {/* Nút Login */}
      <TouchableOpacity
        style={[styles.button, styles.loginButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("app", { screen: "login" })}
      >
        <Text style={styles.loginText}>Log in</Text>
      </TouchableOpacity>
      {/* Nút Create Account */}
      <TouchableOpacity
        style={[styles.button, styles.createButton, { backgroundColor: theme.colors.border }]}
        onPress={() => navigation.navigate("app", { screen: "register" })}
      >
        <Text style={styles.createText}>Create new account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 200,
  },
  button: {
    width: "80%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  loginButton: {
    // backgroundColor sẽ được đặt động qua inline style
  },
  loginText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  createButton: {
    // backgroundColor sẽ được đặt động qua inline style
  },
  createText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
});