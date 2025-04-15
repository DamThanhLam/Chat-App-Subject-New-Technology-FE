import React, { useEffect, useState } from "react";
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
import { Auth } from "aws-amplify";
import { connectSocket, getSocket, initSocket } from "@/src/socket/socket";
import { getCurrentUserId } from "../../src/utils/config";
import {
  fetchFriends,
  fetchUserInfo,
  fetchLatestMessage,
} from "../../src/apis/message";
import {
  Message,
  Friend,
  DisplayConversation,
} from "@/src/interface/interface";

const HomeScreen = () => {
  const [search, setSearch] = useState("");
  const [displayConversations, setDisplayConversations] = useState<
    DisplayConversation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  // Lấy danh sách bạn bè và tin nhắn cuối cùng
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const currentUserId = await getCurrentUserId();
      setUserId(currentUserId);

      // Bước 1: Lấy danh sách bạn bè
      const friends = await fetchFriends();
      const acceptedFriends = friends.filter(
        (friend) => friend.status === "accepted"
      );

      // Bước 2: Lấy thông tin bạn bè và tin nhắn cuối
      const conversations: DisplayConversation[] = [];
      const friendIds = acceptedFriends.map((friend) =>
        friend.senderId === currentUserId ? friend.receiverId : friend.senderId
      );

      // Gọi API để lấy thông tin tất cả người dùng
      const usersResponse = await Promise.all(
        friendIds.map((friendId) => fetchUserInfo(friendId))
      );

      // Tạo map để tra cứu displayName và avatar nhanh
      const userMap = usersResponse.reduce((map, user) => {
        map[user.friendId] = user;
        return map;
      }, {});
      console.log(usersResponse);

      // Bước 3: Lấy tin nhắn cuối cho từng người bạn
      for (const friend of acceptedFriends) {
        const friendId =
          friend.senderId === currentUserId
            ? friend.receiverId
            : friend.senderId;

        const lastMessage = await fetchLatestMessage(friendId);
        const userInfo = userMap[friendId] || {
          displayName: friendId,
          avatar: null,
        };

        conversations.push({
          friendId,
          displayName: userInfo.displayName,
          avatar:
            friend.senderId === currentUserId
              ? friend.senderAVT
              : userInfo.avatar ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          lastMessage,
        });
      }

      setDisplayConversations(conversations);
    } catch (error) {
      console.error("Lỗi khi lấy cuộc trò chuyện:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // connectSocket();
  }, []);

  // Hàm tính số tin nhắn chưa đọc
  const getUnreadCount = (
    conversation: DisplayConversation,
    currentUserId: string
  ) => {
    if (
      !conversation.lastMessage ||
      !conversation.lastMessage.readed ||
      conversation.lastMessage.readed.includes(currentUserId)
    ) {
      return 0;
    }
    return 1;
  };

  // Hàm định dạng thời gian (đã sửa để tránh NaN)
  const formatTime = (isoTime: string) => {
    if (!isoTime || typeof isoTime !== "string") {
      return "Không rõ";
    }

    const date = new Date(isoTime);
    if (isNaN(date.getTime())) {
      return "Không rõ";
    }

    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / 1000 / 60
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} giờ`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} ngày`;
    }
  };

  const renderItem = ({ item }: { item: DisplayConversation }) => {
    const displayName = item.displayName;
    const lastMessageContent =
      item.lastMessage?.contentType === "text"
        ? typeof item.lastMessage.message === "string"
          ? item.lastMessage.message
          : ""
        : item.lastMessage?.contentType === "emoji"
          ? "Emoji"
          : item.lastMessage?.contentType === "file" ? "File" : "";
    const unreadCount = getUnreadCount(item, userId);

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => {
          router.push({
            pathname: "/ChatScreen",
            params: {
              // conversationId: item.lastMessage?.conversationId || "",
              userID2: item.friendId,
              friendName: item.displayName,
            },
          });
        }}
      >
        <Image
          source={{
            uri:
              item.avatar ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          }}
          style={styles.avatar}
        />
        <View style={styles.chatDetails}>
          <Text style={[styles.chatName, { color: theme.colors.text }]}>
            {displayName}
          </Text>
          <Text
            style={[
              styles.chatMessage,
              { color: theme.colors.text, opacity: 0.7 },
            ]}
          >
            {lastMessageContent}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          <Text
            style={[
              styles.chatTime,
              { color: theme.colors.text, opacity: 0.7 },
            ]}
          >
            {item.lastMessage && item.lastMessage.createdAt
              ? formatTime(item.lastMessage.createdAt)
              : ""}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <TextInput
            placeholder="Tìm kiếm..."
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.colors.text}
          />
          <Ionicons name="search" size={20} color={theme.colors.text} />
        </View>

        {/* Chat List */}
        {loading ? (
          <Text style={{ color: theme.colors.text, textAlign: "center" }}>
            Đang tải...
          </Text>
        ) : (
          <FlatList
            data={displayConversations.filter((conv) =>
              conv.displayName.toLowerCase().includes(search.toLowerCase())
            )}
            keyExtractor={(item) => item.friendId}
            renderItem={renderItem}
            contentContainerStyle={styles.chatList}
          />
        )}
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
});
