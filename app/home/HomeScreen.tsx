// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { router } from "expo-router";

const HomeScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState("");
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const data = [
    { id: "1", name: "Full Name", message: "latest message", time: "1 phút", unread: 5 },
    { id: "2", name: "Full Name", message: "latest message", time: "1 phút", unread: 3 },
    { id: "3", name: "Full Name", message: "latest message", time: "1 phút", unread: 2 },
    { id: "4", name: "Full Name", message: "latest message", time: "1 phút", unread: 1 },
  ];

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => {
        router.push("/ChatScreen",{params:{friendId: item.id}});
      }}
    >
      <Image
        source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
        style={styles.avatar}
      />
      <View style={styles.chatDetails}>
        <Text style={[styles.chatName, { color: theme.colors.text }]}>{item.name}</Text>
        <Text style={[styles.chatMessage, { color: theme.colors.text, opacity: 0.7 }]}>
          {item.message}
        </Text>
      </View>
      <View style={styles.chatMeta}>
        <Text style={[styles.chatTime, { color: theme.colors.text, opacity: 0.7 }]}>
          {item.time}
        </Text>
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
          <TextInput
            placeholder="Search..."
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.colors.text}
          />
          <Ionicons name="search" size={20} color={theme.colors.text} />
        </View>

        {/* Chat List */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatList}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    margin: 10,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  chatList: {
    paddingHorizontal: 10,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  chatDetails: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chatMessage: {
    fontSize: 14,
  },
  chatMeta: {
    alignItems: "flex-end",
  },
  chatTime: {
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: "red", // Giữ màu đỏ cho badge
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  navItem: {
    alignItems: "center",
  },
});