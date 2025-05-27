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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { useAppTheme } from "@/src/theme/theme";

// Các interface cho group conversation & combined conversation
interface GroupConversation {
  id: string;
  groupName: string;
  participants: string[];
  lastMessage: Message | null;
  avatarUrl?: string;
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
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const DEFAULT_AVATAR =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

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
          const otherUserId =
            friend.senderId === userId ? friend.receiverId : friend.senderId;
          try {
            const userData = await apiFetch(
              `${API_BASE_URL}/user/${otherUserId}`
            );
            return {
              ...friend,
              displayName: userData.name || otherUserId,
              avatarUrl: userData.avatarUrl || DEFAULT_AVATAR,
            };
          } catch (error) {
            console.error(
              `Error fetching user data for ${otherUserId}:`,
              error
            );
            return {
              ...friend,
              displayName: otherUserId,
              avatarUrl: DEFAULT_AVATAR,
            };
          }
        })
      );

      for (const friend of enrichedFriends) {
        const friendId =
          friend.senderId === userId ? friend.receiverId : friend.senderId;
        const nickName = await getNickname(friendId);

        const lastMessage = await fetchLatestMessage(friendId);
        console.log("Last message:", lastMessage);
        privateConversations.push({
          type: "private",
          id: friendId,
          displayName: nickName?.nickname || friend.displayName,
          avatar: friend.avatarUrl || DEFAULT_AVATAR,
          lastMessage,
        });
      }

      const groupConversationsList: CombinedConversation[] =
        groupConversations.map((group) => ({
          type: "group",
          id: group.id,
          displayName: group.groupName || "Nhóm chat",
          avatar: group.avatarUrl || DEFAULT_AVATAR,
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
        style={[
          styles.listItem,
          {
            backgroundColor: theme.colors.card,
            paddingVertical: width >= 768 ? 18 : 14,
            marginBottom: width >= 768 ? 12 : 8,
          },
        ]}
        activeOpacity={0.7}
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
          style={[
            styles.avatar,
            {
              width: width >= 768 ? 48 : 40,
              height: width >= 768 ? 48 : 40,
              borderRadius: width >= 768 ? 24 : 20,
            },
          ]}
        />
        <View style={styles.chatDetails}>
          <Text
            style={[
              styles.chatName,
              {
                color: theme.colors.text,
                fontSize: width >= 768 ? 18 : 16,
              },
            ]}
          >
            {displayName}
          </Text>
          <Text
            style={[
              styles.chatMessage,
              {
                color: theme.colors.text + "80",
                fontSize: width >= 768 ? 16 : 14,
              },
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
              {
                color: theme.colors.text + "80",
                fontSize: width >= 768 ? 14 : 12,
              },
            ]}
          >
            {item.lastMessage && item.lastMessage.createdAt
              ? formatTime(item.lastMessage.createdAt)
              : ""}
          </Text>
          {unreadCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                {
                  paddingHorizontal: width >= 768 ? 10 : 8,
                  paddingVertical: width >= 768 ? 6 : 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.unreadText,
                  { fontSize: width >= 768 ? 14 : 12 },
                ]}
              >
                {unreadCount}
              </Text>
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
            {
              backgroundColor: theme.colors.card,
              marginHorizontal: width >= 768 ? width * 0.1 : 16,
              marginTop: width >= 768 ? 20 : 10,
              paddingVertical: width >= 768 ? 12 : 10,
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
            placeholder="Tìm kiếm..."
            style={[
              styles.searchInput,
              {
                color: theme.colors.text,
                fontSize: width >= 768 ? 18 : 16,
              },
            ]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.colors.text + "80"}
          />
        </View>

        {loading ? (
          <Text
            style={{
              color: theme.colors.text,
              textAlign: "center",
              padding: 20,
              fontSize: width >= 768 ? 18 : 16,
            }}
          >
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
            contentContainerStyle={[
              styles.listContainer,
              {
                paddingHorizontal: width >= 768 ? width * 0.1 : 16,
              },
            ]}
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
  avatar: {
    marginRight: 16,
  },
  chatDetails: {
    flex: 1,
    justifyContent: "center",
  },
  chatName: {
    fontWeight: "600",
  },
  chatMessage: {
    opacity: 0.7,
  },
  chatMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  chatTime: {
    opacity: 0.7,
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
  },
  unreadText: {
    color: "white",
    fontWeight: "600",
  },
});
