// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/src/theme/theme";

const Index = () => {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.content,
          { width: isLargeScreen ? "60%" : "90%", maxWidth: 500 },
        ]}
      >
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/1380/1380338.png",
          }}
          style={[
            styles.logo,
            {
              width: isLargeScreen ? 180 : 120,
              height: isLargeScreen ? 180 : 120,
              marginBottom: isLargeScreen ? height * 0.15 : height * 0.1,
            },
          ]}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                paddingVertical: isLargeScreen ? 18 : 15,
              },
            ]}
            onPress={() => router.push("/LoginScreen")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.loginText,
                {
                  fontSize: isLargeScreen ? 18 : 16,
                  color: theme.dark ? "#fff" : "#fff",
                },
              ]}
            >
              Log in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.primary,
                paddingVertical: isLargeScreen ? 18 : 15,
              },
            ]}
            onPress={() => router.push("/RegisterScreen")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.createText,
                {
                  color: theme.colors.primary,
                  fontSize: isLargeScreen ? 18 : 16,
                },
              ]}
            >
              Create new account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    resizeMode: "contain",
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginText: {
    fontWeight: "600",
  },
  createText: {
    fontWeight: "600",
  },
});
