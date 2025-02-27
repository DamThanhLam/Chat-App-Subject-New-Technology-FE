import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "@aws-amplify/auth";
import { useDispatch } from "react-redux";
import { setUser } from "@/app/redux/slices/UserSlice";

export default function LoginScreen({ navigation }: any) {
  const colorScheme = useColorScheme();
  const dispatch = useDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const handleLogin = async () => {
    try {
      const user = await Auth.signIn(username, password);
      dispatch(
        setUser({
          id: user.username,
          name: user.name,
          email: null,
          phoneNumber: user.phone_number,
        })
      );
      Alert.alert("Thành công", `Xin chào ${user.name}`);
      navigation.navigate("Home"); // Điều hướng sang HomeScreen
    } catch (error: any) {
      if (error.code === "UserNotConfirmedException") {
        navigation.navigate("otp-verification", { user: { username: username } });
      }
      Alert.alert("Lỗi", error.message);
    }
  };

  return (
    <NavigationThemeProvider value={theme}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Input Fields */}
        <TextInput
          placeholder="Phone number/email"
          style={[styles.input, { color: theme.colors.text }]}
          placeholderTextColor={theme.colors.text}
          value={username}
          onChangeText={setUsername}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={[styles.input, { flex: 1, color: theme.colors.text }]}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={theme.colors.text}
          />
          <TouchableOpacity>
            <Text style={styles.showText}>SHOW</Text>
          </TouchableOpacity>
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleLogin}
        >
          <Ionicons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "gray",
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  showText: {
    color: "gray",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 10,
  },
  nextButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});