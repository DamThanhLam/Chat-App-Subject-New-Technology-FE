// @ts-nocheck
import { Redirect, Slot, Stack, useRouter, useSegments } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { useEffect } from "react";

export default function RootLayout() {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/home/settings"); //

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {!hideNav && <BottomNavBar />}
    </>
  );
}

function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname(); // để biết đang ở route nào
  const user = useSelector((state: RootState) => state.user);
  // Nếu chưa đăng nhập (user.id rỗng), chuyển hướng sang màn hình login

  useEffect(() => {
    if (!user.id) {
      return <Redirect href="/(auth)/LoginScreen" />;
    }
  }, [user.id]);
  useEffect(()=>{
    router.push("/home/HomeScreen")
  },[])
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.push("/home/HomeScreen")} style={styles.tab}>
        <Ionicons
          name="home-outline"
          size={24}
          color={pathname.includes("HomeScreen") ? "#007AFF" : "#666"}
        />
        <Text>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/home/FriendScreen")} style={styles.tab}>
        <Ionicons
          name="people-outline"
          size={24}
          color={pathname.includes("FriendScreen") ? "#007AFF" : "#666"}
        />
        <Text>Friends</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/home/FriendRequestsScreen")} style={styles.tab}>
        <Ionicons
          name="notifications-outline"
          size={24}
          color={pathname.includes("FriendRequestsScreen") ? "#007AFF" : "#666"}
        />
        <Text>Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/home/SettingsScreen")} style={styles.tab}>
        <Ionicons
          name="settings-outline"
          size={24}
          color={pathname.includes("SettingsScreen") ? "#007AFF" : "#666"}
        />
        <Text>Settings</Text>
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
    backgroundColor: "#fff",
    borderTopColor: "#ddd",
    borderTopWidth: 1,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
});