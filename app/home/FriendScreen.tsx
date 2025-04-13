// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, useNavigation } from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { getSocket } from "@/src/socket/socket";
import Toast from "react-native-toast-message";

const FriendScreen = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const navigation = useNavigation();

  const user = useSelector((state: RootState) => state.user);
  const [token, setToken] = useState("");
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("friends");

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

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

    const fetchFriends = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/get-friends/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const rawFriends = data.friends || [];

        const acceptedFriends = rawFriends.filter(friend => friend.status === "accepted");

        const enrichedFriends = await Promise.all(
          acceptedFriends.map(async (friend) => {
            const otherUserId = friend.senderId === user.id ? friend.receiverId : friend.senderId;
            try {
              const userRes = await fetch(`http://localhost:3000/api/user/${otherUserId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const userData = await userRes.json();
              return {
                ...friend,
                name: userData.username || "Unknown",
                avatarUrl:
                  userData.avatarUrl || "https://cdn-icons-png.flaticon.com/512/219/219983.png",
              };
            } catch (error) {
              return {
                ...friend,
                name: "Unknown",
                avatarUrl: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
              };
            }
          })
        );

        setFriends(enrichedFriends);
        setFilteredFriends(enrichedFriends);
      } catch (err) {
        console.error("Lỗi fetch friends:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [token, user.id]);

  useEffect(() => {
    const filtered = friends.filter(friend =>
      friend.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFriends(filtered);
  }, [searchTerm, friends]);

  const groupByFirstLetter = (list) => {
    const groups = {};
    list.forEach((friend) => {
      const letter = friend.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(friend);
    });
    return Object.entries(groups).sort();
  };

  const handleSearchByEmail = async () => {
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`http://localhost:3000/api/user/search?email=${encodeURIComponent(searchEmail)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data?.users && data.users.length > 0) {
        setSearchResult(data.users[0]);
      } else {
        setSearchResult(null);
      }
    } catch (err) {
      console.error("Lỗi tìm user:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = (receiverId: string) => {
    const socket = getSocket();

    if (!socket || !user?.id || !receiverId) {
      console.error("Thiếu thông tin gửi lời mời");
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Không thể gửi lời mời kết bạn",
      });
      return;
    }
    console.log("Gửi lời mời từ người dùng:", user.id);
    console.log("Đến người nhận:", receiverId);
    const payload = {
      senderId: user.id,
      receiverId,
      message: "", // tuỳ chọn
    };

    socket.emit("send-friend-request", payload);

    // Lắng nghe phản hồi từ server
    socket.once("send-friend-request-response", (res) => {
      if (res.code === 200) {
        console.log("✅ Gửi lời mời thành công:", res.data);
        setFriendRequestSent(true); // Cập nhật trạng thái gửi lời mời thành công
        Toast.show({
          type: "success",
          text1: "Đã gửi lời mời kết bạn",
        });
      } else {
        console.error("❌ Gửi lỗi:", res.error);
        Toast.show({
          type: "error",
          text1: "Gửi thất bại",
          text2: res.error,
        });
      }
    });
  };



  const handleCancelFriendRequest = async (receiverId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/friends/cancel-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId,
        }),
      });
      if (res.ok) {
        setFriendRequestSent(false); // Đặt lại trạng thái sau khi hủy lời mời
        alert("Đã hủy lời mời kết bạn!");
        setShowAddFriendModal(false);
      } else {
        alert("Không thể hủy lời mời.");
      }
    } catch (err) {
      console.error("Lỗi hủy lời mời:", err);
    }
  };
  

  const renderFriendGroup = () => {
    const grouped = groupByFirstLetter(filteredFriends);
    return grouped.map(([letter, items]) => (
      <View key={letter}>
        <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{letter}</Text>
        {items.map((item) => (
          <View key={item.id} style={[styles.itemContainer, { borderColor: theme.colors.border }]}>
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
            <View style={styles.actions}>
              <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
              <MaterialIcons name="video-call" size={22} color={theme.colors.primary} style={{ marginLeft: 10 }} />
            </View>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#888"
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setSelectedTab("friends")} style={styles.tab}>
              <Text style={[styles.tabText, selectedTab === "friends" && styles.tabActive]}>
                Bạn bè
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedTab("groups")} style={styles.tab}>
              <Text style={[styles.tabText, selectedTab === "groups" && styles.tabActive]}>
                Nhóm
              </Text>
            </TouchableOpacity>
          </View>

          {selectedTab === "friends" && (
            <View style={styles.shortcuts}>
              <TouchableOpacity onPress={() => setShowAddFriendModal(true)} style={styles.shortcutItem}>
                <Ionicons name="person-add" size={22} color="#0066cc" />
                <Text style={styles.shortcutText}>Thêm bạn</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            {selectedTab === "friends" ? (
              renderFriendGroup()
            ) : (
              <Text style={{ color: theme.colors.text, marginTop: 20 }}>
                Tính năng nhóm sẽ sớm ra mắt!
              </Text>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={showAddFriendModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Thêm bạn</Text>

            <TextInput
              placeholder="Nhập email..."
              placeholderTextColor="#888"
              style={styles.input}
              value={searchEmail}
              onChangeText={setSearchEmail}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddFriendModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearchByEmail}>
                <Text style={styles.searchText}>Tìm kiếm</Text>
              </TouchableOpacity>
            </View>

            {searching && <ActivityIndicator style={{ marginTop: 10 }} />}
            {searchResult && (
              <View style={styles.searchResultContainer}>
                <Text style={{ fontSize: 16, fontWeight: "bold" }}>{searchResult.username}</Text>
                <Text>{searchResult.email}</Text>
                <Image source={{ uri: searchResult.avatarUrl }} style={styles.avatar} />

                {friendRequestSent ? (
                  // Nút "Hủy lời mời" nếu đã gửi lời mời
                  <TouchableOpacity
                    onPress={() => handleCancelFriendRequest(searchResult.id)}
                    style={[styles.searchBtn, { marginTop: 10 }]}
                  >
                    <Text style={styles.searchText}>Hủy lời mời</Text>
                  </TouchableOpacity>
                ) : (
                  // Nút "Gửi lời mời" nếu chưa gửi lời mời
                  <TouchableOpacity
                    onPress={() => handleSendFriendRequest(searchResult.id)}
                    style={[styles.searchBtn, { marginTop: 10 }]}
                  >
                    <Text style={styles.searchText}>Gửi lời mời</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: {
    marginTop: 10,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderColor: "#ccc",
    backgroundColor: "#f2f2f2",
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  tabContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 12 },
  tab: { paddingVertical: 8 },
  tabText: { fontSize: 16, color: "#888" },
  tabActive: {
    color: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    fontWeight: "bold",
  },
  shortcuts: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  shortcutItem: { flexDirection: "row", alignItems: "center" },
  shortcutText: { marginLeft: 6, fontSize: 15, color: "#333" },
  groupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  name: { fontSize: 16, flex: 1 },
  actions: { flexDirection: "row" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: {
    width: "100%",
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  cancelBtn: { padding: 10 },
  cancelText: { color: "red" },
  searchBtn: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 6,
    marginLeft: 10,
  },
  searchText: { color: "#fff" },
  searchResultContainer: { alignItems: "center", marginTop: 20 },
});

export default FriendScreen;
