import React, { useState, useMemo } from "react";
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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "aws-amplify";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/redux/slices/UserSlice";
import { router } from "expo-router";
import { getSocket } from "@/src/socket/socket";
import { useAppTheme } from "@/src/theme/theme";

interface SettingsOption {
  id: string;
  name: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isThemeToggle?: boolean;
  screen?: string;
  image?: string;
}

export default function SettingsScreen() {
  const [searchText, setSearchText] = useState("");
  const { mode, setMode, theme } = useAppTheme();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();

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
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: doLogout,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const doLogout = async () => {
    try {
      await Auth.signOut();
      dispatch(
        setUser({
          id: "",
          name: "",
          phoneNumber: "",
          email: null,
          avatarUrl: "",
        })
      );
      router.replace("/");
      const socket = getSocket();
      if (socket) {
        socket.disconnect();
      }
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Lỗi", "Không thể đăng xuất.");
    }
  };

  const toggleThemeMode = () => {
    const newMode =
      mode === "device" ? "light" : mode === "light" ? "dark" : "device";
    console.log("Current mode:", mode, "Switching to:", newMode);
    setMode(newMode);
  };

  const settingsOptions: SettingsOption[] = [
    {
      id: "0",
      name: "Theme",
      icon: "color-palette-outline",
      isThemeToggle: true,
    },
    {
      id: "1",
      name: "Profile",
      icon: "person-outline",
      screen: "/home/ProfileScreen",
      image: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
    },
    {
      id: "2",
      name: "Change Password",
      icon: "key-outline",
      screen: "/home/ChangePasswordScreen",
      image: "https://cdn-icons-png.flaticon.com/512/565/565547.png",
    },
    {
      id: "3",
      name: "Logout",
      icon: "log-out-outline",
    },
  ];

  const filteredOptions = useMemo(() => {
    return settingsOptions.filter((option) =>
      option.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  return (
    <SafeAreaView
      style={[
        styles.safeContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.colors.card,
              marginHorizontal: width >= 768 ? width * 0.1 : 16,
              marginTop: width >= 768 ? 20 : 10,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={width >= 768 ? 24 : 20}
            color={theme.colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.colors.text,
                fontSize: width >= 768 ? 18 : 16,
              },
            ]}
            placeholder="Tìm kiếm..."
            placeholderTextColor={theme.colors.text + "80"}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            {
              paddingHorizontal: width >= 768 ? width * 0.1 : 16,
            },
          ]}
          renderItem={({ item }) => {
            if (item.isThemeToggle) {
              return (
                <TouchableOpacity
                  onPress={toggleThemeMode}
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: theme.colors.card,
                      paddingVertical: width >= 768 ? 18 : 14,
                      marginBottom: width >= 768 ? 12 : 8,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      mode === "light"
                        ? "sunny-outline"
                        : mode === "dark"
                        ? "moon-outline"
                        : "desktop-outline"
                    }
                    size={width >= 768 ? 28 : 24}
                    color={theme.colors.primary}
                    style={styles.itemIcon}
                  />
                  <Text
                    style={[
                      styles.itemText,
                      {
                        color: theme.colors.text,
                        fontSize: width >= 768 ? 18 : 16,
                        marginRight: 8,
                      },
                    ]}
                  >
                    {`Theme: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
                  </Text>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={width >= 768 ? 24 : 20}
                    color={theme.colors.text + "80"}
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  {
                    backgroundColor: theme.colors.card,
                    paddingVertical: width >= 768 ? 18 : 14,
                    marginBottom: width >= 768 ? 12 : 8,
                  },
                  item.name === "Logout" && styles.logoutItem,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.name === "Logout") {
                    handleLogout();
                  } else if (item.screen) {
                    router.push(item.screen);
                  }
                }}
              >
                {item.icon ? (
                  <Ionicons
                    name={item.icon}
                    size={width >= 768 ? 28 : 24}
                    color={
                      item.name === "Logout" ? "#FF4D4D" : theme.colors.primary
                    }
                    style={styles.itemIcon}
                  />
                ) : (
                  item.image && (
                    <Image
                      source={{ uri: item.image }}
                      style={[
                        styles.imageIcon,
                        {
                          width: width >= 768 ? 28 : 24,
                          height: width >= 768 ? 28 : 24,
                        },
                      ]}
                    />
                  )
                )}
                <Text
                  style={[
                    styles.itemText,
                    {
                      color:
                        item.name === "Logout" ? "#FF4D4D" : theme.colors.text,
                      fontSize: width >= 768 ? 18 : 16,
                      marginRight: 8,
                    },
                  ]}
                >
                  {item.name}
                </Text>
                <Ionicons
                  name="chevron-forward-outline"
                  size={width >= 768 ? 24 : 20}
                  color={
                    item.name === "Logout"
                      ? "#FF4D4D"
                      : theme.colors.text + "80"
                  }
                  style={styles.chevronIcon}
                />
              </TouchableOpacity>
            );
          }}
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
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
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
    marginRight: 16,
  },
  imageIcon: {
    resizeMode: "contain",
    marginRight: 16,
  },
  itemText: {
    flex: 1,
    fontWeight: "500",
  },
  chevronIcon: {
    marginLeft: 8,
  },
});
