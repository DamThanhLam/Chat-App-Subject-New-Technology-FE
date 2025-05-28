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
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { connectSocket, getSocket } from "@/src/socket/socket";
import Toast from "react-native-toast-message";
import { DOMAIN } from "@/src/configs/base_url";
import { router } from "expo-router";
import { getNickname } from "@/src/apis/nickName";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "@/src/theme/theme";

/* --- Các Interface --- */
interface Friend {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  name: string;
  avatarUrl?: string;
  //28-5-2025
  friendId: string;
}

interface Group {
  id: string;
  groupName: string;
  displayName?: string;
  participants?: string[];
  leaderId?: string;
  avatarUrl?: string;
  memberCount?: number;
  isLeader?: boolean;
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;

const FriendScreen = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.user);
  const [token, setToken] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTab, setSelectedTab] = useState<string>("friends");
  const [showAddFriendModal, setShowAddFriendModal] = useState<boolean>(false);
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [searchResult, setSearchResult] = useState<SearchUser | null>(null);
  const [searching, setSearching] = useState<boolean>(false);
  const [friendRequestSent, setFriendRequestSent] = useState<boolean>(false);
  const [isAlreadyFriend, setIsAlreadyFriend] = useState<boolean>(false);
  const [createGroupModalVisible, setCreateGroupModalVisible] =
    useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const DEFAULT_AVATAR =
    "https://cdn-icons-png.flaticon.com/512/219/219983.png";

    // --- NEW STATE: cho hành động của nút "..." ---
    //28-5-2025
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);

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

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
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
      headers: {
        ...(defaultOptions.headers || {}),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
    }
    return response.json();
  };

  // Hàm get danh sách nhóm
  const fetchGroups = async () => {
    try {
      if (!user?.id || !token) return;
      const groupsData = await apiFetch(
        `/api/conversations/my-groups/${user.id}`
      );
      if (!Array.isArray(groupsData)) throw new Error("Phản hồi không hợp lệ");

      const processedGroups = await Promise.all(
        groupsData.map(async (group: any) => ({
          ...group,
          memberCount: group.participants?.length || 0,
          isLeader: group.leaderId === user.id,
        }))
      );
      setGroups(processedGroups);
    } catch (error: any) {
      console.error("Error in fetchGroups:", error);
      setGroups([]);
      Toast.show({
        type: "error",
        text1: "Lỗi khi tải danh sách nhóm",
        text2: error.message,
      });
    }
  };

  // Hàm get danh sách bạn bè
  const fetchFriends = async () => {
    try {
      const friendsData = await apiFetch(`/api/friends/get-friends/${user.id}`);
      const acceptedFriends = friendsData.friends.filter(
        (friend: { status: string }) => friend.status === "accepted"
      );

      const enrichedFriends = await Promise.all(
        acceptedFriends.map(async (friend: any) => {
          const otherUserId =
            friend.senderId === user.id ? friend.receiverId : friend.senderId;
          try {
            const [userData, nicknameData] = await Promise.all([
              apiFetch(`/api/user/${otherUserId}`),
              getNickname(otherUserId),
            ]);
            const nickname =
              nicknameData?.nickname || userData.name || "Unknown";
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

  const groupByFirstLetter = (list: Friend[]) => {
    const groups: { [key: string]: Friend[] } = {};
    list.forEach((friend) => {
      const letter = friend.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(friend);
    });
    return Object.entries(groups).sort();
  };

  const pickAvatar = async () => {
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
      const data = await apiFetch(
        `/api/user/search?email=${encodeURIComponent(searchEmail)}`
      );
      if (data?.users && data.users.length > 0) {
        const foundUser: SearchUser = data.users[0];
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

  // Trong hàm useEffect kết nối socket
  useEffect(() => {
    connectSocket().then((socket) => {
      const handleNewGroup = ({ conversation }: any) => {
        const memberCount = conversation.participants?.length || 0;
        setGroups((prev) => {
          // Kiểm tra xem nhóm này đã tồn tại trong danh sách chưa bằng cách so sánh id
          if (prev.find((group) => group.id === conversation.id)) {
            return prev; // Nếu đã tồn tại, không thêm nữa
          }
          return [
            ...prev,
            {
              ...conversation,
              memberCount,
              isLeader: conversation.leaderId === user.id,
            },
          ];
        });
        console.log("Cập nhật nhóm mới, danh sách nhóm:", [...groups]);
      };

      socket?.on("group-created", handleNewGroup);
      socket?.on("added-to-group", handleNewGroup);
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

    socket.once("send-friend-request-response", (res: any) => {
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

  const handleCancelFriendRequest = () => {
    const socket = getSocket();
    if (!socket) {
      console.error("Chưa kết nối được socket");
      return;
    }

    // Ở phiên bản này, chúng ta dùng payload gồm senderId và receiverId như trong API của bạn
    if (!searchResult || !searchResult.id) {
      console.error("Không tìm thấy kết quả tìm kiếm hoặc ID không xác định");
      return;
    }

    const payload = { senderId: user.id, receiverId: searchResult.id };
    socket.emit("cancel-friend-request", payload);
    socket.once("cancel-friend-request-response", (res: any) => {
      if (res.code === 200) {
        setFriendRequestSent(false);
        alert("Đã hủy lời mời kết bạn!");
        setShowAddFriendModal(false);
      } else {
        console.error("Lỗi khi hủy lời mời:", res.error);
        alert("Không thể hủy lời mời: " + res.error);
      }
    });
  };
  
  //28-5-2025
  const handleDeleteFriend = () => {
    if (selectedFriend) {
      const socket = getSocket();
      if (!socket) {
        console.error("Socket not connected.");
        return;
      }

      const payload = {
        userId: user.id,
        friendId: selectedFriend.friendId,
      };

      console.log("Gửi yêu cầu xóa bạn:", payload); // Kiểm tra dữ liệu gửi đi

      socket.emit("delete-friend", payload);
      setShowOptionsModal(false);

      // Cập nhật danh sách bạn bè tạm thời
      setFriends((prev) => prev.filter((f) => f.id !== selectedFriend.id));
      setFilteredFriends((prev) => prev.filter((f) => f.id !== selectedFriend.id));
    }
  };



  const renderFriendGroup = () => {
    const grouped = groupByFirstLetter(filteredFriends);
    console.log(grouped);
    return grouped.map(([letter, items]) => (
      <View key={letter}>
        <Text style={[styles.groupTitle, { color: theme.colors.text + "80" }]}>
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
                      userID2:
                        user.id === item.senderId
                          ? item.receiverId
                          : item.senderId,
                      friendName: item.name,
                    },
                  });
                }}
              />
              //28-5-2025
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={theme.colors.primary}
                style={{ marginLeft: 10 }}
                onPress={() => {
                  setSelectedFriend(item);
                  setShowOptionsModal(true);
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
        style={[styles.groupItem, { borderColor: theme.colors.border }]}
        onPress={() => {
          router.push({
            pathname: "/GroupChatScreen",
            params: {
              conversationId: item.id,
              groupName: item.displayName || item.groupName,
            },
          });
        }}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.avatarUrl || DEFAULT_AVATAR }}
          style={styles.groupAvatar}
        />
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: theme.colors.text }]}>
            {item.groupName}
          </Text>
          <Text
            style={[styles.groupMembers, { color: theme.colors.text + "80" }]}
          >
            {item.memberCount} thành viên •{" "}
            {item.isLeader ? "Bạn là trưởng nhóm" : "Bạn là thành viên"}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.text + "80"}
        />
      </TouchableOpacity>
    );
  };

  const renderGroupList = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          style={styles.loader}
          color={theme.colors.primary}
        />
      );
    }

    if (groups.length === 0) {
      return (
        <View style={styles.noGroupsContainer}>
          <Text
            style={[styles.noGroupsText, { color: theme.colors.text + "80" }]}
          >
            Chưa có nhóm
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.groupListContainer}
      />
    );
  };

  const handleCreateGroup = async () => {
    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      Toast.show({
        type: "error",
        text1: "Tên nhóm không được để trống",
      });
      return;
    }

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
    setSearchEmail("");
    setSearchResult(null);
    setSearching(false);
    setFriendRequestSent(false);
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
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.text + "80"}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Tìm kiếm..."
              placeholderTextColor={theme.colors.text + "80"}
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <View
            style={[
              styles.tabContainer,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setSelectedTab("friends")}
              style={[
                styles.tab,
                selectedTab === "friends" && styles.activeTab,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.text },
                  selectedTab === "friends" && { color: theme.colors.primary },
                ]}
              >
                Bạn Bè
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab("groups")}
              style={[styles.tab, selectedTab === "groups" && styles.activeTab]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.text },
                  selectedTab === "groups" && { color: theme.colors.primary },
                ]}
              >
                Nhóm
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionButtons}>
            {selectedTab === "friends" ? (
              <TouchableOpacity
                onPress={handleOpenAddFriendModal}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person-add"
                  size={22}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Thêm Bạn
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCreateGroupModalVisible(true)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="people-circle-outline"
                  size={22}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Tạo Nhóm Chat
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.contentContainer}>
            {selectedTab === "friends"
              ? renderFriendGroup()
              : renderGroupList()}
          </View>
        </ScrollView>
      )}
      <Modal visible={showAddFriendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Thêm Bạn
            </Text>
            <TextInput
              placeholder="Nhập email..."
              placeholderTextColor={theme.colors.text + "80"}
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              value={searchEmail}
              onChangeText={setSearchEmail}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: "#FF4D4D" }]}
                onPress={() => {
                  setShowAddFriendModal(false);
                  setSearchEmail("");
                  setSearchResult(null);
                  setSearching(false);
                  setFriendRequestSent(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleSearchByEmail}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>Tìm Kiếm</Text>
              </TouchableOpacity>
            </View>
            {searching && (
              <ActivityIndicator
                style={{ marginTop: 10 }}
                color={theme.colors.primary}
              />
            )}
            {searchResult && (
              <View
                style={[
                  styles.searchResultContainer,
                  { backgroundColor: theme.colors.card },
                ]}
              >
                <Image
                  source={{ uri: searchResult.avatarUrl || DEFAULT_AVATAR }}
                  style={styles.modalAvatar}
                />
                <Text
                  style={[
                    styles.searchResultName,
                    { color: theme.colors.text },
                  ]}
                >
                  {searchResult.name}
                </Text>
                <Text
                  style={[
                    styles.searchResultEmail,
                    { color: theme.colors.text + "80" },
                  ]}
                >
                  {searchResult.email}
                </Text>
                {isAlreadyFriend ? (
                  <Text style={[styles.statusText, { color: "#FF4D4D" }]}>
                    Đã là bạn bè
                  </Text>
                ) : friendRequestSent ? (
                  <TouchableOpacity
                    onPress={handleCancelFriendRequest}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "#FF4D4D", marginTop: 16 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Hủy Lời Mời</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSendFriendRequest(searchResult.id)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: theme.colors.primary, marginTop: 16 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Gửi Lời Mời</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
      //28-5-2025
      <Modal visible={showOptionsModal} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={modalStyles.modalOverlay}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[modalStyles.modalContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={modalStyles.dropdownItem}
              onPress={handleDeleteFriend}
            >
              <Text style={[modalStyles.dropdownText, { color: "#FF4D4D" }]}>
                Xóa bạn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.dropdownItem}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={[modalStyles.dropdownText, { color: theme.colors.text }]}>
                Hủy
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={createGroupModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.groupModal, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Tạo Nhóm
              </Text>
              <TouchableOpacity
                onPress={() => setCreateGroupModalVisible(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroupContainer}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={pickAvatar}
              >
                <Image
                  source={{ uri: avatarUrl || DEFAULT_AVATAR }}
                  style={styles.modalAvatar}
                />
              </TouchableOpacity>
              <TextInput
                placeholder="Nhập tên nhóm..."
                placeholderTextColor={theme.colors.text + "80"}
                style={[
                  styles.input_namegroup,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
            <TextInput
              placeholder="Tìm kiếm bạn bè..."
              placeholderTextColor={theme.colors.text + "80"}
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <ScrollView style={{ flex: 1 }}>
              {groupByFirstLetter(filteredFriends).map(
                ([letter, items], groupIndex) => (
                  <View key={`${letter}-${groupIndex}`}>
                    <Text
                      style={[
                        styles.groupTitle,
                        { color: theme.colors.text + "80" },
                      ]}
                    >
                      {letter}
                    </Text>
                    {items.map((item, index) => {
                      const friendId =
                        item.senderId === user.id
                          ? item.receiverId
                          : item.senderId;
                      return (
                        <TouchableOpacity
                          key={`${friendId}-${index}`}
                          style={[
                            styles.itemContainer,
                            { borderColor: theme.colors.border },
                          ]}
                          onPress={() => {
                            setSelectedFriends((prev) =>
                              prev.includes(friendId)
                                ? prev.filter((id) => id !== friendId)
                                : [...prev, friendId]
                            );
                          }}
                          activeOpacity={0.7}
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
                          <View
                            style={[
                              styles.checkboxCircle,
                              { borderColor: theme.colors.text + "80" },
                            ]}
                          >
                            {selectedFriends.includes(friendId) && (
                              <View
                                style={[
                                  styles.checkboxSelected,
                                  { backgroundColor: theme.colors.primary },
                                ]}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </ScrollView>
            <View
              style={[
                styles.modalFooter,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: "#FF4D4D" }]}
                onPress={() => {
                  setGroupName("");
                  setSelectedFriends([]);
                  setCreateGroupModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={selectedFriends.length < 2 || !groupName.trim()}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor:
                      selectedFriends.length < 2 || !groupName.trim()
                        ? theme.colors.border
                        : theme.colors.primary,
                    opacity:
                      selectedFriends.length < 2 || !groupName.trim() ? 0.6 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>
                  {isCreatingGroup ? "Đang tạo..." : "Tạo Nhóm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

//28-5-2025
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  dropdownItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    marginBottom: 20,
  },
  searchContainer: {
    marginTop: isSmallDevice ? 8 : 16,
    marginHorizontal: isSmallDevice ? 12 : 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 16,
    paddingVertical: 0,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: isSmallDevice ? 12 : 16,
    marginHorizontal: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: isSmallDevice ? 16 : 24,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#007AFF",
  },
  actionButtons: {
    marginTop: isSmallDevice ? 12 : 16,
    marginHorizontal: isSmallDevice ? 12 : 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "500",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: isSmallDevice ? 8 : 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: isSmallDevice ? 40 : 48,
    height: isSmallDevice ? 40 : 48,
    borderRadius: isSmallDevice ? 20 : 24,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  name: {
    marginLeft: 12,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "500",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    marginLeft: "auto",
    gap: isSmallDevice ? 12 : 16,
  },
  groupTitle: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    marginTop: isSmallDevice ? 12 : 16,
    marginLeft: isSmallDevice ? 8 : 16,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: isSmallDevice ? 8 : 12,
    borderBottomWidth: 1,
  },
  groupAvatar: {
    width: isSmallDevice ? 48 : 56,
    height: isSmallDevice ? 48 : 56,
    borderRadius: isSmallDevice ? 24 : 28,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: isSmallDevice ? 12 : 14,
  },
  noGroupsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noGroupsText: {
    fontSize: isSmallDevice ? 14 : 16,
  },
  groupListContainer: {
    paddingBottom: 20,
  },
  loader: {
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: isSmallDevice ? "90%" : "80%",
    maxWidth: 400,
    padding: isSmallDevice ? 16 : 24,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupModal: {
    width: isSmallDevice ? "95%" : "90%",
    maxWidth: 400,
    height: isSmallDevice ? "85%" : "80%",
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: isSmallDevice ? 14 : 16,
  },
  input_namegroup: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: isSmallDevice ? 14 : 16,
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
  },
  searchResultContainer: {
    marginTop: 16,
    alignItems: "center",
    padding: isSmallDevice ? 12 : 16,
    borderRadius: 12,
  },
  searchResultName: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  searchResultEmail: {
    fontSize: isSmallDevice ? 14 : 16,
    marginBottom: 12,
  },
  statusText: {
    marginTop: 12,
    fontWeight: "bold",
    fontSize: isSmallDevice ? 14 : 16,
  },
  checkboxCircle: {
    marginLeft: "auto",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});

export default FriendScreen;
