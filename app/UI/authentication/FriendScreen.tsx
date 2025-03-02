import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const FriendScreen = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("friends"); // "friends" or "groups"

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

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.friendAvatarLetter}>
          <Text style={styles.avatarLetter}>{item.letter}</Text>
        </View>
      )}
      <Text style={styles.friendName}>{item.name}</Text>
      <View style={styles.friendActions}>
        <TouchableOpacity>
          <Ionicons name="call-outline" size={20} color="blue" />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 10 }}>
          <Ionicons name="chatbubble-outline" size={20} color="blue" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGroupItem = ({ item }) => (
    <View style={styles.chatItem}>
      <Image
        source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
        style={styles.avatar}
      />
      <View style={styles.chatDetails}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatMessage}>{item.message}</Text>
      </View>
      <View style={styles.chatMeta}>
        <Text style={styles.chatTime}>{item.time}</Text>
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        <Ionicons name="search" size={20} color="gray" />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text style={activeTab === "friends" ? styles.activeTabText : styles.tabText}>
            Bạn bè
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "groups" && styles.activeTab]}
          onPress={() => setActiveTab("groups")}
        >
          <Text style={activeTab === "groups" ? styles.activeTabText : styles.tabText}>
            Nhóm
          </Text>
        </TouchableOpacity>
      </View>

      {/* Functional Categories */}
      {activeTab === "friends" ? (
        <View style={styles.functionContainer}>
          <TouchableOpacity style={styles.functionItem}>
            <Ionicons name="person-add-outline" size={24} color="blue" />
            <Text style={styles.functionText}>Lời mời kết bạn (8)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.functionItem}>
            <Ionicons name="calendar-outline" size={24} color="blue" />
            <Text style={styles.functionText}>Sinh nhật</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.functionContainer}>
          <TouchableOpacity style={styles.functionItem}>
            <Ionicons name="add-circle-outline" size={24} color="blue" />
            <Text style={styles.functionText}>Tạo nhóm</Text>
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="gray" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="people-outline" size={24} color="blue" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="notifications-outline" size={24} color="gray" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings-outline" size={24} color="gray" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FriendScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
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
    borderBottomColor: "#f0f0f0",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "blue",
  },
  tabText: {
    fontSize: 16,
    color: "gray",
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
    borderBottomColor: "#f0f0f0",
  },
  friendAvatarLetter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#d1d1d1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarLetter: {
    fontSize: 20,
    color: "#fff",
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
    borderBottomColor: "#f0f0f0",
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
    color: "gray",
  },
  chatMeta: {
    alignItems: "flex-end",
  },
  chatTime: {
    fontSize: 12,
    color: "gray",
  },
  unreadBadge: {
    backgroundColor: "red",
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