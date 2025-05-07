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
  useWindowDimensions,
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
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
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
      router.replace("/");
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
      screen: "",
      image: "",
    },
  ];

  const filteredOptions = settingsOptions.filter((option) =>
    option.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

  return (
    <SafeAreaView
      style={[
        styles.safeContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Search Bar */}
        <View style={[
          styles.searchContainer, 
          { 
            backgroundColor: theme.colors.card,
            marginHorizontal: isLargeScreen ? width * 0.1 : 16,
            marginTop: isLargeScreen ? 20 : 10,
          }
        ]}>
          <Ionicons
            name="search"
            size={isLargeScreen ? 24 : 20}
            color={theme.colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput, 
              { 
                color: theme.colors.text,
                fontSize: isLargeScreen ? 18 : 16,
              }
            ]}
            placeholder="Tìm kiếm..."
            placeholderTextColor={theme.colors.text + '80'}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Settings List */}
        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            {
              paddingHorizontal: isLargeScreen ? width * 0.1 : 16,
            }
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.listItem,
                { 
                  backgroundColor: theme.colors.card,
                  paddingVertical: isLargeScreen ? 18 : 14,
                  marginBottom: isLargeScreen ? 12 : 8,
                },
                item.name === "Logout" && styles.logoutItem,
              ]}
              activeOpacity={0.7}
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
                  size={isLargeScreen ? 28 : 24}
                  color={item.name === "Logout" ? "#FF4D4D" : theme.colors.primary}
                  style={styles.itemIcon}
                />
              ) : (
                <Image
                  source={{ uri: item.image }}
                  style={[
                    styles.imageIcon,
                    {
                      width: isLargeScreen ? 28 : 24,
                      height: isLargeScreen ? 28 : 24,
                    }
                  ]}
                />
              )}
              <Text
                style={[
                  styles.itemText,
                  { 
                    color: item.name === "Logout" ? "#FF4D4D" : theme.colors.text,
                    fontSize: isLargeScreen ? 18 : 16,
                  },
                ]}
              >
                {item.name}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={isLargeScreen ? 24 : 20}
                color={item.name === "Logout" ? "#FF4D4D" : theme.colors.text + '80'}
                style={styles.chevronIcon}
              />
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