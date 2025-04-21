// @ts-nocheck
import { Provider as PaperProvider } from "react-native-paper";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import EmojiPickerMobile from "rn-emoji-keyboard";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
  useColorScheme,
  Dimensions,
  Keyboard,
  Modal,
  Alert,
  Animated,
} from "react-native";
import Button from "@/components/ui/Button";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "@/src/socket/socket";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { DOMAIN } from "@/src/configs/base_url";
import { Auth } from "aws-amplify";
import SettingsPanel from "@/components/ui/SettingsPanel";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import FilePickerModal from "@/components/FilePickerModal";
import MessageItem from "@/components/MessageItem";
import { useAppDispatch } from "@/src/redux/hooks";

interface FileMessage {
  data: string;
  filename: string;
  size: number;
  type: string;
}
interface EmojiType {
  code: string;
  emoji: string;
  group: string;
}
interface DeviceFile {
  name: string;
  size: number;
  uri: string;
  lastModified: number;
}
interface Message {
  id: string;
  conversationId: string | null;
  senderId: string;
  message: string | FileMessage;
  createdAt: string;
  updatedAt: string;
  parentMessage?: Message;
  readed: string[];
  messageType: "group" | "private";
  contentType: "file" | "emoji" | "text";
  receiverId: string;
  status: "recalled" | "deleted" | "readed" | "sended" | "received";
}
interface User {
  _id: string;
  name: string;
  image: string;
}
interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message | null;
  createdAt: string;
  updatedAt: string;
  groupName?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GroupChatScreen = () => {
  const [userID1, setUserID1] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [deviceImages, setDeviceImages] = useState<MediaLibrary.Asset[]>([]);
  const [deviceFiles, setDeviceFiles] = useState<DeviceFile[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupParticipants, setGroupParticipants] = useState<User[]>([]);
  const theme = useMemo(
    () => (colorScheme === "dark" ? DarkTheme : DefaultTheme),
    [colorScheme]
  );
  const [tempSelectedImages, setTempSelectedImages] = useState<
    MediaLibrary.Asset[]
  >([]);
  const [filePickerVisible, setFilePickerVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DeviceFile | null>(null);

  const { conversationId } = useLocalSearchParams();

  const slideAnim = useState(new Animated.Value(SCREEN_WIDTH))[0];
  const [token, setToken] = useState<string>("");
  const dateBefore = useRef<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  // Lấy thông tin cuộc trò chuyện nhóm
  const fetchGroupInfo = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/conversations/${conversationId}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Không thể lấy thông tin cuộc trò chuyện nhóm");
      }

      const groupData: Conversation = await response.json();
      setGroupName(groupData.groupName || "Nhóm chat");
      setGroupParticipants(groupData.participants || []);
    } catch (error: any) {
      console.error("Lỗi khi lấy thông tin nhóm:", error.message);
    }
  };

  const showCustomAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };
  // Xử lý socket
  useEffect(() => {
    let socketRef: any;
    const initializeSocket = async () => {
      try {
        socketRef = await connectSocket();
        socketRef.emit("joinGroup", { conversationId, userId: userID1 });

        // Lắng nghe kết quả gửi tin nhắn
        socketRef.on("result", (data: { code: number; message: Message }) => {
          const { code, message } = data;
          let status: "sended" | "failed" | "received" = "sended";
          if (code === 200) {
            status = "sended";
          } else if (code === 405) {
            status = "failed";
          }
          dispatch(updateMessageStatus({ id: message.id, status }));
        });

        // Lắng nghe thành viên mới tham gia nhóm
        socketRef.on("userJoinedGroup", ({ conversationId: cid, user }) => {
          if (cid === conversationId) {
            fetchGroupInfo();
            console.log("Người dùng đã tham gia nhóm:", user);

            showCustomAlert("Thông báo", `${user.method} đã tham gia nhóm`);
          }
        });

        // Lắng nghe kết quả mời tham gia nhóm
        socketRef.on(
          "response-invite-join-group",
          (data: { message: string; conversationId?: string }) => {
            if (data.conversationId === conversationId) {
              showCustomAlert("Thông báo", data.message);
            }
          }
        );

        // Lắng nghe đổi tên nhóm
        socketRef.on(
          "group-renamed",
          ({ conversationId: cid, newName, leaderId }) => {
            if (cid === conversationId) {
              setGroupName(newName);
              // Kiểm tra xem người dùng hiện tại có phải là trưởng nhóm không
              if (userID1 !== leaderId) {
                showCustomAlert(
                  "Thông báo",
                  `Trưởng nhóm đã đổi tên nhóm thành: ${newName}`
                );
              }
            }
          }
        );

        // Lắng nghe thành viên rời nhóm
        socketRef.on(
          "userLeft",
          ({ conversationId: cid, userId, username }) => {
            if (cid === conversationId) {
              fetchGroupInfo();
              showCustomAlert(
                "Thông báo",
                `Người dùng ${username} đã rời nhóm`
              );
            }
          }
        );

        // Lắng nghe nhóm bị xóa
        socketRef.on("group-deleted", ({ conversationId: cid }) => {
          if (cid === conversationId) {
            showCustomAlert("Thông báo", "Nhóm đã giải tán");
          }
        });

        // Xử lý lỗi socket
        socketRef.on("error", (err: { error: string; code: number }) => {
          console.log("Socket error:", err);
          Alert.alert("Lỗi", err.error || "Đã có lỗi xảy ra.");
        });
      } catch (error) {
        console.error("Error connecting socket:", error);
      }
    };

    if (userID1 && token) {
      initializeSocket();
    }

    // Ngắt kết nối socket khi rời màn hình
    return () => {
      if (socketRef) {
        socketRef.off("result");
        socketRef.off("userJoinedGroup");
        socketRef.off("group-deleted");
        socketRef.off("response-invite-join-group");
        socketRef.off("userLeft");
        socketRef.off("group-renamed");
        socketRef.off("error");
      }
      disconnectSocket();
    };
  }, [userID1, token, conversationId, dispatch]);
  // Lấy token và ID người dùng
  useEffect(() => {
    const getSub = async () => {
      try {
        const session = await Auth.currentSession();
        const sub = session.getIdToken().decodePayload().sub;
        setUserID1(sub);
      } catch (err) {
        console.error("Lỗi lấy getSub:", err);
      }
    };
    getSub();
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const session = await Auth.currentSession();
        const jwtToken = session.getIdToken().getJwtToken();
        setToken(jwtToken);
      } catch (err) {
        console.error("Error fetching token", err);
      }
    };
    fetchToken();
  }, []);

  // // Lấy tin nhắn của cuộc trò chuyện nhóm
  // useEffect(() => {
  //   if (token && conversationId) {
  //     fetch(
  //       `${DOMAIN}:3000/api/message/group?conversationId=${conversationId}`,
  //       {
  //         method: "GET",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     )
  //       .then((res) => res.json())
  //       .then((data) => {
  //         updateConversation(data);
  //       });
  //   }
  // }, [token, conversationId]);

  const updateConversation = (data: Message[]) => {
    const sort = [...data].sort((a: Message, b: Message) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    setConversation(sort);
  };

  useEffect(() => {
    fetchGroupInfo();
  }, [conversationId]);

  // Socket xử lý tin nhắn nhóm
  //   useEffect(() => {
  //     let socketRef: any;
  //     connectSocket().then((socket) => {
  //       socketRef = socket;

  //       socket.on("message-deleted", ({ messageId }: { messageId: string }) => {
  //         setConversation((prev) =>
  //           prev
  //             .filter((msg) => msg.id !== messageId)
  //             .sort(
  //               (a, b) =>
  //                 new Date(a.createdAt).getTime() -
  //                 new Date(b.createdAt).getTime()
  //             )
  //         );
  //       });

  //       socket.on("message-recalled", ({ message }: { message: Message }) => {
  //         setConversation((prev) =>
  //           prev
  //             .map((msg) => (msg.id === message.id ? message : msg))
  //             .sort(
  //               (a, b) =>
  //                 new Date(a.createdAt).getTime() -
  //                 new Date(b.createdAt).getTime()
  //             )
  //         );
  //       });

  //       const handleNew = ({ message }: { message: Message }) => {
  //         setConversation((prev) => {
  //           const exists = prev.some((m) => m.id === message.id);
  //           const updated = exists ? prev : [...prev, message];
  //           return updated.sort(
  //             (a, b) =>
  //               new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  //           );
  //         });
  //       };

  //       socket.on("result", handleNew);
  //       socket.on("group-message", handleNew);
  //     });

  //     return () => {
  //       if (socketRef) {
  //         socketRef.off("message-deleted");
  //         socketRef.off("recall-message");
  //         socketRef.off("result");
  //         socketRef.off("group-message");
  //       }
  //     };
  //   }, []);

  const sendTextMessage = () => {
    if (!message.trim()) return;
    getSocket().emit("group-message", {
      conversationId,
      message,
      messageType: "group",
      contentType: "text",
    });
    setMessage("");
    setShowEmojiPicker(false);
  };

  const toggleSelectImage = (asset: MediaLibrary.Asset) => {
    setTempSelectedImages((prev) => {
      const exists = prev.find((a) => a.id === asset.id);
      if (exists) {
        return prev.filter((a) => a.id !== asset.id);
      } else {
        return [...prev, asset];
      }
    });
  };

  const sendSelectedImages = async () => {
    if (tempSelectedImages.length === 0) return;
    await handleMobileMultiImageSelect(tempSelectedImages);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
    if (showEmojiPicker) Keyboard.dismiss();
    setShowImagePicker(false);
    setShowFilePicker(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const openSettings = useCallback(() => {
    if (settingsVisible || menuVisible || optionsVisible) {
      console.log("Cannot open settings: another modal is visible", {
        settingsVisible,
        menuVisible,
        optionsVisible,
      });
      return;
    }

    slideAnim.setValue(SCREEN_WIDTH);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSettingsVisible(true));
  }, [settingsVisible, menuVisible, optionsVisible, slideAnim]);

  const closeSettings = useCallback(() => {
    console.log("Closing SettingsPanel");
    setSettingsVisible(false);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleLongPress = (item: Message) => {
    if (item.status === "delete" || item.status === "recall") return;
    setSelectedMessage({
      id: item.id,
      message:
        typeof item.message === "string" ? item.message : "[File message]",
    });
    setMenuVisible(true);
  };

  const handleRename = (newName: string) => {
    setGroupName(newName);
  };

  const handleMobileMultiImageSelect = async (
    selectedAssets: MediaLibrary.Asset[]
  ) => {
    try {
      const files = selectedAssets.map((asset) => ({
        uri: asset.uri,
        name: asset.filename,
      }));
      const imagesUpload = await uploadFilesToServer(files);
      imagesUpload.forEach((image: any) => {
        getSocket().emit("group-message", {
          conversationId,
          message: { data: image.url, filename: image.filename },
          messageType: "group",
          contentType: "file",
        });
      });
      setShowImagePicker(false);
    } catch (error: any) {
      console.error("Upload images error:", error);
      Alert.alert("Error", error.message);
    }
  };

  async function uploadFilesToServer(
    files: Array<{ uri: string | File; name: string }>
  ) {
    const formData = new FormData();
    files.forEach((file) => {
      if (Platform.OS === "web" && file.uri instanceof File) {
        formData.append("images", file.uri, file.name);
      } else {
        formData.append("images", {
          uri: file.uri,
          name: file.name,
          type: "application/octet-stream",
        } as any);
      }
    });

    const res = await fetch(`${DOMAIN}:3000/api/message/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload failed");
    }

    const data = await res.json();
    return data.images;
  }

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedMessage(null);
  };

  const showOptions = () => {
    setOptionsVisible(true);
    setShowFilePicker(false);
    setShowImagePicker(false);
  };

  const closeOptions = () => {
    setOptionsVisible(false);
  };

  const loadDeviceImages = async () => {
    if (permissionResponse?.status !== "granted") {
      await requestPermission();
    }
    const media = await MediaLibrary.getAssetsAsync({
      first: 100,
      mediaType: ["photo"],
      sortBy: ["creationTime"],
    });
    setDeviceImages(media.assets);
  };

  useEffect(() => {
    if (showImagePicker && Platform.OS !== "web") {
      loadDeviceImages();
    }
  }, [showImagePicker]);

  const openImagePicker = () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    } else {
      setFilePickerVisible(true);
    }
  };

  const handleFileOptionPress = () => {
    setOptionsVisible(false);
    setShowFilePicker(true);
    getDeviceFiles();
  };

  const getDeviceFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
      console.log("DocumentPicker result:", result);

      let files: Array<{ name: string; size?: number; uri: string }> = [];

      if (Platform.OS === "web") {
        if (result && (result as any).assets) {
          files = (result as any).assets;
        }
      } else {
        if (result.type === "success") {
          files = [result];
        } else if (result.type === "cancel") {
          console.log("Người dùng hủy bỏ việc chọn file.");
          return;
        }
      }

      if (files.length > 0) {
        const fileDetails = await Promise.all(
          files.map(async (file) => {
            try {
              const fileInfo = await FileSystem.getInfoAsync(file.uri);
              if (fileInfo.exists) {
                return {
                  name: file.name || "Unknown",
                  size: file.size || 0,
                  uri: file.uri,
                  lastModified: fileInfo.modificationTime || Date.now(),
                };
              }
              return null;
            } catch (error) {
              console.error("Lỗi khi lấy thông tin file:", error);
              return null;
            }
          })
        );

        const validFiles = fileDetails.filter(
          (f): f is DeviceFile => f !== null
        );
        if (validFiles.length > 0) {
          setDeviceFiles(validFiles);
          console.log("Danh sách file được chọn:", validFiles);
        } else {
          Alert.alert("Error", "Không thể lấy thông tin file hợp lệ.");
        }
      }
    } catch (error) {
      console.error("Lỗi khi chọn file:", error);
      Alert.alert("Error", "Không thể truy cập file. Vui lòng thử lại.");
    }
  };

  const uriToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const handleFileSelected = async (files: DeviceFile[]) => {
    if (files.length === 0) return;

    try {
      const uploadFiles = await Promise.all(
        files.map(async (file) => {
          const blob = await uriToBlob(file.uri);
          return {
            uri: file.uri,
            name: file.name,
            type: blob.type || "application/octet-stream",
            blob: blob,
          };
        })
      );

      const urls = await uploadFilesToServer(uploadFiles);

      urls.forEach((item: any) => {
        getSocket().emit("group-message", {
          conversationId,
          message: { data: item.url, filename: item.filename },
          messageType: "group",
          contentType: "file",
        });
      });
    } catch (error: any) {
      console.error("Lỗi upload file:", error);
      Alert.alert("Upload thất bại", error.message);
    }
  };

  const handleEmojiSelectMobile = (emoji: EmojiType) => {
    setMessage((m) => {
      if (m) {
        return m + emoji.emoji;
      }
      return emoji.emoji;
    });
    setShowEmojiPicker(false);
  };

  const onWebFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const uploadFiles = files.map((f) => ({
        uri: f,
        name: f.name,
      }));
      const urls = await uploadFilesToServer(uploadFiles);
      urls.forEach((item: any) => {
        getSocket().emit("group-message", {
          conversationId,
          message: { data: item.url, filename: item.filename },
          messageType: "group",
          contentType: "file",
        });
      });
    } catch (error: any) {
      console.error("Upload files error:", error);
      alert(error.message);
    } finally {
      e.target.value = "";
    }
  };

  const emojiPickerTheme: Theme =
    colorScheme === "dark" ? Theme.DARK : Theme.LIGHT;

  const handleMessageSelect = (messageId: string) => {
    const index = conversation.findIndex((msg) => msg.id === messageId);
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: index,
        animated: true,
        viewPosition: 0.5,
      });
    } else {
      console.warn("Message not found:", messageId);
      Alert.alert("Thông báo", "Không tìm thấy tin nhắn trong đoạn chat.");
    }
  };

  return (
    <PaperProvider>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {Platform.OS === "web" && (
          <input
            type="file"
            multiple
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={onWebFilesChange}
          />
        )}

        <View
          style={[
            styles.customHeader,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome
              name="arrow-left"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {groupName || "Nhóm chat"}
            </Text>
            <Text
              style={[styles.participantsText, { color: theme.colors.text }]}
            >
              {groupParticipants.length} thành viên
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => alert("Call")}
              style={styles.iconSpacing}
            >
              <FontAwesome
                name="phone"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => alert("Video")}
              style={styles.iconSpacing}
            >
              <FontAwesome
                name="video-camera"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={openSettings} style={styles.iconSpacing}>
              <FontAwesome name="list" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={conversation}
          ref={flatListRef}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            let showDate = false;
            let stringDate = "";
            let createdAt = new Date(item.createdAt);
            const vietnamTime = createdAt.toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });

            let dateParts = vietnamTime.split("/");
            const formattedDate = new Date(
              `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`
            );

            if (!dateBefore.current) {
              showDate = true;
              stringDate =
                formattedDate.getFullYear() +
                "/" +
                (formattedDate.getMonth() + 1) +
                "/" +
                formattedDate.getDate();
            }
            if (
              dateBefore.current &&
              (dateBefore.current.getDate() != createdAt.getDate() ||
                dateBefore.current.getMonth() != createdAt.getMonth() ||
                dateBefore.current.getFullYear() != createdAt.getFullYear())
            ) {
              showDate = true;
              stringDate =
                formattedDate.getFullYear() +
                "/" +
                (formattedDate.getMonth() + 1) +
                "/" +
                formattedDate.getDate();
            }
            const isDeleted = item.status === "deleted";
            const isRecalled = item.status === "recalled";
            const isFile = item.contentType === "file";
            const messageTime = format(new Date(item.createdAt), "HH:mm");

            dateBefore.current = createdAt;
            const sender = groupParticipants.find(
              (p) => p._id === item.senderId
            );
            return (
              <MessageItem
                item={item}
                userID1={userID1}
                theme={theme}
                showDate={showDate}
                stringDate={stringDate}
                isDeleted={isDeleted}
                isRecalled={isRecalled}
                isFile={isFile}
                messageTime={messageTime}
                anotherUser={sender}
              />
            );
          }}
          contentContainerStyle={styles.messagesContainer}
          onScrollToIndexFailed={(info) => {
            console.warn("Failed to scroll to index:", info);
            flatListRef.current?.scrollToOffset({
              offset: info.highestMeasuredFrameIndex,
              animated: true,
            });
          }}
        />

        {showEmojiPicker && Platform.OS === "web" && (
          <View
            style={[
              styles.emojiPickerContainer,
              {
                backgroundColor: theme.colors.card,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <EmojiPicker
              width={SCREEN_WIDTH}
              height={350}
              onEmojiClick={handleEmojiClick}
              skinTonesDisabled
              searchDisabled={false}
              previewConfig={{ showPreview: false }}
              theme={emojiPickerTheme}
            />
          </View>
        )}

        {showEmojiPicker && Platform.OS !== "web" && (
          <EmojiPickerMobile
            open={showEmojiPicker}
            onEmojiSelected={handleEmojiSelectMobile}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {showImagePicker && Platform.OS !== "web" && (
          <View
            style={[
              styles.imagePickerContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.imagePickerHeader}>
              <Text
                style={[styles.imagePickerTitle, { color: theme.colors.text }]}
              >
                Select Images ({tempSelectedImages.length})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowImagePicker(false);
                  setTempSelectedImages([]);
                }}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={deviceImages}
              numColumns={3}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = !!tempSelectedImages.find(
                  (a) => a.id === item.id
                );
                return (
                  <TouchableOpacity
                    onPress={() => toggleSelectImage(item)}
                    style={[
                      styles.imageItem,
                      selected && {
                        borderWidth: 2,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.imageThumbnail}
                    />
                  </TouchableOpacity>
                );
              }}
            />

            <View
              style={{
                padding: 10,
                borderTopWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Button
                disabled={tempSelectedImages.length === 0}
                onPress={sendSelectedImages}
              >
                Gửi {tempSelectedImages.length} ảnh
              </Button>
            </View>
          </View>
        )}

        <Modal visible={menuVisible} transparent animationType="fade">
          <View style={styles.modalBackground}>
            <View
              style={[
                styles.menuContainer,
                { backgroundColor: theme.colors.card },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => alert("Reply")}
              >
                <FontAwesome name="reply" size={20} color={theme.colors.text} />
                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                  Reply
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => alert("Forward")}
              >
                <FontAwesome name="share" size={20} color={theme.colors.text} />
                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                  Forward
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => alert("Copy")}
              >
                <FontAwesome name="copy" size={20} color={theme.colors.text} />
                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                  Copy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => alert("Save to Cloud")}
              >
                <FontAwesome name="cloud" size={20} color={theme.colors.text} />
                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                  Cloud
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={closeMenu}
              >
                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Modal thông báo tùy chỉnh */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <View
              style={[
                styles.alertContainer,
                { backgroundColor: theme.colors.card },
              ]}
            >
              <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
                {modalTitle}
              </Text>
              <Text style={[styles.alertMessage, { color: theme.colors.text }]}>
                {modalMessage}
              </Text>
              <TouchableOpacity
                style={[
                  styles.alertButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  if (modalMessage === "Nhóm đã giải tán") {
                    router.replace("/home/HomeScreen");
                  }
                }}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <SettingsPanel
          visible={settingsVisible}
          onClose={closeSettings}
          slideAnim={slideAnim}
          colorScheme={colorScheme || null}
          targetUserId=""
          onRename={handleRename}
          currentUserId={userID1 || ""}
          isGroupChat={true}
          conversationId={conversationId as string}
          friendName={groupName || ""}
          onMessageSelect={handleMessageSelect}
        />

        <FilePickerModal
          visible={filePickerVisible}
          onClose={() => setFilePickerVisible(false)}
          onFileSelected={handleFileSelected}
        />

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <TouchableOpacity
            onPress={toggleEmojiPicker}
            style={styles.iconSpacing}
          >
            <FontAwesome
              name="smile-o"
              size={24}
              color={showEmojiPicker ? theme.colors.primary : theme.colors.text}
            />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.text}
          />
          {message.trim() === "" ? (
            <>
              <TouchableOpacity
                onPress={() => alert("Record")}
                style={styles.iconSpacing}
              >
                <FontAwesome
                  name="microphone"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openImagePicker}
                style={styles.iconSpacing}
              >
                <FontAwesome
                  name="image"
                  size={24}
                  color={
                    showImagePicker ? theme.colors.primary : theme.colors.text
                  }
                />
              </TouchableOpacity>
            </>
          ) : (
            <Button onPress={sendTextMessage}>Send</Button>
          )}
        </View>
      </View>
    </PaperProvider>
  );
};

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 30,
  },
  headerTitleContainer: {
    flex: 1,
    paddingLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "left",
  },
  participantsText: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginHorizontal: 10,
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  sentMessageContainer: {
    justifyContent: "flex-end",
    marginLeft: 50,
  },
  receivedMessageContainer: {
    justifyContent: "flex-start",
    marginRight: 50,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 5,
  },
  recalledMessageContainer: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
  },
  threeDotContainer: {
    top: 5,
    right: 5,
    zIndex: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 8,
    maxWidth: "80%",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  recalledMessageText: {
    fontSize: 16,
    fontStyle: "italic",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  imageTimeText: {
    fontSize: 11,
    textAlign: "right",
    opacity: 0.8,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileTimeText: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,
    marginHorizontal: 10,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 250,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  menuItem: {
    padding: 10,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
    width: "100%",
    alignItems: "center",
    borderRadius: 5,
  },
  optionsContainer: {
    width: 250,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  optionItem: {
    padding: 10,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "bold",
  },
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
  emojiPickerContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  imagePickerContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 1000,
  },
  imagePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  alertContainer: {
    width: 300,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  alertButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  alertButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  imageItem: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
});
