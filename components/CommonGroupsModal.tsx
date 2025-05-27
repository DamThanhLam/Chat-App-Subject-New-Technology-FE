// CommonGroupsModal.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { DefaultTheme } from "@react-navigation/native";
import { getAuthHeaders } from "@/src/utils/config";
import { DOMAIN } from "@/src/configs/base_url";
import { getSocket } from "@/src/socket/socket";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

interface Group {
  id: string;
  groupName: string;
  avatarUrl?: string;
}

interface CommonGroupsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string; // ID của user A
  friendId: string;      // ID của user D (friend)
  friendName: string;
  onCloseSettings?: () => void; // Callback để tắt luôn Settings và các menu khác
}

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;

const CommonGroupsModal: React.FC<CommonGroupsModalProps> = ({
  visible,
  onClose,
  currentUserId,
  friendId,
  friendName,
  onCloseSettings,
}) => {
  const theme = DefaultTheme;
  const router = useRouter();
  const [commonGroups, setCommonGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Lấy danh sách nhóm chung giữa user A và user D
  const fetchCommonGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const headers = await getAuthHeaders();

      // Fetch danh sách my-groups của user A
      const groupsResponse = await fetch(
        `${DOMAIN}:3000/api/conversations/my-groups/${currentUserId}`,
        { method: "GET", headers }
      );
      if (!groupsResponse.ok) {
        throw new Error("Không thể lấy danh sách nhóm của bạn.");
      }
      const myGroupsData: Group[] = await groupsResponse.json();
      console.log("Dữ liệu nhóm của user A:", myGroupsData);

      // Gán avatar mặc định nếu avatarUrl bị thiếu hoặc là chuỗi rỗng
      const myGroups = myGroupsData.map((group) => ({
        ...group,
        avatarUrl:
          group.avatarUrl && group.avatarUrl.trim() !== ""
            ? group.avatarUrl
            : DEFAULT_AVATAR,
      }));
      console.log("Dữ liệu nhóm sau khi gán avatar:", myGroups);

      // Fetch thông tin user D để lấy listConversation
      const friendResponse = await fetch(
        `${DOMAIN}:3000/api/user/${friendId}`,
        { method: "GET", headers }
      );
      if (!friendResponse.ok) {
        throw new Error("Không thể lấy thông tin bạn bè.");
      }
      const friendData = await friendResponse.json();
      console.log("Dữ liệu của user D:", friendData);
      const friendListConversation: string[] =
        friendData.listConversation || [];

      // Lọc ra các nhóm chung: nếu group.id nằm trong listConversation của user D
      const common = myGroups.filter((group) =>
        friendListConversation.includes(group.id)
      );
      console.log("Nhóm chung:", common);
      setCommonGroups(common);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải dữ liệu nhóm chung.");
      console.error("FetchCommonGroups Error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, friendId]);

  useEffect(() => {
    if (visible) {
      fetchCommonGroups();
    } else {
      setCommonGroups([]);
      setError("");
    }
  }, [visible, fetchCommonGroups]);

  // Reload danh sách khi nhận sự kiện "groupCreated" qua socket (nếu có)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleGroupCreated = () => {
      fetchCommonGroups();
    };
    socket.on("groupCreated", handleGroupCreated);
    return () => {
      socket.off("groupCreated", handleGroupCreated);
    };
  }, [fetchCommonGroups]);

  // Khi nhấn vào một group item
  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupItem}
      
    >
      <Image source={{ uri: item.avatarUrl }} style={styles.groupAvatar} />
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: theme.colors.text }]}>
          {item.groupName}
        </Text>
      </View>
      {/* <Ionicons name="chevron-forward" size={20} color={theme.colors.text} /> */}
    </TouchableOpacity>
  );


  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Nhóm chung với {friendName}
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : error ? (
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              {error}
            </Text>
          ) : (
            <FlatList
              data={commonGroups}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                  Không tìm thấy nhóm chung.
                </Text>
              }
            />
          )}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: "#fff" }]}>
              Đóng
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CommonGroupsModal;

const styles = StyleSheet.create({
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
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
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
  },
  emptyText: {
    textAlign: "center",
    fontSize: isSmallDevice ? 14 : 16,
    marginVertical: 20,
  },
  errorText: {
    textAlign: "center",
    fontSize: isSmallDevice ? 14 : 16,
    marginVertical: 10,
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
  },
});
