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
  Dimensions,
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
import { getNickname } from "@/src/apis/nickName";

// Các interface cho group conversation & combined conversation
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

/* -----------------------------------------------------------------------------
  Hàm tiện ích dùng để gọi fetch:
  - Lấy headers từ getAuthHeaders (bao gồm Authorization & Content-Type)
  - Nối URL và các options đã cho
  - Nếu response không ok, ném exception với thông báo lỗi
  - Nếu thành công, chuyển về JSON
----------------------------------------------------------------------------- */
async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
  }
  return response.json();
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
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // Lấy userId hiện tại
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

  // Kết nối socket (có thể gọi lại mỗi khi component mount)
  useEffect(() => {
    connectSocket();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      if (!userId) return;

      // Lấy danh sách bạn bè thông qua API đã được import
      const friends = await fetchFriends();
      const acceptedFriends = friends.filter(
        (friend) => friend.status === "accepted"
      );

      // Sử dụng hàm tiện ích apiFetch để lấy cuộc trò chuyện nhóm
      const groupConversations: GroupConversation[] = await apiFetch(
        `${API_BASE_URL}/conversations/my-groups/${userId}`
      );

      // Xử lý conversation cá nhân
      const privateConversations: CombinedConversation[] = [];
      const friendIds = acceptedFriends.map((friend) =>
        friend.senderId === userId ? friend.receiverId : friend.senderId
      );

      // Lấy thông tin của người bạn qua API
      const enrichedFriends = await Promise.all(
        acceptedFriends.map(async (friend) => {
          const otherUserId = friend.senderId === userId ? friend.receiverId : friend.senderId;
          try {
            const userData = await apiFetch(`${API_BASE_URL}/user/${otherUserId}`);
            return {
              ...friend,
              displayName: userData.name || otherUserId,
              avatarUrl: userData.avatarUrl || DEFAULT_AVATAR,
            };
          } catch (error) {
            console.error(`Error fetching user data for ${otherUserId}:`, error);
            return {
              ...friend,
              displayName: otherUserId,
              avatarUrl: DEFAULT_AVATAR,
            };
          }
        })
      );

      for (const friend of acceptedFriends) {
        const friendId =
          friend.senderId === userId ? friend.receiverId : friend.senderId;
        const nickName = await getNickname(friendId);

        const lastMessage = await fetchLatestMessage(friendId);
        console.log("Last message:", lastMessage);

        const userInfo = userMap[friendId] || {
          displayName: friendId,
          avatar: null,
        };
        privateConversations.push({
          type: "private",
          id: friendId,
          displayName: nickName?.nickname || userInfo.displayName,
          avatar:
            friend.senderId === userId
              ? friend.senderAVT
              : userInfo.avatar ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          lastMessage,
        });
      }

      const groupConversationsList: CombinedConversation[] = groupConversations.map((group) => ({
        type: "group",
        id: group.id,
        displayName: group.groupName || "Nhóm chat",
        avatar: group.avatarUrl || DEFAULT_AVATAR,
        lastMessage: group.lastMessage,
        participantsCount: group.participants.length,
      }));

      const combinedList = [...privateConversations, ...groupConversationsList]
        .filter(
          (conv) =>
            conv.type === "group" ||
            (conv.type === "private" && conv.lastMessage)
        )
        .sort((a, b) => {
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

  // Lắng nghe các sự kiện socket và cập nhật displayConversations
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
            avatar: avatarUrl || DEFAULT_AVATAR,
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
        setDisplayConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
        fetchConversations();
      });

      socket.on("removed-from-group", ({ conversationId, message }) => {
        console.log(
          `Removed from group event received for user ${userId}:`,
          conversationId,
          message
        );
        setDisplayConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
        fetchConversations();
      });

      socket.on("group-renamed", ({ conversationId, newName, leaderId }) => {
        console.log(
          `Group renamed event received for user ${userId}:`,
          conversationId,
          newName
        );
        setDisplayConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.type === "group" && conv.id === conversationId) {
              return { ...conv, displayName: newName };
            }
            return conv;
          })
        );
      });

      socket.on(
        "notification-join-group",
        ({ conversation: { id, groupName, participants, avatarUrl } }) => {
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

      socket.on(
        "notification-join-group",
        ({ conversation: { id, groupName, participants, avatarUrl } }) => {
          const newGroup: CombinedConversation = {
            type: "group",
            id: id,
            displayName: groupName || "Nhóm chat",
            avatar: avatarUrl || DEFAULT_AVATAR,
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
          socket.on(
            "userJoinedGroup",
            ({
              conversation: { id, groupName, participants, avatarUrl },
              accept,
              reject,
            }) => {
              if (reject) return;
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
                  console.log(
                    "Group already exists in displayConversations:",
                    id
                  );
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
        }
      );

      return () => {
        const socket = getSocket();
        if (socket) {
          socket.off("removed-from-group");
          socket.off("group-renamed");
        }
      };
    });
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
            uri: item.avatar || DEFAULT_AVATAR,
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
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Tìm kiếm..."
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.colors.text + "80"} // 50% opacity
          />
        </View>

        {loading ? (
          <Text style={{ color: theme.colors.text, textAlign: "center", padding: 20 }}>
            Đang tải...
          </Text>
        ) : (
          <FlatList
            data={displayConversations.filter((conv) =>
              typeof conv.displayName === "string"
                ? conv.displayName.toLowerCase().includes(search.toLowerCase())
                : false
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
    borderRadius: 20,
    paddingHorizontal: Dimensions.get("window").width * 0.04,
    paddingVertical: Dimensions.get("window").height * 0.015,
    margin: Dimensions.get("window").width * 0.04,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: Dimensions.get("window").width * 0.02,
  },
  searchInput: {
    flex: 1,
    fontSize: Dimensions.get("window").width * 0.04,
    paddingVertical: 0,
  },
  chatList: {
    paddingHorizontal: Dimensions.get("window").width * 0.04,
    paddingBottom: Dimensions.get("window").height * 0.05,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Dimensions.get("window").height * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: Dimensions.get("window").width * 0.12,
    height: Dimensions.get("window").width * 0.12,
    borderRadius: Dimensions.get("window").width * 0.06,
    marginRight: Dimensions.get("window").width * 0.03,
  },
  chatDetails: {
    flex: 1,
    justifyContent: "center",
  },
  chatName: {
    fontSize: Dimensions.get("window").width * 0.045,
    fontWeight: "600",
    color: "#000",
  },
  chatMessage: {
    fontSize: Dimensions.get("window").width * 0.035,
    opacity: 0.7,
    color: "#666",
  },
  chatMeta: {
    alignItems: "flex-end",
    gap: Dimensions.get("window").height * 0.005,
  },
  chatTime: {
    fontSize: Dimensions.get("window").width * 0.03,
    opacity: 0.7,
    color: "#666",
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: Dimensions.get("window").width * 0.03,
    paddingHorizontal: Dimensions.get("window").width * 0.02,
    paddingVertical: Dimensions.get("window").height * 0.005,
  },
  unreadText: {
    color: "white",
    fontSize: Dimensions.get("window").width * 0.03,
    fontWeight: "600",
  },
});
