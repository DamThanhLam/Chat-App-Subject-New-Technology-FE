import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DefaultTheme } from "@react-navigation/native";
import { getCurrentUserId, getAuthHeaders } from "@/src/utils/config";
import { DOMAIN } from "@/src/configs/base_url";

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export interface Group {
  id: string;
  groupName: string;
  participants: string[]; // Danh sách userId các thành viên trong nhóm
  avatarUrl?: string; // nếu có, hiển thị avatar của nhóm
}

interface AddToGroupModalProps {
  visible: boolean;
  onClose: () => void;
  friendName: string;
  targetUserId: string; // ID của user bạn (user D) cần được thêm vào nhóm
  onSelectGroup: (groupId: string) => void;
}

const AddToGroupModal: React.FC<AddToGroupModalProps> = ({
  visible,
  onClose,
  friendName,
  targetUserId,
  onSelectGroup,
}) => {
  const theme = DefaultTheme;
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchGroupText, setSearchGroupText] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Hàm fetch danh sách nhóm của user A và lọc ra những nhóm mà user D chưa tham gia
  const fetchGroups = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error(
          "User ID is undefined. Vui lòng đăng nhập lại hoặc kiểm tra luồng truyền giá trị."
        );
      }

      const headers = await getAuthHeaders();

      // Bước 1: Fetch danh sách my-groups của user A
      const groupsResponse = await fetch(
        `${DOMAIN}:3000/api/conversations/my-groups/${userId}`,
        {
          method: "GET",
          headers,
        }
      );
      if (!groupsResponse.ok) {
        throw new Error("Failed to fetch groups");
      }
      const groupsData: Group[] = await groupsResponse.json();

      // Bước 2: Fetch thông tin user D để lấy listConversation (các nhóm mà user D đã tham gia)
      const friendResponse = await fetch(
        `${DOMAIN}:3000/api/user/${targetUserId}`,
        {
          method: "GET",
          headers,
        }
      );
      if (!friendResponse.ok) {
        throw new Error("Failed to fetch friend details");
      }
      const friendData = await friendResponse.json();
      const friendListConversation: string[] = friendData.listConversation || [];

      // Bước 3: Lọc các nhóm mà user D chưa tham gia
      const filtered = groupsData.filter(
        (group) => !friendListConversation.includes(group.id)
      );
      setGroups(filtered);
      setFilteredGroups(filtered);
    } catch (error: any) {
      console.error("Error fetching groups:", error.message);
    }
  };

  // Khi modal mở ra, fetch lại danh sách nhóm
  useEffect(() => {
    if (visible) {
      fetchGroups();
      setSearchGroupText("");
      setSelectedGroupId("");
    }
  }, [visible, targetUserId]);

  // Khi từ khóa tìm kiếm thay đổi, cập nhật danh sách nhóm hiển thị
  useEffect(() => {
    if (!searchGroupText.trim()) {
      setFilteredGroups(groups);
      return;
    }
    const filtered = groups.filter((group) =>
      group.groupName.toLowerCase().includes(searchGroupText.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [searchGroupText, groups]);

  const handleSelect = (groupId: string) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId("");
    } else {
      setSelectedGroupId(groupId);
    }
  };

  const handleConfirm = () => {
    if (!selectedGroupId) {
      Alert.alert("Thông báo", "Vui lòng chọn một nhóm để thêm.");
      return;
    }
    onSelectGroup(selectedGroupId);
    // Reset trạng thái và đóng modal
    setSearchGroupText("");
    setSelectedGroupId("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: theme.colors.card }]}>
          <Text style={[modalStyles.title, { color: theme.colors.text }]}>
            Thêm {friendName} vào nhóm
          </Text>
          {/* Thanh tìm kiếm */}
          <TextInput
            style={[
              modalStyles.searchInput,
              { borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            placeholder="Tìm kiếm tên nhóm..."
            placeholderTextColor={theme.colors.text}
            value={searchGroupText}
            onChangeText={setSearchGroupText}
          />
          {/* Danh sách nhóm */}
          <FlatList
            data={filteredGroups}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            style={modalStyles.groupList}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedGroupId;
              return (
                <TouchableOpacity
                  style={[
                    modalStyles.groupItem,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : "transparent",
                    },
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={modalStyles.groupItemContainer}>
                    <Image
                      source={{ uri: item.avatarUrl || DEFAULT_AVATAR }}
                      style={modalStyles.groupAvatar}
                    />
                    <Text
                      style={[
                        modalStyles.groupName,
                        { color: isSelected ? "#fff" : theme.colors.text },
                      ]}
                    >
                      {item.groupName}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[modalStyles.emptyText, { color: theme.colors.text }]}>
                Không tìm thấy nhóm.
              </Text>
            }
          />
          {/* Nút Đóng và Thêm vào nhóm */}
          <View style={modalStyles.buttonsContainer}>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[modalStyles.buttonText, { color: theme.colors.text }]}>
                Đóng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[modalStyles.buttonText, { color: "#fff" }]}>
                Thêm vào nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddToGroupModal;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: isSmallDevice ? "90%" : "80%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  searchInput: {
    width: "100%",
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  groupList: {
    maxHeight: 200,
    width: "100%",
    marginBottom: 12,
  },
  groupItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupItemContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  groupName: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginVertical: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
