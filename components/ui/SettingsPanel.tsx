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
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/theme/theme"; 
import { getNickname, setNickname } from "@/src/apis/nickName";
import {
  createGroupFromChat,
  fetchDetailFriends,
} from "@/src/apis/conversation";
import { FriendUserDetail } from "@/src/interface/interface";
import { router } from "expo-router";
import {
  API_BASE_URL,
  getAuthHeaders,
  getCurrentUserId,
} from "@/src/utils/config";
import { DOMAIN } from "@/src/configs/base_url";
import { connectSocket, getSocket } from "@/src/socket/socket";
import AddToGroupModal from "../AddToGroupModal";
import CommonGroupsModal from "../CommonGroupsModal";

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

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
  slideAnim: Animated.Value;
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
  participants: { id: string; method: string }[];
  leaderId?: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  visible,
  onClose,
  slideAnim,
  targetUserId,
  onRename,
  currentUserId,
  isGroupChat = false,
  conversationId,
  friendName,
  onMessageSelect,
}) => {
  const { width } = useWindowDimensions(); 
  const { theme } = useAppTheme(); 
  const [groups, setGroups] = useState<Group[]>([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [addToGroupModalVisible, setAddToGroupModalVisible] = useState<boolean>(false);
  const [searchGroupText, setSearchGroupText] = useState<string>("");
  const [filteredGroupsForAdd, setFilteredGroupsForAdd] = useState<Group[]>(groups);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<string>("");
  const [viewCommonGroupsModalVisible, setViewCommonGroupsModalVisible] = useState<boolean>(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteGroupModalVisible, setDeleteGroupModalVisible] = useState(false);
  const [leaveGroupModalVisible, setLeaveGroupModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<FriendUserDetail[]>([]);
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [removeMemberModalVisible, setRemoveMemberModalVisible] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [approvalRequestsModalVisible, setApprovalRequestsModalVisible] = useState(false);
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [friendAvatar, setFriendAvatar] = useState<string | null>(null);

  // Fetch friend's avatar for single chat
  useEffect(() => {
    if (visible && !isGroupChat && targetUserId) {
      const fetchFriendInfo = async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(`${API_BASE_URL}/user/${targetUserId}`, {
            method: "GET",
            headers,
          });

          if (!response.ok) {
            throw new Error("Không thể lấy thông tin người dùng");
          }

          const userData = await response.json();
          setFriendAvatar(
            userData.avatarUrl ||
              userData.urlAVT ||
              userData.image ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          );
        } catch (error: any) {
          console.error("Lỗi khi lấy thông tin người dùng:", error.message);
          setFriendAvatar("https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
        }
      };
      fetchFriendInfo();
    }
  }, [visible, isGroupChat, targetUserId]);

  useEffect(() => {
    if (!visible || !conversationId) return;

    const socket = connectSocket();
    if (!socket) {
      console.error("Socket chưa sẵn sàng.");
      return;
    }

    // Gửi yêu cầu lấy trạng thái xét duyệt
    console.log(
      "Gửi sự kiện get-approval-status với conversationId:",
      conversationId
    );

    // Lắng nghe phản hồi từ server
    const handleApprovalStatus = (data: {
      conversationId: string;
      isApprovalRequired: boolean;
    }) => {
      if (data.conversationId === conversationId) {
        console.log(
          "Nhận trạng thái xét duyệt từ server:",
          data.isApprovalRequired
        );
        setIsApprovalRequired(data.isApprovalRequired); // Cập nhật trạng thái từ server
      }
    };

    socket.then((socket) => {
      socket.on("approval-status", handleApprovalStatus);
    });
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
                  name: userData.username || userData.name || item.id,
                  urlAVT:
                    userData.urlAVT ||
                    userData.avatarUrl ||
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
      const handleApprovalStatusUpdated = (data: {
        conversationId: string;
        isApprovalRequired: boolean;
      }) => {
        if (data.conversationId === conversationId) {
          console.log(
            "Nhận trạng thái xét duyệt được cập nhật từ server:",
            data.isApprovalRequired
          );
          setIsApprovalRequired(data.isApprovalRequired); // Đồng bộ lại với server
        }
      };

      socket?.on("error", ({ message }) => {
        Platform.OS === "web"
          ? window.alert(message)
          : Alert.alert("Thông báo", message);
      });
      socket?.on("approval-status-updated", handleApprovalStatusUpdated);
      socket.on(
        "userJoinedGroup",
        ({ message, userJoin, conversationId: cid }) => {
          if (cid === conversationId && userJoin) {
            setGroupMembers((prev) => [
              ...prev,
              {
                _id: userJoin.id,
                name: userJoin.name || userJoin.username || "Unknown",
                urlAVT:
                  userJoin.urlAVT ||
                  userJoin.avatarUrl ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              },
            ]);
          }
        }
      );

      socket.on(
        "reponse-approve-into-group",
        ({ message, userJoin, conversationId: cid }) => {
          if (cid === conversationId) {
            userJoin &&
              setGroupMembers((pre) => [
                ...pre,
                {
                  _id: userJoin.id,
                  name: userJoin.name || userJoin.username || "Unknown",
                  urlAVT:
                    userJoin.urlAVT ||
                    userJoin.avatarUrl ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                },
              ]);
          }
        }
      );
      socket.on("userLeft", ({ userId, conversationId: cid }) => {
        if (cid === conversationId) {
          setGroupMembers((pre) => {
            return pre.filter((item) => item._id != userId);
          });
        }
      });
    });
  }, []);

  

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
    await connectSocket().then((socket) => {
      setIsApprovalRequired((prevState) => {
        const newApprovalStatus = prevState;
        console.log(
          "Gửi sự kiện toggle-approval với trạng thái mới:",
          newApprovalStatus
        );

        // Gửi yêu cầu bật/tắt trạng thái xét duyệt
        socket?.emit("toggle-approval", {
          conversationId,
          isApprovalRequired: newApprovalStatus,
        });

        return newApprovalStatus; // Cập nhật state
      });
    });
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
      toValue: width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      router.replace("/home");
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
    console.log(decision);
    connectSocket()
      .then((socket) => {
        socket.emit("approve-into-group", {
          conversationId: conversationId,
          userId: id,
          decision: decision,
        });
      })
      .then(() => {
        setApprovalRequestsModalVisible(false);
      });
  };
  const blockChatting = () => {
    connectSocket().then((socket) => {
      socket.emit("block-chatting", {
        conversationId,
        isChatting: !isChatting,
      });
    });
    setIsChatting(!isChatting);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.modalBackground}>
          <Animated.View
            style={[
              styles.settingsPanel,
              {
                transform: [{ translateX: slideAnim }],
                backgroundColor: theme.colors.card,
                width: width >= 768 ? width * 0.4 : width * 0.75, // Responsive width
              },
            ]}
          >
            <View style={styles.settingsHeader}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="arrow-back-outline" size={width >= 768 ? 28 : 24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.settingsTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
                Tùy chọn
              </Text>
            </View>
            <View style={styles.userInfo}>
              {isGroupChat ? (
                <Ionicons name="people-outline" size={width >= 768 ? 64 : 60} color={theme.colors.text} />
              ) : (
                <Image
                  source={{ uri: friendAvatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
                  style={[styles.userAvatar, { width: width >= 768 ? 64 : 60, height: width >= 768 ? 64 : 60 }]}
                />
              )}
              <Text style={[styles.userName, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
                {isGroupChat ? conversationDetails?.groupName || "Nhóm chat" : friendName}
              </Text>
            </View>
            {isGroupChat && (
              <View style={[styles.membersSection, { paddingHorizontal: width >= 768 ? width * 0.05 : 16 }]}>
                <Text style={[styles.subTitle, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Thành viên nhóm ({groupMembers.length}):
                </Text>
                <FlatList
                  data={groupMembers}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onLongPress={(event) => handleLongPress(event, item._id)}
                      style={[styles.memberItem, { paddingVertical: width >= 768 ? 12 : 8 }]}
                    >
                      <Image
                        source={{ uri: item.urlAVT }}
                        style={[styles.memberAvatar, { width: width >= 768 ? 34 : 30, height: width >= 768 ? 34 : 30 }]}
                      />
                      <View style={styles.memberInfo}>
                        <Text
                          style={[styles.memberName, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}
                        >
                          {item.name}
                          {item._id === conversationDetails?.leaderId && " (Trưởng nhóm)"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            <ScrollView style={styles.settingsOptions}>
              {conversationDetails?.leaderId === currentUserId ? (
                <TouchableOpacity
                  style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                  onPress={() => setRenameModalVisible(true)}
                >
                  <Ionicons name="pencil-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                  <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                    Đổi tên nhóm
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                  onPress={() => setRenameModalVisible(true)}
                >
                  <Ionicons name="pencil-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                  <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                    Đổi tên gợi nhớ
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                onPress={handleFetchMedia}
              >
                <Ionicons name="image-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Ảnh, file, link
                </Text>
              </TouchableOpacity>
              {isGroupChat && (
                <View style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}>
                  {conversationDetails?.leaderId === currentUserId ? (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                      onPress={() => {
                        fetchApprovalRequests();
                        setApprovalRequestsModalVisible(true);
                      }}
                    >
                      <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                        Phê duyệt tham gia
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <Text style={[styles.settingsText, { color: theme.colors.text + "80" }]}>
                        Phê duyệt tham gia (Chỉ trưởng nhóm)
                      </Text>
                    </View>
                  )}
                  {conversationDetails?.leaderId === currentUserId && (
                    <TouchableOpacity onPress={toggleApproval}>
                      <Ionicons
                        name={isApprovalRequired ? "toggle-off" : "toggle-on"}
                        size={width >= 768 ? 28 : 24}
                        color={isApprovalRequired ? theme.colors.text + "80" : theme.colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {conversationDetails?.leaderId === currentUserId && (
                <TouchableOpacity
                  style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                  onPress={() => {
                    fetchApprovalRequests();
                    setApprovalRequestsModalVisible(true);
                  }}
                >
                  <Ionicons name="person-add-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                  <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                    Danh sách yêu cầu
                  </Text>
                </TouchableOpacity>
              )}
              {conversationDetails?.leaderId === currentUserId && (
                <View style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}>
                  <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Khóa nhắn tin
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={blockChatting}>
                    <Ionicons
                      name={isChatting ? "toggle-off" : "toggle-on"}
                      size={width >= 768 ? 28 : 24}
                      color={isChatting ? theme.colors.text + "80" : theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                onPress={() => setSearchModalVisible(true)}
              >
                <Ionicons name="search-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Tìm tin nhắn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Ionicons name="trash-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Xóa lịch sử trò chuyện
                </Text>
              </TouchableOpacity>
              {!isGroupChat && (
                <>
                  <TouchableOpacity
                    style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                    onPress={() => setCreateGroupModalVisible(true)}
                  >
                    <Ionicons name="person-add-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                    <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Tạo nhóm với {friendName}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                    onPress={() => setAddToGroupModalVisible(true)}
                  >
                    <Ionicons name="people-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                    <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Thêm {friendName} vào nhóm
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                    onPress={() => setViewCommonGroupsModalVisible(true)}
                  >
                    <Ionicons name="people-circle-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                    <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Xem nhóm chung
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {isGroupChat && (
                <>
                  <TouchableOpacity
                    style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                    onPress={() => setAddMemberModalVisible(true)}
                  >
                    <Ionicons name="person-add-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                    <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Thêm thành viên
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                    onPress={() => setLeaveGroupModalVisible(true)}
                  >
                    <Ionicons name="log-out-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                    <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Rời nhóm
                    </Text>
                  </TouchableOpacity>
                  {conversationDetails?.leaderId === currentUserId && (
                    <TouchableOpacity
                      style={[styles.settingsItem, { paddingVertical: width >= 768 ? 18 : 14 }]}
                      onPress={() => setDeleteGroupModalVisible(true)}
                    >
                      <Ionicons name="trash-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                      <Text style={[styles.settingsText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                        Xóa nhóm
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <AddToGroupModal
        visible={addToGroupModalVisible}
        onClose={() => setAddToGroupModalVisible(false)}
        friendName={friendName}
        targetUserId={targetUserId}
        onSelectGroup={(groupId: string) => {
          const socket = getSocket();
          if (!socket) {
            Alert.alert("Lỗi", "Không thể kết nối đến server.");
            return;
          }
          socket.emit("invite-join-group", groupId, targetUserId);
          socket.once("response-invite-join-group", (response: any) => {
            if (response.code && response.code !== 200) {
              Alert.alert("Lỗi", response.error || "Có lỗi xảy ra khi mời vào nhóm.");
            }
          });
          socket.once("userJoinedGroup", () => {
            Alert.alert("Thành công", `${friendName} đã được thêm vào nhóm.`);
          });
        }}
      />

      <CommonGroupsModal
        visible={viewCommonGroupsModalVisible}
        onClose={() => setViewCommonGroupsModalVisible(false)}
        currentUserId={currentUserId}
        friendId={targetUserId}
        friendName={friendName}
        onCloseSettings={() => {
          setSettingsVisible(false);
          setMenuVisible(false);
          setOptionsVisible(false);
        }}
      />

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
                elevation: 5,
                shadowColor: theme.colors.text,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              },
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={handleRemoveFromGroup}>
              <Ionicons name="person-remove-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text, fontSize: width >= 768 ? 16 : 14 }]}>
                Xóa khỏi nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={renameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.renameModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              {isGroupChat ? "Đổi tên nhóm" : "Đổi tên gợi nhớ"}
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={isGroupChat ? "Nhập tên nhóm mới..." : "Nhập tên gợi nhớ mới..."}
              placeholderTextColor={theme.colors.text + "80"}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleRename}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={createGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.createGroupModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Tạo nhóm mới
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Nhập tên nhóm (mặc định: Nhóm mới)..."
              placeholderTextColor={theme.colors.text + "80"}
            />
            <Text style={[styles.subTitle, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              Chọn bạn bè để thêm vào nhóm:
            </Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item._id}
              style={styles.friendList}
              renderItem={({ item }) => (
                <Pressable
                  key={item._id}
                  style={[styles.friendItem, { paddingVertical: width >= 768 ? 12 : 8 }]}
                  onPress={() => toggleFriendSelection(item._id)}
                >
                  <View style={styles.friendInfo}>
                    <Image
                      source={{ uri: item.urlAVT }}
                      style={[styles.friendAvatar, { width: width >= 768 ? 34 : 30, height: width >= 768 ? 34 : 30 }]}
                    />
                    <Text style={[styles.friendName, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      {item?.name}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedFriends.includes(item._id) ? "checkbox-outline" : "square-outline"}
                    size={width >= 768 ? 28 : 24}
                    color={selectedFriends.includes(item._id) ? theme.colors.primary : theme.colors.text}
                  />
                </Pressable>
              )}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setCreateGroupModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateGroup}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addMemberModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.createGroupModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Thêm thành viên
            </Text>
            <Text style={[styles.subTitle, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              Chọn bạn bè để thêm vào nhóm:
            </Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item._id}
              style={styles.friendList}
              renderItem={({ item }) => (
                <Pressable
                  key={item._id}
                  style={[styles.friendItem, { paddingVertical: width >= 768 ? 12 : 8 }]}
                  onPress={() => toggleFriendSelection(item._id)}
                >
                  <View style={styles.friendInfo}>
                    <Image
                      source={{ uri: item.urlAVT }}
                      style={[styles.friendAvatar, { width: width >= 768 ? 34 : 30, height: width >= 768 ? 34 : 30 }]}
                    />
                    <Text style={[styles.friendName, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      {item?.name}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedFriends.includes(item._id) ? "checkbox-outline" : "square-outline"}
                    size={width >= 768 ? 28 : 24}
                    color={selectedFriends.includes(item._id) ? theme.colors.primary : theme.colors.text}
                  />
                </Pressable>
              )}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setAddMemberModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddMembers}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Xác nhận xóa
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              Bạn có chắc chắn muốn xóa lịch sử trò chuyện này? Hành động này không thể hoàn tác.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#FF4D4D" }]} // Use consistent logout color
                onPress={handleDeleteConversation}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={removeMemberModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Xác nhận xóa thành viên
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm? Hành động này không thể hoàn tác.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setRemoveMemberModalVisible(false);
                  setUserToRemove(null);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#FF4D4D" }]}
                onPress={handleRemoveMember}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Xác nhận xóa nhóm
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              Bạn có chắc chắn muốn xóa nhóm này? Hành động này không thể hoàn tác và sẽ xóa nhóm đối với tất cả thành viên.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setDeleteGroupModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#FF4D4D" }]}
                onPress={handleDeleteGroup}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={leaveGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.deleteModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Xác nhận rời nhóm
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              Bạn có chắc chắn muốn rời nhóm này? Hành động này không thể hoàn tác.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setLeaveGroupModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Hủy bỏ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#FF4D4D" }]}
                onPress={handleLeaveGroup}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>Rời</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.successModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Thành công
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
              {deleteModalVisible
                ? "Lịch sử trò chuyện đã được xóa"
                : deleteGroupModalVisible
                ? "Nhóm đã được xóa"
                : "Bạn đã rời nhóm"}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSuccessConfirm}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 18 : 16 }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={searchModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.searchModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Tìm tin nhắn
            </Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={searchKeyword}
              onChangeText={(text) => {
                setSearchKeyword(text);
                handleSearchMessages();
              }}
              placeholder="Nhập từ khóa tìm kiếm..."
              placeholderTextColor={theme.colors.text + "80"}
              autoFocus
            />
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              style={styles.searchResultList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.searchResultItem, { paddingVertical: width >= 768 ? 12 : 8 }]}
                  onPress={() => handleMessagePress(item.id)}
                >
                  <View style={styles.searchResultContent}>
                    <Text
                      style={[styles.searchResultMessage, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}
                      numberOfLines={1}
                    >
                      {item.message}
                    </Text>
                    <Text
                      style={[styles.searchResultTime, { color: theme.colors.text, fontSize: width >= 768 ? 14 : 12 }]}
                    >
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.noResultsText, { color: theme.colors.text, fontSize: width >= 768 ? 16 : 14 }]}>
                  Không tìm thấy tin nhắn nào.
                </Text>
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setSearchModalVisible(false);
                  setSearchKeyword("");
                  setSearchResults([]);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={approvalRequestsModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.approvalModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Phê duyệt tham gia
            </Text>
            <FlatList
              data={approvalRequests}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              renderItem={({ item }) => (
                <View style={[styles.approvalItem, { paddingVertical: width >= 768 ? 12 : 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={[styles.approvalAvatar, { width: width >= 768 ? 54 : 50, height: width >= 768 ? 54 : 50 }]}
                    />
                    <Text style={[styles.approvalName, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      {item.username}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={[styles.approvalButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleApprovalAction(item.id, true)}
                    >
                      <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 16 : 14 }]}>
                        Phê duyệt
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approvalButton, { backgroundColor: "#FF4D4D" }]}
                      onPress={() => handleApprovalAction(item.id, false)}
                    >
                      <Text style={[styles.buttonText, { color: "#fff", fontSize: width >= 768 ? 16 : 14 }]}>
                        Từ chối
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.noResultsText, { color: theme.colors.text + "80", fontSize: width >= 768 ? 16 : 14 }]}>
                  Không có yêu cầu nào.
                </Text>
              }
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
              onPress={() => setApprovalRequestsModalVisible(false)}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mediaModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.mediaModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: width >= 768 ? 20 : 18 }]}>
              Ảnh, file, link
            </Text>
            <ScrollView style={styles.mediaContent}>
              {images.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Ảnh/Video
                    </Text>
                    {images.length > 4 && !showAllImages && (
                      <TouchableOpacity onPress={() => setShowAllImages(true)}>
                        <Text style={[styles.seeAllText, { color: theme.colors.primary, fontSize: width >= 768 ? 16 : 14 }]}>
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
                      <TouchableOpacity style={styles.imageItem} onPress={() => handleOpenLink(item.url)}>
                        <Image source={{ uri: item.url }} style={styles.mediaImage} resizeMode="cover" />
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {files.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      File
                    </Text>
                    {files.length > 3 && !showAllFiles && (
                      <TouchableOpacity onPress={() => setShowAllFiles(true)}>
                        <Text style={[styles.seeAllText, { color: theme.colors.primary, fontSize: width >= 768 ? 16 : 14 }]}>
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
                        style={[styles.fileItem, { paddingVertical: width >= 768 ? 12 : 8 }]}
                        onPress={() => handleOpenLink(item.url)}
                      >
                        <Ionicons name="document-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                        <View style={styles.fileInfo}>
                          <Text
                            style={[styles.fileName, { color: theme.colors.text, fontSize: width >= 768 ? 16 : 14 }]}
                            numberOfLines={1}
                          >
                            {item.filename || "Tệp không tên"}
                          </Text>
                          <Text style={[styles.fileSize, { color: theme.colors.text + "80", fontSize: width >= 768 ? 14 : 12 }]}>
                            {formatFileSize(item.size)}
                          </Text>
                        </View>
                        <Text style={[styles.mediaTime, { color: theme.colors.text + "80", fontSize: width >= 768 ? 14 : 12 }]}>
                          {formatMessageTime(item.createdAt)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {links.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
                      Link
                    </Text>
                    {links.length > 3 && !showAllLinks && (
                      <TouchableOpacity onPress={() => setShowAllLinks(true)}>
                        <Text style={[styles.seeAllText, { color: theme.colors.primary, fontSize: width >= 768 ? 16 : 14 }]}>
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
                        style={[styles.linkItem, { paddingVertical: width >= 768 ? 12 : 8 }]}
                        onPress={() => handleOpenLink(item.url)}
                      >
                        <Ionicons name="link-outline" size={width >= 768 ? 24 : 20} color={theme.colors.text} />
                        <Text
                          style={[styles.linkText, { color: theme.colors.text, fontSize: width >= 768 ? 16 : 14 }]}
                          numberOfLines={1}
                        >
                          {item.url}
                        </Text>
                        <Text style={[styles.mediaTime, { color: theme.colors.text + "80", fontSize: width >= 768 ? 14 : 12 }]}>
                          {formatMessageTime(item.createdAt)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {images.length === 0 && files.length === 0 && links.length === 0 && (
                <Text style={[styles.noResultsText, { color: theme.colors.text, fontSize: width >= 768 ? 16 : 14 }]}>
                  Không tìm thấy ảnh, file hoặc link nào.
                </Text>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setMediaModalVisible(false);
                  setMediaItems([]);
                  setShowAllImages(false);
                  setShowAllFiles(false);
                  setShowAllLinks(false);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: width >= 768 ? 18 : 16 }]}>
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
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsPanel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsTitle: {
    fontWeight: "600",
    marginLeft: 12,
  },
  userInfo: {
    alignItems: "center",
    paddingVertical: 20,
  },
  userAvatar: {
    borderRadius: 30,
    marginBottom: 10,
  },
  userName: {
    fontWeight: "600",
    marginTop: 10,
  },
  membersSection: {
    paddingVertical: 10,
  },
  subTitle: {
    fontWeight: "600",
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  memberAvatar: {
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
    fontWeight: "500",
  },
  settingsOptions: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingsText: {
    fontWeight: "500",
    marginLeft: 15,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContainer: {
    width: 150,
    borderRadius: 8,
  },
  menuItem: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  menuText: {
    fontWeight: "500",
    marginLeft: 10,
  },
  renameModal: {
    width: "80%",
    maxWidth: 320,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createGroupModal: {
    width: "80%",
    maxWidth: 320,
    height: "70%",
    maxHeight: 450,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  deleteModal: {
    width: "80%",
    maxWidth: 320,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  successModal: {
    width: "80%",
    maxWidth: 320,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchModal: {
    width: "80%",
    maxWidth: 320,
    height: "70%",
    maxHeight: 450,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mediaModal: {
    width: "80%",
    maxWidth: 320,
    height: "70%",
    maxHeight: 450,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  approvalModal: {
    width: "95%",
    maxHeight: "85%",
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitle: {
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  modalMessage: {
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 20,
  },
  renameInput: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonText: {
    fontWeight: "600",
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
