// @ts-nocheck
import { Redirect, Slot, Stack, useRouter, useSegments } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { useEffect } from "react";
import { useAppTheme } from "@/src/theme/theme";

export default function RootLayout() {
  const pathname = usePathname();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <BottomNavBar />
    </>
  );
}

function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.user);
  const { theme } = useAppTheme();

  useEffect(() => {
    if (!user || !user.id) {
      return <Redirect href="/(auth)/LoginScreen" />;
    }
  }, [user]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <TouchableOpacity onPress={() => router.push("/home")} style={styles.tab}>
        <Ionicons
          name="home-outline"
          size={24}
          color={
            pathname === "/home" ? theme.colors.primary : theme.colors.text
          }
        />
        <Text
          style={{
            color:
              pathname === "/home" ? theme.colors.primary : theme.colors.text,
          }}
        >
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/home/FriendScreen")}
        style={styles.tab}
      >
        <Ionicons
          name="people-outline"
          size={24}
          color={
            pathname.includes("FriendScreen")
              ? theme.colors.primary
              : theme.colors.text
          }
        />
        <Text
          style={{
            color: pathname.includes("FriendScreen")
              ? theme.colors.primary
              : theme.colors.text,
          }}
        >
          Friends
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/home/FriendRequestsScreen")}
        style={styles.tab}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={
            pathname.includes("FriendRequestsScreen")
              ? theme.colors.primary
              : theme.colors.text
          }
        />
        <Text
          style={{
            color: pathname.includes("FriendRequestsScreen")
              ? theme.colors.primary
              : theme.colors.text,
          }}
        >
          Requests
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/home/SettingsScreen")}
        style={styles.tab}
      >
        <Ionicons
          name="settings-outline"
          size={24}
          color={
            pathname.includes("SettingsScreen")
              ? theme.colors.primary
              : theme.colors.text
          }
        />
        <Text
          style={{
            color: pathname.includes("SettingsScreen")
              ? theme.colors.primary
              : theme.colors.text,
          }}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: "row",
    borderTopWidth: 1,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
});
