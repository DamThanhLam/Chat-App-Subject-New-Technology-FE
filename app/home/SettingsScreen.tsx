// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/redux/slices/UserSlice";
import { router } from "expo-router";
import { getSocket } from "@/src/socket/socket";

export default function SettingsScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState("");
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const dispatch = useDispatch();

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Bạn có chắc muốn đăng xuất tài khoản?");
      if (confirmed) {
        doLogout();
      }
    } else {
      Alert.alert(
        "Đăng xuất",
        "Bạn có chắc muốn đăng xuất tài khoản?",
        [
          {
            text: "No",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: () => {
              doLogout();
            },
          },
        ],
        { cancelable: true }
      );
    }
  };
  
  const doLogout = async () => {
    try {
      await Auth.signOut();
      dispatch(setUser({ id: "", name: "", phoneNumber: "", email: null }));
      router.replace("/"); // hoặc navigation.navigate nếu bạn dùng navigation
      if(getSocket()){
        getSocket().disconnect()
      }
    } catch (error) {
      console.error("Error signing out:", error);
      if (Platform.OS === "web") {
        alert("Không thể đăng xuất.");
      } else {
        Alert.alert("Lỗi", "Không thể đăng xuất.");
      }
    }
  };

  const settingsOptions = [
    {
      id: "1",
      name: "Profile",
      icon: "person",
      screen: "/home/ProfileScreen",
      image: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
    },
    {
      id: "2",
      name: "Change Password",
      icon: "key",
      screen: "/home/ChangePasswordScreen",
      image: "https://cdn-icons-png.flaticon.com/512/565/565547.png",
    },
    {
      id: "3",
      name: "Logout",
      icon: "log-out",
      screen: "", // Không cần route, vì xử lý logout luôn trong onPress
      image: "",
    },
  ];

  const filteredOptions = settingsOptions.filter((option) =>
    option.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView
      style={[
        styles.safeContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Thanh tìm kiếm */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Tìm kiếm..."
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Danh sách cài đặt */}
        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.listItem,
                { backgroundColor: theme.colors.card },
                item.name === "Logout" && styles.logoutItem, // Tùy chỉnh cho Logout
              ]}
              activeOpacity={0.7} // Hiệu ứng nhấn
              onPress={() => {
                if (item.name === "Logout") {
                  handleLogout();
                } else {
                  router.push(item.screen);
                }
              }}
            >
              {item.icon ? (
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.name === "Logout" ? "#FF4D4D" : theme.colors.text}
                  style={styles.itemIcon}
                />
              ) : (
                <Image
                  source={{ uri: item.image }}
                  style={[styles.itemIcon, styles.imageIcon]}
                />
              )}
              <Text
                style={[
                  styles.itemText,
                  { color: item.name === "Logout" ? "#FF4D4D" : theme.colors.text },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "transparent",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoutItem: {
    borderColor: "#FF4D4D",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  itemIcon: {
    marginRight: 12,
  },
  imageIcon: {
    width: 24,
    height: 24,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "500",
  },
});