import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import moment from "moment";
import { getSocket } from "@/src/socket/socket";
import { DOMAIN } from "@/src/configs/base_url";

// Các kiểu dữ liệu
type RequestItem = {
  id: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
  senderId?: string;
};

type FriendRequest = {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
};

// Hàm tiện ích tạo apiFetch, nhận token và trả về hàm gọi fetch với cấu hình mặc định.
const createApiFetch = (token: string) => async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const defaultOptions: RequestInit = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(`${DOMAIN}:3000${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...(options.headers || {}) },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

//-------------------------------------------------------------
// FriendRequestsTab: hiển thị danh sách lời mời kết bạn
//-------------------------------------------------------------
const FriendRequestsTab = ({ token, userId }: { token: string; userId: string }) => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [originalRequests, setOriginalRequests] = useState<RequestItem[]>([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const user = useSelector((state: RootState) => state.user);

  // Tạo hàm apiFetch sử dụng token từ props
  const apiFetch = createApiFetch(token);

  useEffect(() => {
    if (!token || !userId) return;

    const fetchRequests = async () => {
      try {
        const data = await apiFetch(`/api/friends/requests/${user.id}`);
        const rawRequests: FriendRequest[] = data.requests || [];
        const enrichedRequests = await Promise.all(
          rawRequests.map(async (request: FriendRequest) => {
            try {
              const senderData = await apiFetch(`/api/user/${request.senderId}`);
              return {
                id: request.id,
                name: senderData.name || "Unknown",
                avatarUrl:
                  senderData.avatarUrl ||
                  "https://cdn-icons-png.flaticon.com/512/219/219983.png",
                createdAt: request.createdAt,
                senderId: request.senderId,
              };
            } catch (error) {
              console.error("Lỗi fetch user:", error);
              return {
                id: request.id,
                name: "Unknown",
                avatarUrl: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
                createdAt: request.createdAt,
                senderId: request.senderId,
              };
            }
          })
        );

        setOriginalRequests(enrichedRequests);
        setRequests(enrichedRequests);
      } catch (err) {
        console.error("Lỗi fetch request:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [token, user.id]);

  // Khởi tạo socket và lắng nghe các sự kiện cập nhật lời mời
  useEffect(() => {
    setSocket(getSocket());
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("newFriendRequest", async (newRequest: FriendRequest) => {
      try {
        const senderData = await apiFetch(`/api/user/${newRequest.senderId}`);
        const enrichedRequest: RequestItem = {
          id: newRequest.id,
          name: senderData.name || "Unknown",
          avatarUrl:
            senderData.avatarUrl ||
            "https://cdn-icons-png.flaticon.com/512/219/219983.png",
          createdAt: newRequest.createdAt,
          senderId: newRequest.senderId,
        };
        setRequests((prev) => [enrichedRequest, ...prev]);
        setOriginalRequests((prev) => [enrichedRequest, ...prev]);
      } catch (error) {
        console.error("Error enriching request:", error);
        const enrichedFallback: RequestItem = {
          id: newRequest.id,
          name: "Unknown",
          avatarUrl: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
          createdAt: newRequest.createdAt,
          senderId: newRequest.senderId,
        };
        setRequests((prev) => [enrichedFallback, ...prev]);
        setOriginalRequests((prev) => [enrichedFallback, ...prev]);
      }
    });

    socket.on("friendRequestDeclined", (declinedRequestId: string) => {
      setRequests((prev) => prev.filter((r) => r.id !== declinedRequestId));
      setOriginalRequests((prev) => prev.filter((r) => r.id !== declinedRequestId));
    });

    socket.on("friendRequestAccepted", (acceptedRequestId: string) => {
      setRequests((prev) => prev.filter((r) => r.id !== acceptedRequestId));
      setOriginalRequests((prev) => prev.filter((r) => r.id !== acceptedRequestId));
    });

    return () => {
      socket.off("newFriendRequest");
      socket.off("friendRequestDeclined");
      socket.off("friendRequestAccepted");
      socket.disconnect();
    };
  }, [socket]);

  const sortRequests = (type: string, data: RequestItem[]) => {
    switch (type) {
      case "a-z":
        return [...data].sort((a, b) => a.name.localeCompare(b.name));
      case "z-a":
        return [...data].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return [...data];
    }
  };

  const handleAccept = (friendRequestId: string) => {
    if (!socket || !token) return;
    socket.emit("acceptFriendRequest", { friendRequestId, token });
    socket.once("acceptFriendRequestResponse", (response: { code: number }) => {
      if (response.code === 200) {
        setRequests((prev) => prev.filter((item) => item.id !== friendRequestId));
        setOriginalRequests((prev) =>
          prev.filter((item) => item.id !== friendRequestId)
        );
      }
    });
  };

  const handleDecline = (friendRequestId: string) => {
    if (!socket || !token) return;
    socket.emit("declineFriendRequest", { friendRequestId, token });
    socket.once("declineFriendRequestResponse", (response: { code: number }) => {
      if (response.code === 200) {
        setRequests((prev) => prev.filter((item) => item.id !== friendRequestId));
        setOriginalRequests((prev) =>
          prev.filter((item) => item.id !== friendRequestId)
        );
      }
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => (
    <View style={[styles.requestItem, { borderColor: theme.colors.border }]} key={item.id}>
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
        <Text style={[styles.time, { color: theme.colors.text }]}>
          {moment(item.createdAt).fromNow()} gửi lời mời
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
          >
            <Text style={styles.buttonText}>Xác nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={() => handleDecline(item.id)}
          >
            <Text style={styles.buttonText}>Hủy lời mời</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              Lời mời kết bạn ({requests.length})
            </Text>
            <TouchableOpacity onPress={() => setSortModalVisible(true)}>
              <Text style={styles.sortLabel}>Sắp xếp ▾</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  color: theme.colors.text,
                }}
              >
                Không có lời mời kết bạn nào
              </Text>
            }
          />
          <Modal
            animationType="slide"
            transparent={true}
            visible={sortModalVisible}
            onRequestClose={() => setSortModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Sắp xếp theo</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRequests(sortRequests("default", originalRequests));
                    setSortModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOption}>Mặc định</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRequests(sortRequests("a-z", originalRequests));
                    setSortModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOption}>Tên A-Z</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRequests(sortRequests("z-a", originalRequests));
                    setSortModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOption}>Tên Z-A</Text>
                </TouchableOpacity>
                <Pressable onPress={() => setSortModalVisible(false)}>
                  <Text style={styles.modalClose}>Đóng</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

//-------------------------------------------------------------
// FriendRequestsScreen: màn hình chứa FriendRequests
//-------------------------------------------------------------
const FriendRequestsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const user = useSelector((state: RootState) => state.user);
  const [token, setToken] = useState("");

  useEffect(() => {
    const getToken = async () => {
      try {
        const session = await Auth.currentSession();
        const jwtToken = session.getIdToken().getJwtToken();
        setToken(jwtToken);
      } catch (err) {
        console.error("Error getting token:", err);
      }
    };
    getToken();
  }, []);

  if (!token || !user.id) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FriendRequestsTab token={token} userId={String(user.id)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  sortLabel: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  time: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
    color: "#666",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: "#000",
  },
  modalOption: {
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    color: "#333",
  },
  modalClose: {
    fontSize: 16,
    color: "#FF3B30",
    marginTop: 24,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default FriendRequestsScreen;