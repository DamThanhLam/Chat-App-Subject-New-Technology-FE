// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

const Index = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const router = useRouter();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Image
        source={{ uri: "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" }}
        style={styles.logo}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push("/LoginScreen")}
      >
        <Text style={styles.loginText}>Log in</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.border }]}
        onPress={() => router.push("/RegisterScreen")}
      >
        <Text style={styles.createText}>Create new account</Text>
      </TouchableOpacity>
    </View>
  );
};

Index.options = {
  headerShown: false,
};
export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 200,
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  loginText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  createText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
