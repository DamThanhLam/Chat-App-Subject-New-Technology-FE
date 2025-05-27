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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Auth } from "aws-amplify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import moment from "moment";
import { connectSocket, getSocket } from "@/src/socket/socket";
import { DOMAIN } from "@/src/configs/base_url";
import { useAppTheme } from "@/src/theme/theme";

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

const createApiFetch =
  (token: string) =>
  async (endpoint: string, options: RequestInit = {}) => {
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
    return response.json();
  };

const FriendRequestsTab = ({
  token,
  userId,
}: {
  token: string;
  userId: string;
}) => {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [originalRequests, setOriginalRequests] = useState<RequestItem[]>([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const user = useSelector((state: RootState) => state.user);

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

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
              const senderData = await apiFetch(
                `/api/user/${request.senderId}`
              );
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
              console.error("Error fetching user:", error);
              return {
                id: request.id,
                name: "Unknown",
                avatarUrl:
                  "https://cdn-icons-png.flaticon.com/512/219/219983.png",
                createdAt: request.createdAt,
                senderId: request.senderId,
              };
            }
          })
        );

        setOriginalRequests(enrichedRequests);
        setRequests(enrichedRequests);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [token, user.id]);

  useEffect(() => {
    connectSocket().then((socket) => {
      setSocket(socket);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = async (newRequest: FriendRequest) => {
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
    };

    const handleRequestUpdate = (requestId: string) => {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setOriginalRequests((prev) => prev.filter((r) => r.id !== requestId));
    };

    socket.on("newFriendRequest", handleNewRequest);
    socket.on("friendRequestDeclined", handleRequestUpdate);
    socket.on("friendRequestAccepted", handleRequestUpdate);

    return () => {
      socket.off("newFriendRequest", handleNewRequest);
      socket.off("friendRequestDeclined", handleRequestUpdate);
      socket.off("friendRequestAccepted", handleRequestUpdate);
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

  const handleAccept = async (friendRequestId: string) => {
    if (!token) {
      console.log("Socket or token is empty");
      return;
    }
    await connectSocket().then((socket) => {
      socket.emit("acceptFriendRequest", { friendRequestId, token });
      socket.once(
        "acceptFriendRequestResponse",
        (response: { code: number }) => {
          if (response.code === 200) {
            setRequests((prev) =>
              prev.filter((item) => item.id !== friendRequestId)
            );
            setOriginalRequests((prev) =>
              prev.filter((item) => item.id !== friendRequestId)
            );
          }
        }
      );
    });
  };

  const handleDecline = async (friendRequestId: string) => {
    if (!token) {
      console.log("Socket or token is empty");
      return;
    }
    await connectSocket().then((socket) => {
      console.log("Socket send to socket name declineFriendRequest");
      socket.emit("declineFriendRequest", { friendRequestId, token });
      socket.once(
        "declineFriendRequestResponse",
        (response: { code: number }) => {
          if (response.code === 200) {
            setRequests((prev) =>
              prev.filter((item) => item.id !== friendRequestId)
            );
            setOriginalRequests((prev) =>
              prev.filter((item) => item.id !== friendRequestId)
            );
          }
        }
      );
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => (
    <View
      style={[
        styles.requestItem,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          padding: isLargeScreen ? 16 : 12,
        },
      ]}
      key={item.id}
    >
      <Image
        source={{ uri: item.avatarUrl }}
        style={[
          styles.avatar,
          {
            width: isLargeScreen ? 64 : 56,
            height: isLargeScreen ? 64 : 56,
          },
        ]}
      />
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.time, { color: theme.colors.text + "80" }]}>
          {moment(item.createdAt).fromNow()} gửi lời mời
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#4CAF50" }]}
            onPress={() => handleAccept(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Xác Nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#FF4D4D" }]}
            onPress={() => handleDecline(item.id)}
            activeOpacity={0.7}
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
          <View
            style={[
              styles.headerRow,
              {
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.border,
                paddingHorizontal: isLargeScreen ? 24 : 16,
              },
            ]}
          >
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Lời Mời Kết Bạn ({requests.length})
            </Text>
            <TouchableOpacity onPress={() => setSortModalVisible(true)}>
              <Text style={[styles.sortLabel, { color: theme.colors.primary }]}>
                Sắp Xếp ▾
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={[
              styles.listContent,
              {
                padding: isLargeScreen ? 24 : 16,
                paddingBottom: 20,
              },
            ]}
            ListEmptyComponent={
              <Text
                style={[styles.emptyText, { color: theme.colors.text + "80" }]}
              >
                Không có lời mời kết bạn nào
              </Text>
            }
          />
          <Modal
            animationType="fade"
            transparent={true}
            visible={sortModalVisible}
            onRequestClose={() => setSortModalVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setSortModalVisible(false)}
            >
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: theme.colors.card,
                    width: isLargeScreen ? "50%" : "80%",
                    maxWidth: 400,
                  },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Sắp Xếp Theo
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setRequests(sortRequests("default", originalRequests));
                    setSortModalVisible(false);
                  }}
                  style={styles.modalOptionContainer}
                >
                  <Text
                    style={[styles.modalOption, { color: theme.colors.text }]}
                  >
                    Mặc Định
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRequests(sortRequests("a-z", originalRequests));
                    setSortModalVisible(false);
                  }}
                  style={styles.modalOptionContainer}
                >
                  <Text
                    style={[styles.modalOption, { color: theme.colors.text }]}
                  >
                    Tên A-Z
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRequests(sortRequests("z-a", originalRequests));
                    setSortModalVisible(false);
                  }}
                  style={styles.modalOptionContainer}
                >
                  <Text
                    style={[styles.modalOption, { color: theme.colors.text }]}
                  >
                    Tên Z-A
                  </Text>
                </TouchableOpacity>
                <Pressable
                  onPress={() => setSortModalVisible(false)}
                  style={styles.modalCloseContainer}
                >
                  <Text
                    style={[styles.modalClose, { color: theme.colors.primary }]}
                  >
                    Đóng
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </>
      )}
    </View>
  );
};

const FriendRequestsScreen = () => {
  const { theme } = useAppTheme();
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
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    borderRadius: 32,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  time: {
    fontSize: 14,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButton: {
    backgroundColor: "#FF4D4D",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOptionContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOption: {
    fontSize: 16,
  },
  modalCloseContainer: {
    marginTop: 24,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default FriendRequestsScreen;
