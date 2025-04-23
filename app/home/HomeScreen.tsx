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
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { Auth } from "aws-amplify";
import { connectSocket, getSocket } from "@/src/socket/socket";
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
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import { DOMAIN } from "@/src/configs/base_url";

interface GroupConversation {
  id: string;
  groupName: string;
  participants: string[];
  lastMessage: Message | null;
}

interface CombinedConversation {
  type: "private" | "group";
  id: string;
  displayName: string;
  avatar?: string;
  lastMessage?: Message | null;
  participantsCount?: number;
}

const HomeScreen = () => {
  const [search, setSearch] = useState("");
  const [displayConversations, setDisplayConversations] = useState<
    CombinedConversation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [socketInitialized, setSocketInitialized] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  useEffect(() => {
    const initializeUserId = async () => {
      try {
        const currentUserId = await getCurrentUserId();
        setUserId(currentUserId);
        console.log("User ID initialized:", currentUserId);
      } catch (error) {
        console.error("Error fetching userId:", error);
      }
    };
    initializeUserId();
  }, []);
  useEffect(() => {
    connectSocket()
  })
  const fetchConversations = async () => {
    try {
      setLoading(true);
      if (!userId) return;

      const friends = await fetchFriends();
      const acceptedFriends = friends.filter(
        (friend) => friend.status === "accepted"
      );

      const headers = await getAuthHeaders();
      const groupResponse = await fetch(
        `${API_BASE_URL}/conversations/my-groups/${userId}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!groupResponse.ok) {
        throw new Error("Không thể lấy danh sách cuộc trò chuyện nhóm");
      }
      const groupConversations: GroupConversation[] =
        await groupResponse.json();

      const privateConversations: CombinedConversation[] = [];
      const friendIds = acceptedFriends.map((friend) =>
        friend.senderId === userId ? friend.receiverId : friend.senderId
      );

      const usersResponse = await Promise.all(
        friendIds.map((friendId) => fetchUserInfo(friendId))
      );

      const userMap = usersResponse.reduce((map, user) => {
        map[user.friendId] = user;
        return map;
      }, {});

      for (const friend of acceptedFriends) {
        const friendId =
          friend.senderId === userId ? friend.receiverId : friend.senderId;

        const lastMessage = await fetchLatestMessage(friendId);
        const userInfo = userMap[friendId] || {
          displayName: friendId,
          avatar: null,
        };
        privateConversations.push({
          type: "private",
          id: friendId,
          displayName: userInfo.displayName,
          avatar:
            friend.senderId === userId
              ? friend.senderAVT
              : userInfo.avatar ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          lastMessage,
        });
      }

      const groupConversationsList: CombinedConversation[] =
        groupConversations.map((group) => ({
          type: "group",
          id: group.id,
          displayName: group.groupName || "Nhóm chat",
          avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          lastMessage: group.lastMessage,
          participantsCount: group.participants.length,
        }));

      const combinedList = [
        ...privateConversations,
        ...groupConversationsList,
      ].sort((a, b) => {
        const timeA = a.lastMessage
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const timeB = b.lastMessage
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;
        return timeB - timeA;
      });

      setDisplayConversations(combinedList);
      console.log("Fetched conversations:", combinedList);
    } catch (error) {
      console.error("Lỗi khi lấy cuộc trò chuyện:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  useEffect(() => {
    connectSocket().then((socket) => {
      if (!socket) return;
      socket.on(
        "added-to-group",
        ({
          conversation: { id, groupName, participants, avatarUrl },
          message,
        }) => {
          console.log(
            `Group created event received for user ${userId}:`,
            id,
            groupName,
            participants
          );

          const newGroup: CombinedConversation = {
            type: "group",
            id: id,
            displayName: groupName || "Nhóm chat",
            avatar:
              avatarUrl ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            lastMessage: null,
            participantsCount: participants.length,
          };

          setDisplayConversations((prev) => {
            if (prev.some((conv) => conv.id === id)) {
              console.log("Group already exists in displayConversations:", id);
              return prev;
            }
            const updatedList = [newGroup, ...prev].sort((a, b) => {
              const timeA = a.lastMessage
                ? new Date(a.lastMessage.createdAt).getTime()
                : 0;
              const timeB = b.lastMessage
                ? new Date(b.lastMessage.createdAt).getTime()
                : 0;
              return timeB - timeA;
            });
            console.log("Updated displayConversations:", updatedList);
            return updatedList;
          });
        }
      );

      socket?.on("group-deleted", ({ conversationId }) => {
        console.log(
          `Group deleted event received for user ${userId}:`,
          conversationId
        );
        // Xóa nhóm khỏi displayConversations
        setDisplayConversations((prev) => {
          const updatedList = prev.filter((conv) => conv.id !== conversationId);
          console.log(
            "Updated displayConversations after deletion:",
            updatedList
          );
          return updatedList;
        });
        // Gọi lại fetchConversations để đồng bộ dữ liệu từ database
        fetchConversations();
      });

      socket.on("removed-from-group", ({ conversationId, message }) => {
        console.log(
          `Removed from group event received for user ${userId}:`,
          conversationId,
          message
        );
        setDisplayConversations((prev) => {
          const updatedList = prev.filter((conv) => conv.id !== conversationId);
          console.log(
            "Updated displayConversations after being removed:",
            updatedList
          );
          return updatedList;
        });
        fetchConversations();
      });
      // Lắng nghe đổi tên nhóm
      socket.on("group-renamed", ({ conversationId, newName, leaderId }) => {
        console.log(
          `Group renamed event received for user ${userId}:`,
          conversationId,
          newName
        );

        setDisplayConversations((prevConversations) => {
          const updatedConversations = prevConversations.map((conv) => {
            if (conv.type === "group" && conv.id === conversationId) {
              return {
                ...conv,
                displayName: newName,
              };
            }
            return conv;
          });

          console.log(
            "Updated conversations after rename:",
            updatedConversations
          );
          return updatedConversations;
        });
      });
      socket.on("notification-join-group", ({ conversation: { id, groupName, participants, avatarUrl } }) => {

        const newGroup: CombinedConversation = {
          type: "group",
          id: id,
          displayName: groupName || "Nhóm chat",
          avatar:
            avatarUrl ||
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          lastMessage: null,
          participantsCount: participants.length,
        };

        setDisplayConversations((prev) => {
          if (prev.some((conv) => conv.id === id)) {
            console.log("Group already exists in displayConversations:", id);
            return prev;
          }
          const updatedList = [newGroup, ...prev].sort((a, b) => {
            const timeA = a.lastMessage
              ? new Date(a.lastMessage.createdAt).getTime()
              : 0;
            const timeB = b.lastMessage
              ? new Date(b.lastMessage.createdAt).getTime()
              : 0;
            return timeB - timeA;
          });
          console.log("Updated displayConversations:", updatedList);
          return updatedList;
        });
        socket.on("reponse-approve-into-group", ({ conversation: { id, groupName, participants, avatarUrl }, accept, reject }) => {
          if (reject) return
          const newGroup: CombinedConversation = {
            type: "group",
            id: id,
            displayName: groupName || "Nhóm chat",
            avatar:
              avatarUrl ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            lastMessage: null,
            participantsCount: participants.length,
          };

          setDisplayConversations((prev) => {
            if (prev.some((conv) => conv.id === id)) {
              console.log("Group already exists in displayConversations:", id);
              return prev;
            }
            const updatedList = [newGroup, ...prev].sort((a, b) => {
              const timeA = a.lastMessage
                ? new Date(a.lastMessage.createdAt).getTime()
                : 0;
              const timeB = b.lastMessage
                ? new Date(b.lastMessage.createdAt).getTime()
                : 0;
              return timeB - timeA;
            });
            console.log("Updated displayConversations:", updatedList);
            return updatedList;
          });
        })
      });
      return () => {
        const socket = getSocket();
        if (socket) {
          socket.off("removed-from-group");
          socket.off("group-renamed");
        }
      };
    })
  }, []);

  const getUnreadCount = (
    conversation: CombinedConversation,
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

  const renderItem = ({ item }: { item: CombinedConversation }) => {
    const displayName = item.displayName;
    const lastMessageContent =
      item.lastMessage?.contentType === "text"
        ? typeof item.lastMessage.message === "string"
          ? item.lastMessage.message
          : ""
        : item.lastMessage?.contentType === "emoji"
          ? "Emoji"
          : item.lastMessage?.contentType === "file"
            ? "File"
            : "";
    const unreadCount = getUnreadCount(item, userId);

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => {
          if (item.type === "private") {
            router.push({
              pathname: "/ChatScreen",
              params: {
                userID2: item.id,
                friendName: item.displayName,
              },
            });
          } else {
            router.push({
              pathname: "/GroupChatScreen",
              params: {
                conversationId: item.id,
                groupName: item.displayName,
              },
            });
          }
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
            {item.type === "group" && item.participantsCount
              ? ` (${item.participantsCount} thành viên)`
              : ""}
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

        {loading ? (
          <Text style={{ color: theme.colors.text, textAlign: "center" }}>
            Đang tải...
          </Text>
        ) : (
          <FlatList
            data={displayConversations.filter((conv) =>
              conv.displayName.toLowerCase().includes(search.toLowerCase())
            )}
            keyExtractor={(item) => `${item.type}-${item.id}`}
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
