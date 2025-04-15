import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import moment from "moment";
import { getSocket } from "@/src/socket/socket";
import { DOMAIN } from "@/src/configs/base_url";

const FriendRequestsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const user = useSelector((state: RootState) => state.user);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [originalRequests, setOriginalRequests] = useState([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const session = await Auth.currentSession();
        const jwtToken = session.getIdToken().getJwtToken();
        setToken(jwtToken);
      } catch (err) {
        console.error("Lỗi lấy token:", err);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (!token || !user.id) return;

    const fetchRequests = async () => {
      try {
        const res = await fetch(DOMAIN+`:3000/api/friends/requests/${user.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const rawRequests = data.requests || [];

        const enrichedRequests = await Promise.all(
          rawRequests.map(async (request) => {
            try {
              const senderRes = await fetch(
                DOMAIN+`:3000/api/user/${request.senderId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const senderData = await senderRes.json();
              return {
                ...request,
                name: senderData.username || "Unknown",
                avatarUrl:
                  senderData.avatarUrl ||
                  "https://cdn-icons-png.flaticon.com/512/219/219983.png",
              };
            } catch (error) {
              console.error("Lỗi fetch user:", error);
              return {
                ...request,
                name: "Unknown",
                avatarUrl:
                  "https://cdn-icons-png.flaticon.com/512/219/219983.png",
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

  useEffect(() => {
    if (!token || !user.id) return;

    const socketConnection = getSocket(token);
    setSocket(socketConnection);

    socketConnection.on("connect", () => {
      console.log("✅ Socket connected");
    });

    socketConnection.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    socketConnection.on("newFriendRequest", async (newRequest) => {
      try {
        const senderRes = await fetch(
          DOMAIN+`:3000/api/user/${newRequest.senderId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const senderData = await senderRes.json();
    
        const enrichedRequest = {
          ...newRequest,
          name: senderData.username || "Unknown",
          avatarUrl:
            senderData.avatarUrl ||
            "https://cdn-icons-png.flaticon.com/512/219/219983.png",
        };
    
        setRequests((prev) => [enrichedRequest, ...prev]);
        setOriginalRequests((prev) => [enrichedRequest, ...prev]);
      } catch (error) {
        console.error("Lỗi enrich newFriendRequest:", error);
        const enrichedFallback = {
          ...newRequest,
          name: "Unknown",
          avatarUrl:
            "https://cdn-icons-png.flaticon.com/512/219/219983.png",
        };
        setRequests((prev) => [enrichedFallback, ...prev]);
        setOriginalRequests((prev) => [enrichedFallback, ...prev]);
      }
    });
    

    socketConnection.on("friendRequestDeclined", (declinedRequestId) => {
      setRequests((prev) => prev.filter((r) => r.id !== declinedRequestId));
      setOriginalRequests((prev) => prev.filter((r) => r.id !== declinedRequestId));
    });

    socketConnection.on("friendRequestAccepted", (acceptedRequestId) => {
      setRequests((prev) => prev.filter((r) => r.id !== acceptedRequestId));
      setOriginalRequests((prev) => prev.filter((r) => r.id !== acceptedRequestId));
    });

    return () => {
      socketConnection.off("newFriendRequest");
      socketConnection.off("friendRequestDeclined");
      socketConnection.off("friendRequestAccepted");
    };
  }, [token, user.id]);

  
  const sortRequests = (type: string, data: any[]) => {
    switch (type) {
      case "a-z":
        return [...data].sort((a, b) => a.name.localeCompare(b.name));
      case "z-a":
        return [...data].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return [...data]; // giữ nguyên thứ tự ban đầu
    }
  };

  const handleAccept = (friendRequestId: string) => {
    if (!socket || !token) return;
    socket.emit("acceptFriendRequest", { friendRequestId, token });
    socket.once("acceptFriendRequestResponse", (response) => {
      if (response.code === 200) {
        setRequests((prev) => prev.filter((item) => item.id !== friendRequestId));
        setOriginalRequests((prev) => prev.filter((item) => item.id !== friendRequestId));
      }
    });
  };


  const handleDecline = (friendRequestId: string) => {
    if (!socket || !token) return;
    socket.emit("declineFriendRequest", { friendRequestId, token });
    socket.once("declineFriendRequestResponse", (response) => {
      if (response.code === 200) {
        setRequests((prev) => prev.filter((item) => item.id !== friendRequestId));
        setOriginalRequests((prev) => prev.filter((item) => item.id !== friendRequestId));
      }
    });
  };

  const renderRequestItem = ({ item }) => (
    <View style={[styles.requestItem, { borderColor: theme.colors.border }]} key={item.id}>
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
        <Text style={[styles.time, { color: theme.colors.text }]}>
          {moment(item.createdAt).fromNow()} gửi lời mời
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={() => handleAccept(item.id)}>
            <Text style={styles.buttonText}>Xác nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={() => handleDecline(item.id)}>
            <Text style={styles.buttonText}>Hủy lời mời</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Lời mời kết bạn ({requests.length})</Text>
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
              <Text style={{ textAlign: "center", marginTop: 20, color: theme.colors.text }}>
                Không có lời mời nào
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  sortLabel: { color: "#007AFF", fontSize: 14 },
  requestItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    marginTop: 4,
  },
  infoContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold" },
  time: { fontSize: 13, marginTop: 4 },
  buttonRow: { flexDirection: "row", marginTop: 10 },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    alignItems: "center",
  },
  acceptButton: { backgroundColor: "#4CAF50" },
  declineButton: { backgroundColor: "#F44336", marginRight: 0 },
  buttonText: { color: "#fff", fontWeight: "600" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    fontSize: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  modalClose: {
    fontSize: 16,
    color: "#FF3B30",
    marginTop: 20,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default FriendRequestsScreen;
