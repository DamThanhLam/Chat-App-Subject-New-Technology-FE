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
  useWindowDimensions,
  ScrollView,
  Platform,
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
import { API_BASE_URL, getAuthHeaders, getCurrentUserId } from "@/src/utils/config";
import { DOMAIN } from "@/src/configs/base_url";
import { connectSocket, getSocket } from "@/src/socket/socket";

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

interface ConversationDetails {
  id: string;
  groupName: string;
  participants: { id: string, method: string }[];
  leaderId?: string;
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
  const [deleteGroupModalVisible, setDeleteGroupModalVisible] = useState(false);
  const [leaveGroupModalVisible, setLeaveGroupModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<FriendUserDetail[]>([]);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [newName, setNewName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<FriendUserDetail[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMessage[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  //remove user
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [removeMemberModalVisible, setRemoveMemberModalVisible] =
    useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [approvalRequestsModalVisible, setApprovalRequestsModalVisible] = useState(false);
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [modalVisible, setModalVisible] = useState(false)
  useEffect(() => {
    if (!visible || !conversationId) return;

    const socket = getSocket();
    if (!socket) {
      console.error("Socket chưa sẵn sàng.");
      return;
    }

    // Gửi yêu cầu lấy trạng thái xét duyệt
    console.log("Gửi sự kiện get-approval-status với conversationId:", conversationId);
    socket.emit("get-approval-status", conversationId);

    // Lắng nghe phản hồi từ server
    const handleApprovalStatus = (data: { conversationId: string; isApprovalRequired: boolean }) => {
      if (data.conversationId === conversationId) {
        console.log("Nhận trạng thái xét duyệt từ server:", data.isApprovalRequired);
        setIsApprovalRequired(data.isApprovalRequired); // Cập nhật trạng thái từ server
      }
    };

    socket.on("approval-status", handleApprovalStatus);

    // Cleanup listener khi component unmount
    return () => {
      socket.off("approval-status", handleApprovalStatus);
    };
  }, [visible, conversationId]);

  // Lấy thông tin nhóm và thành viên nhóm
  useEffect(() => {
    if (visible && isGroupChat && conversationId) {
      const loadGroupInfo = async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(
            `${API_BASE_URL}/conversations/${conversationId}`,
            { method: "GET", headers }
          );

          if (!response.ok) {
            throw new Error("Không thể lấy thông tin nhóm");
          }

          const conversationData: ConversationDetails = await response.json();

          setConversationDetails(conversationData);

          const participants = conversationData.participants || [];
          console.log("participants", participants);

          const members = await Promise.all(
            participants.map(async (item) => {
              try {
                const headers = await getAuthHeaders();

                const response = await fetch(
                  `${API_BASE_URL}/user/${item.id}`,
                  {
                    method: "GET",
                    headers,
                  }
                );

                if (!response.ok) {
                  throw new Error("Không thể lấy thông tin người dùng");
                }

                const userData = await response.json();

                return {
                  _id: item.id,
                  name: userData.username || item.id,
                  urlAVT:
                    userData.urlAVT ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                };
              } catch (error: any) {
                const userId = item.id;
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
            "Lỗi khi lấy thông tin nhóm hoặc thành viên:",
            error.message
          );
        }
      };
      loadGroupInfo();
    }
  }, [visible, isGroupChat, conversationId]);

  // Load danh sách bạn bè khi mở modal thêm thành viên hoặc tạo nhóm
  useEffect(() => {
    if (createGroupModalVisible || addMemberModalVisible) {
      fetchDetailFriends(currentUserId)
        .then((friendList: any) => {
          console.log("friendList", friendList);

          let filteredFriends: any = friendList;

          if (createGroupModalVisible && !isGroupChat) {
            // Tạo nhóm từ chat đơn: loại bỏ targetUserId và tự động chọn targetUserId
            filteredFriends = friendList.filter(
              (friend: any) => friend._id !== targetUserId
            );
            const friendToSelect = friendList.find(
              (friend: any) => friend._id === targetUserId
            );
            if (friendToSelect) {
              setSelectedFriends([friendToSelect.id]);
            }
          } else if (addMemberModalVisible && isGroupChat) {
            // Thêm thành viên vào nhóm: loại bỏ các thành viên đã có trong nhóm
            const memberIds = groupMembers.map((member) => member._id);
            filteredFriends = friendList.filter(
              (friend: any) => !memberIds.includes(friend._id)
            );
            setSelectedFriends([]);
          }

          setFriends(filteredFriends);
        })
        .catch((error: any) => {
          console.error("Lỗi khi lấy danh sách bạn bè:", error.message);
          Alert.alert("Lỗi", "Không thể lấy danh sách bạn bè.");
        });


    }
  }, [
    createGroupModalVisible,
    addMemberModalVisible,
    currentUserId,
    targetUserId,
    isGroupChat,
    groupMembers,
  ]);

  useEffect(() => {
    if (approvalRequestsModalVisible) {
      fetchApprovalRequests();
    }
  }, [approvalRequestsModalVisible]);
  useEffect(() => {
    connectSocket().then((socket) => {
      // Lắng nghe phản hồi cập nhật từ server
      const handleApprovalStatusUpdated = (data: { conversationId: string; isApprovalRequired: boolean }) => {
        if (data.conversationId === conversationId) {
          console.log("Nhận trạng thái xét duyệt được cập nhật từ server:", data.isApprovalRequired);
          setIsApprovalRequired(data.isApprovalRequired); // Đồng bộ lại với server
        }
      };

      socket?.on("error", ({ message }) => {
        Platform.OS === "web"
          ? window.alert(message)
          : Alert.alert("Thông báo", message);
      });
      socket?.on("approval-status-updated", handleApprovalStatusUpdated);
      socket.on("userJoinedGroup", ({ message, userJoin }) => {
        userJoin && setGroupMembers(pre => [...pre, {
          _id: userJoin.id,
          name: userJoin.name || "Unknown",
          urlAVT: userJoin.urlAVT || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        }])
      })
      socket.on("reponse-approve-into-group", ({ message, userJoin }) => {
        userJoin && setGroupMembers(pre => [...pre, {
          _id: userJoin.id,
          name: userJoin.name || "Unknown",
          urlAVT: userJoin.urlAVT || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        }])
      })
      socket.on("userLeft", ({ userId }) => {
        setGroupMembers(pre => {
          return pre.filter(item => item._id != userId)
        })
      })
    })

  }, [])
  // Hàm tải danh sách yêu cầu tham gia
  const fetchApprovalRequests = async () => {
    if (!conversationId) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${DOMAIN}:3000/api/conversations/${conversationId}/approval-requests`,
        { method: "GET", headers }
      );

      if (!response.ok) {
        throw new Error("Không thể tải danh sách yêu cầu tham gia");
      }

      const data = await response.json();
      setApprovalRequests(data.requests || []);
    } catch (error: any) {
      console.error("Lỗi khi tải danh sách yêu cầu tham gia:", error.message);
    }
  };

  // 2. Hàm toggle 
  const toggleApproval = async () => {
    if (!conversationId) return;

    // Tính toán trạng thái mới dựa trên giá trị hiện tại
    await connectSocket().then(socket => {
      setIsApprovalRequired((prevState) => {
        const newApprovalStatus = prevState;
        console.log("Gửi sự kiện toggle-approval với trạng thái mới:", newApprovalStatus);

        // Gửi yêu cầu bật/tắt trạng thái xét duyệt
        socket?.emit("toggle-approval", { conversationId, isApprovalRequired: newApprovalStatus });

        return newApprovalStatus; // Cập nhật state
      });
    })


  };

  // Xử lý đổi tên gợi nhớ (chat đơn) hoặc đổi tên nhóm (chat nhóm)
  const handleRename = async () => {
    if (newName.trim()) {
      try {
        if (isGroupChat) {
          // Đổi tên nhóm
          const socket = getSocket();

          socket?.emit("rename-group", { conversationId, newName });
          onRename && onRename(newName.trim());
        } else {
          // Đổi tên gợi nhớ (chat đơn)
          await setNickname(targetUserId, newName.trim());
          onRename && onRename(newName.trim());
        }

        setRenameModalVisible(false);
        onClose();

        setNewName("");
      } catch (error: any) {
        console.error("Lỗi khi đổi tên:", error.message);
        Alert.alert(
          "Lỗi",
          isGroupChat ? "Không thể đổi tên nhóm." : "Không thể đổi tên gợi nhớ."
        );
      }
    }
  };

  // Xử lý chọn bạn bè để tạo nhóm hoặc thêm vào nhóm
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const updatedFriends = prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId];
      return updatedFriends;
    });
  };

  // Xử lý tạo nhóm mới từ chat đơn
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

  // Xử lý thêm thành viên vào nhóm
  const handleAddMembers = async () => {
    if (!conversationId) {
      Alert.alert("Lỗi", "ID cuộc trò chuyện không hợp lệ.");
      return;
    }

    const friendsToAdd = Array.isArray(selectedFriends) ? selectedFriends : [];
    if (
      !friendsToAdd.every((id) => typeof id === "string") ||
      friendsToAdd.length === 0
    ) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một người bạn để thêm.");
      return;
    }

    try {

      const socket = getSocket();
      friendsToAdd.forEach((newUserId) => {
        socket?.emit("invite-join-group", conversationId, newUserId);
      });

      setAddMemberModalVisible(false);
      onClose();
      setSelectedFriends([]);

      Alert.alert("Thành công", "Đã thêm thành viên vào nhóm.");
    } catch (error: any) {
      console.error("Lỗi khi thêm thành viên:", error.message);
      Alert.alert("Lỗi", "Không thể thêm thành viên vào nhóm.");
    }
  };

  // Xử lý rời nhóm
  const handleLeaveGroup = async () => {
    if (!conversationId || !currentUserId) {
      Alert.alert("Lỗi", "ID cuộc trò chuyện hoặc người dùng không hợp lệ.");
      return;
    }

    try {
      // Emit sự kiện leave-group để thông báo cho các thành viên khác
      const socket = getSocket();
      socket?.emit("leaveGroup", { conversationId, userId: currentUserId });

      setLeaveGroupModalVisible(false);
      onClose();
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("Lỗi khi rời nhóm:", error.message);
      Alert.alert("Lỗi", "Không thể rời nhóm.");
    }
  };

  // Xử lý xóa nhóm (chỉ trưởng nhóm mới có quyền)
  const handleDeleteGroup = async () => {
    if (!conversationId || !currentUserId) {
      Alert.alert("Lỗi", "ID cuộc trò chuyện hoặc người dùng không hợp lệ.");
      return;
    }

    if (conversationDetails?.leaderId !== currentUserId) {
      Alert.alert("Lỗi", "Chỉ trưởng nhóm mới có quyền xóa nhóm.");
      return;
    }

    try {
      // Emit sự kiện socket để thông báo xóa nhóm
      const socket = getSocket();
      socket?.emit("delete-group", conversationId);

      setDeleteGroupModalVisible(false);
      onClose();
      // setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("Lỗi khi xóa nhóm:", error.message);
      Alert.alert("Lỗi", "Không thể xóa nhóm.");
    }
  };

  // Xử lý xóa lịch sử trò chuyện (cả chat đơn và chat nhóm)
  const handleDeleteConversation = async () => {
    try {
      const headers = await getAuthHeaders();
      let response;

      if (isGroupChat) {
        // Xóa lịch sử trò chuyện nhóm
        if (!conversationId) {
          throw new Error("ID cuộc trò chuyện không hợp lệ.");
        }
        response = await fetch(
          `${DOMAIN}:3000/api/message/mark-deleted-group-chat?conversationId=${conversationId}`,
          {
            method: "DELETE",
            headers,
          }
        );
      } else {
        // Xóa lịch sử trò chuyện chat đơn
        if (!targetUserId) {
          throw new Error("ID người bạn không hợp lệ.");
        }
        response = await fetch(
          `${DOMAIN}:3000/api/message/mark-deleted-single-chat?friendId=${targetUserId}`,
          {
            method: "DELETE",
            headers,
          }
        );
      }

      if (!response.ok) {
        throw new Error("Không thể xóa lịch sử trò chuyện");
      }

      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("Lỗi khi xóa lịch sử trò chuyện:", error.message);
      Alert.alert("Lỗi", "Không thể xóa lịch sử trò chuyện.");
    }
  };

  // Xử lý khi nhấn OK sau khi xóa thành công
  const handleSuccessConfirm = () => {
    setDeleteModalVisible(false);
    setDeleteGroupModalVisible(false);
    setLeaveGroupModalVisible(false);
    setSuccessModalVisible(false);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
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
      let response;
      if (isGroupChat) {
        // Tìm kiếm tin nhắn trong nhóm
        response = await fetch(
          `${API_BASE_URL}/message/search-group?conversationId=${conversationId}&keyword=${encodeURIComponent(
            searchKeyword
          )}`,
          {
            method: "GET",
            headers,
          }
        );
      } else {
        // Tìm kiếm tin nhắn trong chat đơn
        response = await fetch(
          `${DOMAIN}:3000/api/message/search-private?friendId=${targetUserId}&keyword=${encodeURIComponent(
            searchKeyword
          )}`,
          {
            method: "GET",
            headers,
          }
        );
      }

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
      let response;
      if (isGroupChat) {
        // Lấy media trong nhóm
        response = await fetch(
          `${DOMAIN}:3000/api/message/media-group?conversationId=${conversationId}`,
          {
            method: "GET",
            headers,
          }
        );
      } else {
        // Lấy media trong chat đơn
        response = await fetch(
          `${DOMAIN}:3000/api/message/media?friendId=${targetUserId}`,
          {
            method: "GET",
            headers,
          }
        );
      }

      if (!response.ok) {
        throw new Error("Không thể lấy danh sách media");
      }

      const data = await response.json();
      setMediaItems(data.messages || []);
      setMediaModalVisible(true);
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

  // Xử lý xóa thành viên khỏi nhóm
  const handleRemoveMember = async () => {
    if (!conversationId || !currentUserId || !userToRemove) {
      Alert.alert("Lỗi", "Thông tin không hợp lệ.");
      return;
    }

    try {
      const socket = getSocket();
      if (!socket) {
        throw new Error("Không thể kết nối đến server");
      }

      // Emit sự kiện remove-user-from-group qua socket
      socket.emit("remove-user-from-group", {
        conversationId,
        userIdToRemove: userToRemove,
      });

      setRemoveMemberModalVisible(false);
      onClose();
      setUserToRemove(null);
      setMenuVisible(false);
      setSelectedUserId(null);
    } catch (error: any) {
      console.error("Lỗi khi xóa thành viên:", error.message);
      Alert.alert("Lỗi", "Không thể xóa thành viên khỏi nhóm.");
    }
  };

  // Hàm xử lý khi giữ chuột (long press) trên một thành viên
  const handleLongPress = (event: any, userId: string) => {
    // Chỉ hiển thị menu nếu người dùng hiện tại là trưởng nhóm và không phải chính họ
    if (
      conversationDetails?.leaderId === currentUserId &&
      userId !== currentUserId
    ) {
      const { pageX, pageY } = event.nativeEvent;
      setMenuPosition({ x: pageX, y: pageY });
      setSelectedUserId(userId);
      setMenuVisible(true);
    }
  };

  // Hàm xử lý khi chọn "Xóa khỏi nhóm" từ menu
  const handleRemoveFromGroup = () => {
    if (selectedUserId) {
      setUserToRemove(selectedUserId);
      setRemoveMemberModalVisible(true);
    }
  };
  // Chia mediaItems thành 3 danh sách: images, files, links
  const images = mediaItems.filter((item) => {
    if (item.type === "file") {
      return item.filename && /\.(jpg|jpeg|png|gif)$/i.test(item.filename);
    }
    return false;
  });
  const files = mediaItems.filter((item) => {
    if (item.type === "file") {
      // Kiểm tra nếu filename tồn tại và không phải là file ảnh
      return item.filename && !/\.(jpg|jpeg|png|gif)$/i.test(item.filename);
    }
    return false;
  });

  const links = mediaItems.filter((item) => item.type === "link");

  const displayedImages = showAllImages ? images : images.slice(0, 4);
  const displayedFiles = showAllFiles ? files : files.slice(0, 3);
  const displayedLinks = showAllLinks ? links : links.slice(0, 3);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const handleApprovalAction = (id: string, decision: boolean) => {
    console.log(decision)
    connectSocket()
      .then(socket => {
        socket.emit("approve-into-group", { conversationId: conversationId, userId: id, decision: decision })
      }).then(() => {
        setApprovalRequestsModalVisible(false)
      })
  }
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
                {isGroupChat
                  ? conversationDetails?.groupName || "Nhóm chat"
                  : friendName}
              </Text>
            </View>
            {isGroupChat && (
              <View style={styles.membersSection}>
                <Text style={[styles.subTitle, { color: theme.colors.text }]}>
                  Thành viên nhóm ({groupMembers.length}):
                </Text>
                <FlatList
                  data={groupMembers}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onLongPress={(event) => handleLongPress(event, item._id)}
                      style={styles.memberItem}
                    >
                      <Image
                        source={{
                          uri: item.urlAVT,
                        }}
                        style={styles.memberAvatar}
                      />
                      <View style={styles.memberInfo}>
                        <Text
                          style={[
                            styles.memberName,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.name}
                          {item._id === conversationDetails?.leaderId &&
                            " (Trưởng nhóm)"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            <ScrollView style={styles.settingsOptions}>
              {conversationDetails?.leaderId === currentUserId && (
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
                    {isGroupChat ? "Đổi tên nhóm" : "Đổi tên gợi nhớ"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleFetchMedia}
              >
                <FontAwesome name="image" size={20} color={theme.colors.text} />
                <Text
                  style={[styles.settingsText, { color: theme.colors.text }]}
                >
                  Ảnh, file, link
                </Text>
              </TouchableOpacity>
              <View style={styles.settingsItem}>
                {conversationDetails?.leaderId === currentUserId ? (
                  <>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                      onPress={() => {
                        fetchApprovalRequests();
                        setApprovalRequestsModalVisible(true);
                      }}
                    >
                      <Text style={[styles.settingsText, { color: theme.colors.text }]}>
                        Phê duyệt tham gia
                      </Text>
                    </TouchableOpacity>

                  </>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Text style={[styles.settingsText, { color: "gray" }]}>
                      Phê duyệt tham gia (Chỉ trưởng nhóm)
                    </Text>
                  </View>
                )}

                {conversationDetails?.leaderId === currentUserId && (
                  <TouchableOpacity onPress={toggleApproval}>
                    <FontAwesome
                      name={isApprovalRequired ? "toggle-off" : "toggle-on"}
                      size={24}
                      color={isApprovalRequired ? "gray" : "green"}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {conversationDetails?.leaderId === currentUserId ?
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    fetchApprovalRequests();
                    setApprovalRequestsModalVisible(true)
                  }}
                >
                  <FontAwesome
                    name="user-plus"
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.settingsText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Danh sách yêu cầu
                  </Text>
                </TouchableOpacity>
                :
                ""}
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => setSearchModalVisible(true)}
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
                    Tạo nhóm với {friendName}
                  </Text>
                </TouchableOpacity>
              )}
              {isGroupChat && (
                <>

                  <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => setAddMemberModalVisible(true)}
                  >
                    <FontAwesome
                      name="user-plus"
                      size={20}
                      color={theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.settingsText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Thêm thành viên
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => setLeaveGroupModalVisible(true)}
                  >
                    <FontAwesome
                      name="sign-out"
                      size={20}
                      color={theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.settingsText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Rời nhóm
                    </Text>
                  </TouchableOpacity>

                  {conversationDetails?.leaderId === currentUserId && (
                    <TouchableOpacity
                      style={styles.settingsItem}
                      onPress={() => setDeleteGroupModalVisible(true)}
                    >
                      <FontAwesome
                        name="trash"
                        size={20}
                        color={theme.colors.text}
                      />
                      <Text
                        style={[
                          styles.settingsText,
                          { color: theme.colors.text },
                        ]}
                      >
                        Xóa nhóm
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {!isGroupChat && (
                <>
                  <TouchableOpacity style={styles.settingsItem}>
                    <FontAwesome
                      name="users"
                      size={20}
                      color={theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.settingsText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Thêm {friendName} vào nhóm
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingsItem}>
                    <FontAwesome
                      name="group"
                      size={20}
                      color={theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.settingsText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Xem nhóm chung
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal menu tùy chọn khi giữ chuột */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => {
            setMenuVisible(false);
            setSelectedUserId(null);
          }}
        >
          <View
            style={[
              styles.menuContainer,
              {
                position: "absolute",
                left: menuPosition.x,
                top: menuPosition.y,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRemoveFromGroup}
            >
              <FontAwesome
                name="user-times"
                size={20}
                color={theme.colors.text}
              />
              <Text style={[styles.menuText]}>Xóa khỏi nhóm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal đổi tên gợi nhớ hoặc đổi tên nhóm */}
      <Modal visible={renameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.renameModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {isGroupChat ? "Đổi tên nhóm" : "Đổi tên gợi nhớ"}
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={
                isGroupChat ? "Nhập tên nhóm mới..." : "Nhập tên gợi nhớ mới..."
              }
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
                        uri: item.urlAVT,
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

      {/* Modal thêm thành viên vào nhóm */}
      <Modal visible={addMemberModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[
              styles.createGroupModal,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Thêm thành viên
            </Text>
            <Text style={[styles.subTitle, { color: theme.colors.text }]}>
              Chọn bạn bè để thêm vào nhóm:
            </Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item._id}
              style={styles.friendList}
              renderItem={({ item }) => {
                return (
                  <Pressable
                    key={item._id}
                    style={styles.friendItem}
                    onPress={() => toggleFriendSelection(item._id)}
                  >
                    <View style={styles.friendInfo}>
                      <Image
                        source={{
                          uri: item.urlAVT,
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
                )
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => setAddMemberModalVisible(false)}
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
                onPress={handleAddMembers}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận xóa lịch sử trò chuyện (chat đơn) */}
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

      <Modal
        visible={removeMemberModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackground}>
          <View
            style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Xác nhận xóa thành viên
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text }]}>
              Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm? Hành động này
              không thể hoàn tác.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => {
                  setRemoveMemberModalVisible(false);
                  setUserToRemove(null);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "red" }]}
                onPress={handleRemoveMember}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận xóa nhóm */}
      <Modal visible={deleteGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Xác nhận xóa nhóm
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text }]}>
              Bạn có chắc chắn muốn xóa nhóm này? Hành động này không thể hoàn
              tác và sẽ xóa nhóm đối với tất cả thành viên.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => setDeleteGroupModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "red" }]}
                onPress={handleDeleteGroup}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận rời nhóm */}
      <Modal visible={leaveGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Xác nhận rời nhóm
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text }]}>
              Bạn có chắc chắn muốn rời nhóm này? Hành động này không thể hoàn
              tác.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => setLeaveGroupModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "red" }]}
                onPress={handleLeaveGroup}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Rời</Text>
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
              {deleteModalVisible
                ? "Lịch sử trò chuyện đã được xóa"
                : deleteGroupModalVisible
                  ? "Nhóm đã được xóa"
                  : "Bạn đã rời nhóm"}
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
                handleSearchMessages();
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
      {/* Modal phê duyệt */}
      {/* Modal phê duyệt */}
      <Modal
        visible={approvalRequestsModalVisible}
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <View
            style={{
              width: "95%",
              maxHeight: "85%",
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              padding: 24,
            }}
          >
            {/* Tiêu đề */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 16,
                color: theme.colors.text,
              }}
            >
              Phê duyệt tham gia
            </Text>

            {/* Danh sách yêu cầu */}
            <FlatList
              data={approvalRequests}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  {/* Avatar + tên */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: "#eee",
                        marginRight: 12,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: theme.colors.text,
                      }}
                    >
                      {item.username}
                    </Text>
                  </View>

                  {/* Nút phê duyệt / từ chối */}
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: "#28a745",
                        marginRight: 8,
                      }}
                      onPress={() => handleApprovalAction(item.id, true)}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                        }}
                      >
                        Phê duyệt
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: "#dc3545",
                      }}
                      onPress={() => handleApprovalAction(item.id, false)}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                        }}
                      >
                        Từ chối
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: "center",
                    color: "#666",
                    paddingVertical: 20,
                  }}
                >
                  Không có yêu cầu nào.
                </Text>
              }
            />

            {/* Nút Đóng */}
            <TouchableOpacity
              style={{
                alignSelf: "center",
                marginTop: 8,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 8,
                backgroundColor: "#ccc",
              }}
              onPress={() => setApprovalRequestsModalVisible(false)}
            >
              <Text
                style={{
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                Đóng
              </Text>
            </TouchableOpacity>
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
            <ScrollView style={styles.mediaContent}>
              {/* Phần ảnh/video */}
              {images.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      Ảnh/Video
                    </Text>
                    {images.length > 4 && !showAllImages && (
                      <TouchableOpacity onPress={() => setShowAllImages(true)}>
                        <Text
                          style={[
                            styles.seeAllText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          Xem tất cả
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={displayedImages}
                    keyExtractor={(item) => item.id}
                    numColumns={4}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.imageItem}
                        onPress={() => handleOpenLink(item.url)}
                      >
                        <Image
                          source={{ uri: item.url }}
                          style={styles.mediaImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* Phần file */}
              {files.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      File
                    </Text>
                    {files.length > 3 && !showAllFiles && (
                      <TouchableOpacity onPress={() => setShowAllFiles(true)}>
                        <Text
                          style={[
                            styles.seeAllText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          Xem tất cả
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={displayedFiles}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.fileItem}
                        onPress={() => handleOpenLink(item.url)}
                      >
                        <FontAwesome
                          name="file"
                          size={20}
                          color={theme.colors.text}
                        />
                        <View style={styles.fileInfo}>
                          <Text
                            style={[
                              styles.fileName,
                              { color: theme.colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {item.filename || "Tệp không tên"}
                          </Text>
                          <Text
                            style={[
                              styles.fileSize,
                              { color: theme.colors.text },
                            ]}
                          >
                            {formatFileSize(item.size)}{" "}
                            <FontAwesome
                              name="cloud"
                              size={12}
                              color={theme.colors.text}
                            />
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.mediaTime,
                            { color: theme.colors.text },
                          ]}
                        >
                          {formatMessageTime(item.createdAt)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* Phần link */}
              {links.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      Link
                    </Text>
                    {links.length > 3 && !showAllLinks && (
                      <TouchableOpacity onPress={() => setShowAllLinks(true)}>
                        <Text
                          style={[
                            styles.seeAllText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          Xem tất cả
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={displayedLinks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
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
                          style={[
                            styles.linkText,
                            { color: theme.colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.url}
                        </Text>
                        <Text
                          style={[
                            styles.mediaTime,
                            { color: theme.colors.text },
                          ]}
                        >
                          {formatMessageTime(item.createdAt)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* Thông báo nếu không có nội dung */}
              {images.length === 0 &&
                files.length === 0 &&
                links.length === 0 && (
                  <Text
                    style={[styles.noResultsText, { color: theme.colors.text }]}
                  >
                    Không tìm thấy ảnh, file hoặc link nào.
                  </Text>
                )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => {
                  setMediaModalVisible(false);
                  setMediaItems([]);
                  setShowAllImages(false);
                  setShowAllFiles(false);
                  setShowAllLinks(false);
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
    maxHeight: 430,
  },
  settingsOptionsContent: {
    paddingBottom: 20,
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
  memberInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberName: {
    fontSize: 16,
  },
  removeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "red",
    borderRadius: 5,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContainer: {
    width: 150,
    borderRadius: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  menuItem: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  menuText: {
    fontSize: 14,
    marginLeft: 10,
    color: "#ff0000",
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
  mediaContent: {
    width: "100%",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  imageItem: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  mediaTime: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 10,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  linkText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
  },
});
