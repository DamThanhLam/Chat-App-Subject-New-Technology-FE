import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  Image,
  Linking,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { getNickname, setNickname } from "@/src/apis/nickName";
import {
  createGroupFromChat,
  fetchDetailFriends,
} from "@/src/apis/conversation";
import { FriendUserDetail } from "@/src/interface/interface";
import { router } from "expo-router";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import { DOMAIN } from "@/src/configs/base_url";

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
  slideAnim: Animated.Value;
  colorScheme: "light" | "dark" | null;
  targetUserId: string;
  onRename: (newName: string) => void;
  currentUserId: string;
  isGroupChat?: boolean;
  conversationId?: string;
  friendName: string;
  onMessageSelect?: (messageId: string) => void;
}

interface SearchMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
  contentType: string;
}

interface MediaItem {
  id: string;
  type: "image" | "file" | "link";
  url: string;
  filename: string | null;
  mimetype: string | null;
  size: number | null;
  createdAt: string;
  senderId: string;
  receiverId: string;
}

const SCREEN_WIDTH = 360;

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  visible,
  onClose,
  slideAnim,
  colorScheme,
  targetUserId,
  onRename,
  currentUserId,
  isGroupChat = false,
  conversationId,
  friendName,
  onMessageSelect,
}) => {
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false); // Modal tìm kiếm tin nhắn
  const [groupMembers, setGroupMembers] = useState<FriendUserDetail[]>([]);
  const [newName, setNewName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<FriendUserDetail[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState(""); // Từ khóa tìm kiếm
  const [searchResults, setSearchResults] = useState<SearchMessage[]>([]); // Kết quả tìm kiếm
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]); //Danh sách media (ảnh, file, link)
  const [mediaModalVisible, setMediaModalVisible] = useState(false); // Modal hiển thị media
  // Danh sách media (ảnh, file, link)

  useEffect(() => {
    if (createGroupModalVisible && !isGroupChat) {
      const loadFriends = async () => {
        try {
          const friendList = await fetchDetailFriends(currentUserId);
          const filteredFriends: any = friendList.filter(
            (friend: any) => friend._id !== targetUserId
          );
          setFriends(filteredFriends);

          const friendToSelect: any = filteredFriends.find(
            (friend: any) => friend._id === targetUserId
          );
          if (friendToSelect) {
            setSelectedFriends([friendToSelect._id]);
          }
        } catch (error: any) {
          console.error("Lỗi khi lấy danh sách bạn bè:", error.message);
          Alert.alert("Lỗi", "Không thể lấy danh sách bạn bè.");
        }
      };
      loadFriends();
    }
  }, [createGroupModalVisible, currentUserId, targetUserId, isGroupChat]);

  useEffect(() => {
    if (visible && isGroupChat && conversationId) {
      const loadGroupMembers = async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(
            `${API_BASE_URL}/conversation/${conversationId}`,
            { method: "GET", headers }
          );

          if (!response.ok) {
            throw new Error("Không thể lấy thông tin nhóm");
          }

          const conversationData = await response.json();
          const participants = conversationData.participants || [];

          const members = await Promise.all(
            participants.map(async (userId: string) => {
              try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
                  method: "GET",
                  headers,
                });

                if (!response.ok) {
                  throw new Error("Không thể lấy thông tin người dùng");
                }

                const userData = await response.json();
                return {
                  _id: userId,
                  name: userData.name || userId,
                  urlAVT:
                    userData.urlAVT ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                };
              } catch (error: any) {
                console.error(
                  "Lỗi khi lấy thông tin thành viên:",
                  error.message
                );
                return {
                  _id: userId,
                  name: userId,
                  urlAVT:
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                };
              }
            })
          );

          setGroupMembers(members);
        } catch (error: any) {
          console.error(
            "Lỗi khi lấy danh sách thành viên nhóm:",
            error.message
          );
        }
      };
      loadGroupMembers();
    }
  }, [visible, isGroupChat, conversationId]);

  const handleRename = async () => {
    if (newName.trim()) {
      try {
        await setNickname(targetUserId, newName.trim());
        onRename(newName.trim());
        setRenameModalVisible(false);
        setNewName("");
      } catch (error: any) {
        console.error("Lỗi khi đổi tên gợi nhớ:", error.message);
        Alert.alert("Lỗi", "Không thể đổi tên gợi nhớ.");
      }
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const updatedFriends = prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId];
      console.log("Updated selectedFriends:", updatedFriends);
      return updatedFriends;
    });
  };

  const handleCreateGroup = async () => {
    if (!currentUserId || typeof currentUserId !== "string") {
      Alert.alert("Lỗi", "ID người dùng hiện tại không hợp lệ.");
      return;
    }
    if (!targetUserId || typeof targetUserId !== "string") {
      Alert.alert("Lỗi", "ID người bạn không hợp lệ.");
      return;
    }

    const friendsToAdd = Array.isArray(selectedFriends) ? selectedFriends : [];
    if (!friendsToAdd.every((id) => typeof id === "string")) {
      Alert.alert("Lỗi", "Danh sách bạn bè được chọn không hợp lệ.");
      return;
    }

    try {
      console.log("Creating group with:", {
        currentUserId,
        targetUserId,
        friendsToAdd,
        groupName,
      });
      const result = await createGroupFromChat(
        targetUserId,
        friendsToAdd,
        groupName || "Nhóm mới"
      );
      setCreateGroupModalVisible(false);
      setGroupName("");
      setSelectedFriends([]);
      onClose();

      router.push({
        pathname: "/ChatScreen",
        params: { conversationId: result.conversationId },
      });
    } catch (error: any) {
      console.error("Lỗi khi tạo nhóm:", error.message);
      Alert.alert("Lỗi", error.message || "Không thể tạo nhóm.");
    }
  };

  const handleDeleteConversation = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${DOMAIN}:3000/api/message/mark-deleted-single-chat?friendId=${targetUserId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Không thể xóa lịch sử trò chuyện");
      }

      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("Lỗi khi xóa lịch sử trò chuyện:", error.message);
      Alert.alert("Lỗi", "Không thể xóa lịch sử trò chuyện.");
    }
  };

  const handleSuccessConfirm = () => {
    console.log(
      "Success modal OK pressed, closing delete modal and SettingsPanel"
    );
    setDeleteModalVisible(false);
    setSuccessModalVisible(false);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      console.log("SettingsPanel closed, navigating to HomeScreen");
      router.replace("/home/HomeScreen");
    });
  };

  // Xử lý tìm kiếm tin nhắn
  const handleSearchMessages = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${DOMAIN}:3000/api/message/search-private?friendId=${targetUserId}&keyword=${encodeURIComponent(
          searchKeyword
        )}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Không thể tìm kiếm tin nhắn");
      }

      const data = await response.json();
      setSearchResults(data.messages || []);
    } catch (error: any) {
      console.error("Lỗi khi tìm kiếm tin nhắn:", error.message);
      Alert.alert("Lỗi", "Không thể tìm kiếm tin nhắn.");
      setSearchResults([]);
    }
  };

  // Xử lý khi nhấn vào một tin nhắn trong kết quả tìm kiếm
  const handleMessagePress = (messageId: string) => {
    onClose();
    if (onMessageSelect) {
      onMessageSelect(messageId);
    }

    setSearchModalVisible(false);
    setSearchKeyword("");
    setSearchResults([]);
  };

  // Định dạng thời gian cho tin nhắn
  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Xử lý lấy danh sách media (ảnh, file, link)
  const handleFetchMedia = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${DOMAIN}:3000/api/message/media?friendId=${targetUserId}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Không thể lấy danh sách media");
      }

      const data = await response.json();
      setMediaItems(data.messages || []);
      setMediaModalVisible(true); // Mở modal hiển thị media
    } catch (error: any) {
      console.error("Lỗi khi lấy danh sách media:", error.message);
      Alert.alert("Lỗi", "Không thể lấy danh sách media.");
    }
  };

  // Xử lý khi nhấn vào một link
  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Lỗi", "Không thể mở liên kết này.");
      }
    } catch (error: any) {
      console.error("Lỗi khi mở liên kết:", error.message);
      Alert.alert("Lỗi", "Không thể mở liên kết.");
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.settingsModalBackground}>
          <Animated.View
            style={[
              styles.settingsPanel,
              {
                transform: [{ translateX: slideAnim }],
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View style={styles.settingsHeader}>
              <TouchableOpacity onPress={onClose}>
                <FontAwesome
                  name="arrow-left"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text
                style={[styles.settingsTitle, { color: theme.colors.text }]}
              >
                Tùy chọn
              </Text>
            </View>
            <View style={styles.userInfo}>
              <FontAwesome
                name="user-circle"
                size={60}
                color={theme.colors.text}
              />
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {isGroupChat ? "Nhóm chat" : friendName}
              </Text>
            </View>
            {isGroupChat && (
              <View style={styles.membersSection}>
                <Text style={[styles.subTitle, { color: theme.colors.text }]}>
                  Thành viên nhóm:
                </Text>
                <FlatList
                  data={groupMembers}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <View style={styles.memberItem}>
                      <Image
                        source={{
                          uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                        }}
                        style={styles.memberAvatar}
                      />
                      <Text
                        style={[
                          styles.memberName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                  )}
                />
              </View>
            )}
            <View style={styles.settingsOptions}>
              {!isGroupChat && (
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => setRenameModalVisible(true)}
                >
                  <FontAwesome
                    name="pencil"
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text
                    style={[styles.settingsText, { color: theme.colors.text }]}
                  >
                    Đổi tên gợi nhớ
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleFetchMedia} // Gọi hàm lấy danh sách media
              >
                <FontAwesome name="image" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Ảnh, file, link
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => setSearchModalVisible(true)} // Hiển thị modal tìm kiếm
              >
                <FontAwesome
                  name="search"
                  size={20}
                  color={theme.colors.text}
                />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Tìm tin nhắn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="bell" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Tắt thông báo
                </Text>
              </TouchableOpacity>
              {!isGroupChat && (
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => setCreateGroupModalVisible(true)}
                >
                  <FontAwesome
                    name="user-plus"
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text
                    style={[styles.settingsText, { color: theme.colors.text }]}
                  >
                    Tạo nhóm với User Name
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="users" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Thêm User Name vào nhóm
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="group" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Xem nhóm chung
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem]}
                onPress={() => setDeleteModalVisible(true)}
              >
                <FontAwesome name="trash" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Xóa lịch sử trò chuyện
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal đổi tên gợi nhớ */}
      <Modal visible={renameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.renameModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Đổi tên gợi nhớ
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nhập tên gợi nhớ mới..."
              placeholderTextColor={theme.colors.text}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleRename}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal tạo nhóm */}
      <Modal visible={createGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[
              styles.createGroupModal,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Tạo nhóm mới
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Nhập tên nhóm (mặc định: Nhóm mới)..."
              placeholderTextColor={theme.colors.text}
            />
            <Text style={[styles.subTitle, { color: theme.colors.text }]}>
              Chọn bạn bè để thêm vào nhóm:
            </Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item._id}
              style={styles.friendList}
              renderItem={({ item }) => (
                <Pressable
                  key={item._id}
                  style={styles.friendItem}
                  onPress={() => toggleFriendSelection(item._id)}
                >
                  <View style={styles.friendInfo}>
                    <Image
                      source={{
                        uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                      }}
                      style={styles.friendAvatar}
                    />
                    <Text
                      style={[styles.friendName, { color: theme.colors.text }]}
                    >
                      {item?.name}
                    </Text>
                  </View>
                  <FontAwesome
                    name={
                      selectedFriends.includes(item._id)
                        ? "check-square-o"
                        : "square-o"
                    }
                    size={24}
                    color={
                      selectedFriends.includes(item._id)
                        ? theme.colors.primary
                        : theme.colors.text
                    }
                  />
                </Pressable>
              )}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => setCreateGroupModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleCreateGroup}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Xác nhận xóa
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text }]}>
              Bạn có chắc chắn muốn xóa lịch sử trò chuyện này? Hành động này
              không thể hoàn tác.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "red" }]}
                onPress={handleDeleteConversation}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal thông báo thành công */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[
              styles.successModal,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Thành công
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text }]}>
              Lịch sử trò chuyện đã được xóa
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleSuccessConfirm}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal tìm kiếm tin nhắn */}
      <Modal visible={searchModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.searchModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Tìm tin nhắn
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text }]}
              value={searchKeyword}
              onChangeText={(text) => {
                setSearchKeyword(text);
                handleSearchMessages(); // Tìm kiếm ngay khi người dùng nhập
              }}
              placeholder="Nhập từ khóa tìm kiếm..."
              placeholderTextColor={theme.colors.text}
              autoFocus
            />
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              style={styles.searchResultList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => {
                    handleMessagePress(item.id);
                  }}
                >
                  <View style={styles.searchResultContent}>
                    <Text
                      style={[
                        styles.searchResultMessage,
                        { color: theme.colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.message}
                    </Text>
                    <Text
                      style={[
                        styles.searchResultTime,
                        { color: theme.colors.text },
                      ]}
                    >
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={[styles.noResultsText, { color: theme.colors.text }]}
                >
                  Không tìm thấy tin nhắn nào.
                </Text>
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => {
                  setSearchModalVisible(false);
                  setSearchKeyword("");
                  setSearchResults([]);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal hiển thị danh sách media (ảnh, file, link) */}
      <Modal visible={mediaModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.mediaModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Ảnh, file, link
            </Text>
            <FlatList
              data={mediaItems}
              keyExtractor={(item) => item.id}
              style={styles.mediaList}
              renderItem={({ item }) => (
                <View style={styles.mediaItem}>
                  {/* Hiển thị ảnh */}
                  {item.type === "image" && (
                    <TouchableOpacity onPress={() => handleOpenLink(item.url)}>
                      <Image
                        source={{ uri: item.url }}
                        style={styles.mediaImage}
                        resizeMode="cover"
                      />
                      <Text
                        style={[styles.mediaTime, { color: theme.colors.text }]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* Hiển thị file */}
                  {item.type === "file" && (
                    <TouchableOpacity
                      style={styles.fileItem}
                      onPress={() => handleOpenLink(item.url)}
                    >
                      <FontAwesome
                        name="file"
                        size={20}
                        color={theme.colors.text}
                      />
                      <Text
                        style={[styles.fileName, { color: theme.colors.text }]}
                      >
                        {item.filename || "Tệp không tên"}
                      </Text>
                      <Text
                        style={[styles.mediaTime, { color: theme.colors.text }]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* Hiển thị link */}
                  {item.type === "link" && (
                    <TouchableOpacity
                      style={styles.linkItem}
                      onPress={() => handleOpenLink(item.url)}
                    >
                      <FontAwesome
                        name="link"
                        size={20}
                        color={theme.colors.text}
                      />
                      <Text
                        style={[styles.linkText, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {item.url}
                      </Text>
                      <Text
                        style={[styles.mediaTime, { color: theme.colors.text }]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <Text
                  style={[styles.noResultsText, { color: theme.colors.text }]}
                >
                  Không tìm thấy ảnh, file hoặc link nào.
                </Text>
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => {
                  setMediaModalVisible(false);
                  setMediaItems([]);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SettingsPanel;

const styles = StyleSheet.create({
  settingsModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  settingsPanel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  userInfo: {
    alignItems: "center",
    paddingVertical: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  settingsOptions: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingHorizontal: 20,
  },
  settingsText: {
    fontSize: 16,
    marginLeft: 15,
  },
  membersSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  subTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  memberName: {
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  renameModal: {
    width: 300,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  createGroupModal: {
    width: 300,
    height: 400,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  deleteModal: {
    width: 300,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  successModal: {
    width: 300,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  searchModal: {
    width: 300,
    height: 400,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  mediaModal: {
    width: 300,
    height: 400,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  renameInput: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  friendList: {
    width: "100%",
    maxHeight: 200,
    marginBottom: 15,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  friendName: {
    fontSize: 16,
  },
  searchResultList: {
    width: "100%",
    maxHeight: 250,
    marginBottom: 15,
  },
  searchResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  searchResultContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultMessage: {
    fontSize: 16,
    flex: 1,
  },
  searchResultTime: {
    fontSize: 12,
    marginLeft: 10,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  mediaList: {
    width: "100%",
    maxHeight: 250,
    marginBottom: 15,
  },
  mediaItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginBottom: 5,
  },
  mediaTime: {
    fontSize: 12,
    marginTop: 5,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileName: {
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
});
