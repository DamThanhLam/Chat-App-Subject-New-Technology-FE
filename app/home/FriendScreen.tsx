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
import { connectSocket, getSocket, initSocket } from "@/src/socket/socket";
import Toast from "react-native-toast-message";
import { DOMAIN } from "@/src/configs/base_url";
import { router } from "expo-router";
import { getNickname } from "@/src/apis/nickName";

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
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false);

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
        const res = await fetch(DOMAIN + `:3000/api/friends/get-friends/${user.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          },
        });
        const data = await res.json();
        const rawFriends = data.friends || [];

        const acceptedFriends = rawFriends.filter(friend => friend.status === "accepted");

        const enrichedFriends = await Promise.all(
          acceptedFriends.map(async (friend) => {
            const otherUserId = friend.senderId === user.id ? friend.receiverId : friend.senderId;
            try {
              const userRes = await fetch(DOMAIN + `:3000/api/user/${otherUserId}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
              });
              const userData = await userRes.json();
              const resultNickname = await getNickname(otherUserId);

              return {
                ...friend,
                name: resultNickname && resultNickname.nickname? resultNickname.nickname : userData.username || "Unknown",
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
    setIsAlreadyFriend(true);
    setFriendRequestSent(false);

    try {
      // Gọi API tìm kiếm user theo email
      const res = await fetch(DOMAIN + `:3000/api/user/search?email=${encodeURIComponent(searchEmail)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Không thể tìm kiếm người dùng.");

      const data = await res.json();

      if (data?.users && data.users.length > 0) {
        const foundUser = data.users[0];
        setSearchResult(foundUser);

        // Kiểm tra nếu đã là bạn bè
        const alreadyFriend = friends.some(f =>
          (f.senderId === user.id && f.receiverId === foundUser.id) ||
          (f.receiverId === user.id && f.senderId === foundUser.id)
        );
        setIsAlreadyFriend(alreadyFriend);

        // Nếu chưa là bạn bè thì kiểm tra xem đã gửi lời mời hay chưa
        if (!alreadyFriend) {
          const checkPendingRes = await fetch(DOMAIN + `:3000/api/friends/check-pending-request?senderId=${user.id}&receiverId=${foundUser.id}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!checkPendingRes.ok) throw new Error("Không thể kiểm tra trạng thái lời mời.");

          const checkPendingData = await checkPendingRes.json();
          setFriendRequestSent(!!checkPendingData?.isPending);
        }
      } else {
        setSearchResult(null);
      }
    } catch (err) {
      console.error("Lỗi tìm user:", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    connectSocket()
  }, [])
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

    const payload = {
      senderId: user.id,
      receiverId,
      message: "",
    };

    socket.emit("send-friend-request", payload);

    socket.once("send-friend-request-response", (res) => {
      if (res.code === 200) {
        setFriendRequestSent(true);
        Toast.show({
          type: "success",
          text1: "Đã gửi lời mời kết bạn",
        });
      } else {
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
      const res = await fetch(`${DOMAIN}:3000/api/friends/cancel?senderId=${user.id}&receiverId=${receiverId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setFriendRequestSent(false);
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
    console.log(grouped)
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
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={theme.colors.primary}
                style={{ marginLeft: 10 }}
                onPress={() => {

                  router.push({
                    pathname: "/ChatScreen",
                    params: {
                      // conversationId: item.lastMessage?.conversationId || "",
                      userID2: user.id === item.senderId ? item.receiverId : item.senderId,
                      friendName: item.name,
                    },
                  });
                }}
              />
            </View>
          </View>
        ))}
      </View>
    ));
  };

  const handleOpenAddFriendModal = () => {
    setSearchEmail(""); // Reset ô input
    setSearchResult(null); // Reset kết quả tìm kiếm
    setSearching(false); // Reset trạng thái loading
    setFriendRequestSent(false); // Reset trạng thái gửi lời mời
    setShowAddFriendModal(true);
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
              placeholder="Tìm kiếm..."
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
              <TouchableOpacity onPress={handleOpenAddFriendModal} style={styles.shortcutItem}>
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setShowAddFriendModal(false);
                setSearchEmail("");
                setSearchResult(null);
                setSearching(false);
                setFriendRequestSent(false);
              }}>
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

                {isAlreadyFriend ? (
                  <Text style={{ marginTop: 10, color: "green", fontWeight: "bold" }}>Đã là bạn bè</Text>
                ) : friendRequestSent ? (
                  <TouchableOpacity
                    onPress={() => handleCancelFriendRequest(searchResult.id)}
                    style={[styles.searchBtn, { marginTop: 10 }]}
                  >
                    <Text style={styles.searchText}>Hủy lời mời</Text>
                  </TouchableOpacity>
                ) : (
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
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  tab: { paddingVertical: 12, paddingHorizontal: 20 },
  tabText: { fontSize: 16, fontWeight: "600" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#0066cc" },
  shortcuts: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  shortcutItem: { alignItems: "center" },
  shortcutText: { marginTop: 5, fontSize: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  actions: { flexDirection: "row", marginLeft: "auto" },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  name: { marginLeft: 12, fontSize: 16, fontWeight: "600" },
  groupTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: 300,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    backgroundColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchBtn: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cancelText: { color: "#fff" },
  searchText: { color: "#fff" },
  searchResultContainer: {
    marginTop: 20,
    alignItems: "center",
  },
});

export default FriendScreen;
