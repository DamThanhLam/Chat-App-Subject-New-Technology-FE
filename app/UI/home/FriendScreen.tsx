import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

const FriendScreen = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("friends"); // "friends" or "groups"
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const friendData = [
    { id: "1", name: "Báo", avatar: null, letter: "B" },
    { id: "2", name: "Bình", avatar: null, letter: "B" },
    { id: "3", name: "Hoàng Phúc", avatar: "https://via.placeholder.com/50", letter: "H" },
  ];

  const groupData = [
    { id: "1", name: "Full Name", message: "latest message", time: "1 phút", unread: 5 },
    { id: "2", name: "Full Name", message: "latest message", time: "1 phút", unread: 5 },
    { id: "3", name: "Full Name", message: "latest message", time: "1 phút", unread: 5 },
  ];

  const renderFriendItem = ({ item }: any) => (
    <View style={[styles.friendItem, { borderBottomColor: theme.colors.border }]}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.friendAvatarLetter, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.avatarLetter, { color: theme.colors.text }]}>{item.letter}</Text>
        </View>
      )}
      <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name}</Text>
      <View style={styles.friendActions}>
        <TouchableOpacity>
          <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 10 }}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGroupItem = ({ item }: any) => (
    <View style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}>
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
        <Text style={[styles.chatTime, { color: theme.colors.text, opacity: 0.7 }]}>{item.time}</Text>
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
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

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={activeTab === "friends" ? styles.activeTabText : [styles.tabText, { color: theme.colors.text }]}
          >
            Bạn bè
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "groups" && styles.activeTab]}
          onPress={() => setActiveTab("groups")}
        >
          <Text
            style={activeTab === "groups" ? styles.activeTabText : [styles.tabText, { color: theme.colors.text }]}
          >
            Nhóm
          </Text>
        </TouchableOpacity>
      </View>

      {/* Functional Categories */}
      {activeTab === "friends" ? (
        <View style={styles.functionContainer}>
          <TouchableOpacity style={styles.functionItem}>
            <Ionicons name="person-add-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.functionText, { color: theme.colors.text }]}>Lời mời kết bạn (8)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.functionItem}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.functionText, { color: theme.colors.text }]}>Sinh nhật</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.functionContainer}>
          <TouchableOpacity style={styles.functionItem}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.functionText, { color: theme.colors.text }]}>Tạo nhóm</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {activeTab === "friends" ? (
        <FlatList
          data={friendData}
          keyExtractor={(item) => item.id}
          renderItem={renderFriendItem}
          contentContainerStyle={styles.friendList}
        />
      ) : (
        <FlatList
          data={groupData}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.chatList}
        />
      )}
    </View>
  );
};

export default FriendScreen;

const styles = StyleSheet.create({
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
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "blue", // Giữ màu xanh cho tab active
  },
  tabText: {
    fontSize: 16,
    opacity: 0.7,
  },
  activeTabText: {
    fontSize: 16,
    color: "blue",
    fontWeight: "bold",
  },
  functionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  functionItem: {
    alignItems: "center",
  },
  functionText: {
    fontSize: 14,
    marginTop: 5,
  },
  friendList: {
    paddingHorizontal: 10,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  friendAvatarLetter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: "bold",
  },
  friendName: {
    flex: 1,
    fontSize: 16,
  },
  friendActions: {
    flexDirection: "row",
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
});