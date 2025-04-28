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
  Alert,
  FlatList,
} from "react-native";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  useNavigation,
} from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { connectSocket, getSocket, initSocket } from "@/src/socket/socket";
import Toast from "react-native-toast-message";
import { DOMAIN } from "@/src/configs/base_url";
import { router } from "expo-router";
import { getNickname } from "@/src/apis/nickName";
import * as ImagePicker from "expo-image-picker";

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
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const DEFAULT_AVATAR =
    "https://cdn-icons-png.flaticon.com/512/219/219983.png";

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

    const fetchData = async () => {
      try {
        setLoading(true);

        if (selectedTab === "friends") {
          await fetchFriends();
        } else if (selectedTab === "groups") {
          await fetchGroups();
        }
      } catch (error) {
        console.error(`Error fetching ${selectedTab}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user.id, selectedTab]);

  const apiFetch = async (endpoint, options = {}) => {
    const defaultOptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(`${DOMAIN}:3000${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
    }
    return response.json();
  };

  //Hàm get DS Nhóm
  const fetchGroups = async () => {
    try {
      if (!user?.id || !token) return;
  
      const groupsData = await apiFetch(`/api/conversations/my-groups/${user.id}`);
      
      if (!Array.isArray(groupsData)) throw new Error("Phản hồi không hợp lệ");
  
      const processedGroups = await Promise.all(
        groupsData.map(async (group) => ({
          ...group,
          memberCount: group.participants?.length || 0,
          isLeader: group.leaderId === user.id,
        }))
      );
      setGroups(processedGroups);
    } catch (error) {
      console.error("Error in fetchGroups:", error);
      setGroups([]);
      Toast.show({
        type: "error",
        text1: "Lỗi khi tải danh sách nhóm",
        text2: error.message,
      });
    }
  };

  //Hàm get DS Friend
  const fetchFriends = async () => {
    try {
      const friendsData = await apiFetch(`/api/friends/get-friends/${user.id}`);
      const acceptedFriends = friendsData.friends.filter(friend => friend.status === "accepted");
  
      const enrichedFriends = await Promise.all(
        acceptedFriends.map(async (friend) => {
          const otherUserId = friend.senderId === user.id ? friend.receiverId : friend.senderId;
          try {
            const [userData, nicknameData] = await Promise.all([
              apiFetch(`/api/user/${otherUserId}`),
              getNickname(otherUserId),
            ]);
            const nickname = nicknameData?.nickname || userData.name || "Unknown";
            return {
              ...friend,
              name: nickname,
              avatarUrl: userData.avatarUrl || DEFAULT_AVATAR,
            };
          } catch (error) {
            console.error(`Error processing friend ${otherUserId}:`, error);
            return {
              ...friend,
              name: "Unknown",
              avatarUrl: DEFAULT_AVATAR,
            };
          }
        })
      );
      setFriends(enrichedFriends);
      setFilteredFriends(enrichedFriends);
    } catch (error) {
      console.error("Error in fetchFriends:", error);
      setFriends([]);
      setFilteredFriends([]);
    }
  };

  useEffect(() => {
    const filtered = friends.filter((friend) =>
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

  const pickAvatar = async () => {
    // Yêu cầu quyền truy cập thư viện ảnh
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Bạn cần cấp quyền truy cập ảnh để thay đổi avatar"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
      base64: false,
    });

    console.log(result);
    // Nếu người dùng không hủy việc chọn ảnh
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarUrl(asset.uri);
    }
  };

  const handleSearchByEmail = async () => {
    setSearching(true);
    setSearchResult(null);
    setIsAlreadyFriend(true);
    setFriendRequestSent(false);
    try {
      const data = await apiFetch(`/api/user/search?email=${encodeURIComponent(searchEmail)}`);
      if (data?.users && data.users.length > 0) {
        const foundUser = data.users[0];
        setSearchResult(foundUser);
  
        // Kiểm tra nếu đã là bạn bè
        const alreadyFriend = friends.some(
          (f) =>
            (f.senderId === user.id && f.receiverId === foundUser.id) ||
            (f.receiverId === user.id && f.senderId === foundUser.id)
        );
        setIsAlreadyFriend(alreadyFriend);
  
        // Nếu chưa là bạn bè, kiểm tra lời mời đang chờ
        if (!alreadyFriend) {
          const checkPendingData = await apiFetch(
            `/api/friends/check-pending-request?senderId=${user.id}&receiverId=${foundUser.id}`
          );
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
    connectSocket().then(socket => {
      const handleNewGroup = ({ conversation }: any) => {
        const memberCount = conversation.participants?.length || 0;
        setGroups(prev => [
          ...prev,
          {
            ...conversation,
            memberCount,
            isLeader: conversation.leaderId === user.id,
          },
        ]);
        console.log([...groups])
      };
      socket?.on("group-created", handleNewGroup)
      socket?.on(
        "added-to-group",
        handleNewGroup)
    });
  }, []);
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
      await apiFetch(`/api/friends/cancel?senderId=${user.id}&receiverId=${receiverId}`, { method: "DELETE" });
      setFriendRequestSent(false);
      alert("Đã hủy lời mời kết bạn!");
      setShowAddFriendModal(false);
    } catch (err) {
      console.error("Lỗi hủy lời mời:", err);
      alert("Không thể hủy lời mời.");
    }
  };
  

  const renderFriendGroup = () => {
    const grouped = groupByFirstLetter(filteredFriends);
    console.log(grouped);
    return grouped.map(([letter, items]) => (
      <View key={letter}>
        <Text style={[styles.groupTitle, { color: theme.colors.text }]}>
          {letter}
        </Text>
        {items.map((item) => (
          <View
            key={item.id}
            style={[styles.itemContainer, { borderColor: theme.colors.border }]}
          >
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <View style={styles.actions}>
              <Ionicons
                name="call-outline"
                size={20}
                color={theme.colors.primary}
              />
              <MaterialIcons
                name="video-call"
                size={22}
                color={theme.colors.primary}
                style={{ marginLeft: 10 }}
              />
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
                      userID2:
                        user.id === item.senderId
                          ? item.receiverId
                          : item.senderId,
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

  const renderGroupItem = ({ item }: { item: Group }) => {
    return (
      <TouchableOpacity
        style={styles.groupItem}
        onPress={() => {
          router.push({
            pathname: "/GroupChatScreen",
            params: {
              conversationId: item.id,
              groupName: item.displayName,
            },
          });
        }}
      >
        <Image
          source={{ uri: item.avatarUrl || DEFAULT_AVATAR }}
          style={styles.groupAvatar}
        />
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.groupName}</Text>
          <Text style={styles.groupMembers}>
            {item.memberCount} thành viên •
            {item.isLeader ? " Bạn là trưởng nhóm" : " Bạn là thành viên"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
      </TouchableOpacity>
    );
  };

  const renderGroupList = () => {
    if (loading) {
      return <ActivityIndicator size="large" style={styles.loader} />;
    }

    if (groups.length === 0) {
      return (
        <View style={styles.noGroupsContainer}>
          <Text style={styles.noGroupsText}>Chưa có nhóm</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.groupListContainer}
      />
    );
  };

  //Tao Group
  const handleCreateGroup = async () => {
    const trimmedGroupName = groupName.trim();

    if (!trimmedGroupName) {
      Toast.show({
        type: "error",
        text1: "Tên nhóm không được để trống",
      });
      return;
    }

    // Tính tổng thành viên nhóm (bạn + những người được chọn)
    const totalMembers = new Set([user.id, ...selectedFriends]).size;
    if (totalMembers < 3) {
      Toast.show({
        type: "error",
        text1: "Nhóm phải có ít nhất 3 thành viên",
      });
      return;
    }

    try {
      setIsCreatingGroup(true);

      const actualParticipantIds = filteredFriends
        .filter((friend) => {
          const friendId =
            friend.senderId === user.id ? friend.receiverId : friend.senderId;
          return selectedFriends.includes(friendId);
        })
        .map((friend) =>
          friend.senderId === user.id ? friend.receiverId : friend.senderId
        );

      const socket = getSocket();
      if (!socket) return;
      const data = {
        participantIds: actualParticipantIds,
        groupName: trimmedGroupName,
      };

      socket.emit("create-group", data);

      Toast.show({
        type: "success",
        text1: `Đã tạo nhóm "${trimmedGroupName}" thành công`,
      });

      setGroupName("");
      setSelectedFriends([]);
      setCreateGroupModalVisible(false);
      fetchGroups();
    } catch (error: any) {
      console.error("Lỗi khi tạo nhóm:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi khi tạo nhóm",
        text2: error.message,
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleOpenAddFriendModal = () => {
    setSearchEmail(""); // Reset ô input
    setSearchResult(null); // Reset kết quả tìm kiếm
    setSearching(false); // Reset trạng thái loading
    setFriendRequestSent(false); // Reset trạng thái gửi lời mời
    setShowAddFriendModal(true);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView>
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.text}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Tìm kiếm..."
              placeholderTextColor="#888"
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setSelectedTab("friends")}
              style={styles.tab}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "friends" && styles.tabActive,
                   {color:"black"}
                ]}
              >
                Bạn bè
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab("groups")}
              style={styles.tab}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "groups" && styles.tabActive,
                  {color:"black"}
                ]}
              >
                Nhóm
              </Text>
            </TouchableOpacity>
          </View>

          {selectedTab === "friends" && (
            <View style={styles.shortcuts}>
              <TouchableOpacity
                onPress={handleOpenAddFriendModal}
                style={styles.shortcutItem}
              >
                <Ionicons name="person-add" size={22} color="#0066cc" />
                <Text style={styles.shortcutText}>Thêm bạn</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTab === "groups" && (
            <View style={styles.shortcuts}>
              <TouchableOpacity
                onPress={() => setCreateGroupModalVisible(true)}
                style={styles.shortcutItem}
              >
                <Ionicons
                  name="people-circle-outline"
                  size={22}
                  color="#0066cc"
                />
                <Text style={styles.shortcutText}>Tạo nhóm chat</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            {selectedTab === "friends"
              ? renderFriendGroup()
              : renderGroupList()}
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
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowAddFriendModal(false);
                  setSearchEmail("");
                  setSearchResult(null);
                  setSearching(false);
                  setFriendRequestSent(false);
                }}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={handleSearchByEmail}
              >
                <Text style={styles.searchText}>Tìm kiếm</Text>
              </TouchableOpacity>
            </View>

            {searching && <ActivityIndicator style={{ marginTop: 10 }} />}
            {searchResult && (
              <View style={styles.searchResultContainer}>
                <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                  {searchResult.name}
                </Text>
                <Text>{searchResult.email}</Text>
                <Image
                  source={{ uri: searchResult.avatarUrl }}
                  style={styles.avatar}
                />

                {isAlreadyFriend ? (
                  <Text
                    style={{
                      marginTop: 10,
                      color: "green",
                      fontWeight: "bold",
                    }}
                  >
                    Đã là bạn bè
                  </Text>
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

      {/* Modal tạo nhóm */}
      <Modal visible={createGroupModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.groupModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo nhóm</Text>
              <TouchableOpacity
                onPress={() => setCreateGroupModalVisible(false)}
              >
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroupContainer}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={pickAvatar}
              >
                <Image
                  source={{
                    uri:
                      avatarUrl ||
                      "https://cdn-icons-png.flaticon.com/512/219/219983.png",
                  }}
                  style={styles.avatar}
                />
              </TouchableOpacity>

              <TextInput
                placeholder="Nhập tên nhóm..."
                placeholderTextColor="#888"
                style={styles.input_namegroup}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <TextInput
              placeholder="Tìm kiếm bạn bè..."
              placeholderTextColor="#888"
              style={styles.input}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />

            <ScrollView style={{ flex: 1 }}>
              {groupByFirstLetter(filteredFriends).map(([letter, items]) => (
                <View key={letter}>
                  <Text
                    style={[styles.groupTitle, { color: theme.colors.text }]}
                  >
                    {letter}
                  </Text>
                  {items.map((item) => {
                    // Lấy ID thực tế của bạn bè
                    const friendId =
                      item.senderId === user.id
                        ? item.receiverId
                        : item.senderId;

                    return (
                      <TouchableOpacity
                        key={friendId}
                        style={[
                          styles.itemContainer,
                          { borderColor: theme.colors.border },
                        ]}
                        onPress={() => {
                          setSelectedFriends((prev) => {
                            const updated = prev.includes(friendId)
                              ? prev.filter((id) => id !== friendId)
                              : [...prev, friendId];
                            console.log("Selected Friends:", updated);
                            return updated;
                          });
                        }}
                      >
                        <Image
                          source={{ uri: item.avatarUrl }}
                          style={styles.avatar}
                        />
                        <Text
                          style={[styles.name, { color: theme.colors.text }]}
                        >
                          {item.name}
                        </Text>

                        <View style={styles.checkboxCircle}>
                          {selectedFriends.includes(friendId) && (
                            <View style={styles.checkboxSelected} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setGroupName("");
                  setSelectedFriends([]);
                  setCreateGroupModalVisible(false);
                }}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={selectedFriends.length < 2 || !groupName.trim()}
                style={[
                  styles.createBtn,
                  { backgroundColor: selectedFriends.length < 2 || !groupName.trim() ? "#ccc" : "#0066cc" },
                ]}
              >
                <Text style={styles.createText}>Tạo nhóm</Text>
              </TouchableOpacity>
            </View>
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
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "transparent",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginHorizontal: 16,
  },
  tab: { paddingVertical: 12, paddingHorizontal: 24 },
  tabText: { fontSize: 16, fontWeight: "600", color: "#333" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#007AFF" },
  shortcuts: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  shortcutItem: { flexDirection: "row", alignItems: "center" },
  shortcutText: { marginLeft: 8, fontSize: 14, color: "#007AFF", fontWeight: "500" },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  actions: { flexDirection: "row", marginLeft: "auto", gap: 16 },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  name: { marginLeft: 12, fontSize: 16, fontWeight: "500", flex: 1 },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginLeft: 16,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "80%",
    maxWidth: 320,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  input_namegroup: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  searchBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  searchText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  searchResultContainer: {
    marginTop: 16,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  groupModal: {
    backgroundColor: "white",
    width: "90%",
    maxWidth: 400,
    height: "80%",
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  groupLetter: {
    fontWeight: "600",
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    marginLeft: 16,
  },
  selectableFriend: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxCircle: {
    marginLeft: "auto",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  modalFooter: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  createBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  inputGroupContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  avatarContainer: {
    marginRight: 0,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginHorizontal: 16,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  groupInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#000",
  },
  groupLeader: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 14,
    opacity: 0.7,
    color: "#666",
  },
  groupActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  noGroupsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noGroupsText: {
    fontSize: 16,
    color: "#666",
  },
  groupListContainer: {
    paddingBottom: 20,
  },
  groupCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  groupCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  groupCardName: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    color: "#000",
  },
  groupMemberCount: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    color: "#666",
  },
  leaderBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  leaderBadgeText: {
    color: "white",
    fontSize: 12,
  },
  deputyBadge: {
    backgroundColor: "#2196F3",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  deputyBadgeText: {
    color: "white",
    fontSize: 12,
  },
  loader: {
    marginTop: 24,
  },
  groupInfo: {
    flex: 1,
  },
  groupDeputy: {},
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  viewButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default FriendScreen;
