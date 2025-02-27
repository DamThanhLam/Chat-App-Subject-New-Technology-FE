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

const HomeScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState("");

  const data = [
    { id: "1", name: "Full Name", message: "latest message", time: "1 phút", unread: 5 },
    { id: "2", name: "Full Name", message: "latest message", time: "1 phút", unread: 3 },
    { id: "3", name: "Full Name", message: "latest message", time: "1 phút", unread: 2 },
    { id: "4", name: "Full Name", message: "latest message", time: "1 phút", unread: 1 },
  ];

  const renderItem = ({ item }: any) => (
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

      {/* Chat List */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatList}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="blue" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="document-text-outline" size={24} color="gray" />
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

export default HomeScreen;

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