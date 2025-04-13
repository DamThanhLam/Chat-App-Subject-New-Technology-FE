// src/components/SettingsPanel.tsx
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
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { setNickname } from "@/src/apis/nickName";
import {
  createGroupFromChat,
  fetchDetailFriends,
} from "@/src/apis/conversation";
import { Friend, FriendUserDetail } from "@/src/interface/interface";
import { router } from "expo-router";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";

// Định nghĩa kiểu cho props
interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
  slideAnim: Animated.Value;
  colorScheme: "light" | "dark" | null;
  targetUserId: string; // ID của người dùng được đặt tên gợi nhớ (friendId)
  onRename: (newName: string) => void; // Callback để cập nhật tên trong ChatScreen
  currentUserId: string; // ID của người dùng hiện tại
  isGroupChat?: boolean; // Kiểm tra xem có phải chat nhóm không
  conversationId?: string; // ID của cuộc trò chuyện (dùng cho chat nhóm)
}

const SCREEN_WIDTH = 360; // Giả định chiều rộng màn hình

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
}) => {
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<FriendUserDetail[]>([]);
  const [newName, setNewName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<FriendUserDetail[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Lấy danh sách bạn bè và tự động tích chọn bạn bè có _id trùng với targetUserId
  useEffect(() => {
    if (createGroupModalVisible && !isGroupChat) {
      const loadFriends = async () => {
        try {
          const friendList = await fetchDetailFriends(currentUserId);
          // Lọc bỏ targetUserId khỏi danh sách bạn bè để tránh trùng lặp
          const filteredFriends: any = friendList.filter(
            (friend: any) => friend._id !== targetUserId
          );
          setFriends(filteredFriends);

          // Tự động tích chọn bạn bè có _id trùng với targetUserId
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

  // Lấy danh sách thành viên nhóm nếu là chat nhóm
  useEffect(() => {
    if (visible && isGroupChat && conversationId) {
      const loadGroupMembers = async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(
            `${API_BASE_URL}/conversation/${conversationId}`,
            {
              method: "GET",
              headers,
            }
          );

          if (!response.ok) {
            throw new Error("Không thể lấy thông tin nhóm");
          }

          const conversationData = await response.json();
          const participants = conversationData.participants || [];

          // Lấy thông tin chi tiết của từng thành viên
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

  // Xử lý đổi tên gợi nhớ
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

  // Xử lý chọn bạn bè để thêm vào nhóm
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const updatedFriends = prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId];
      console.log("Updated selectedFriends:", updatedFriends);
      return updatedFriends;
    });
  };

  // Xử lý tạo nhóm
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
                {isGroupChat ? "Nhóm chat" : "User Name"}
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
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="image" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Ảnh, file, link
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
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
              <TouchableOpacity style={[styles.settingsItem]}>
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
  // Styles cho modal đổi tên và tạo nhóm
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
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
});
