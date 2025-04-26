// @ts-nocheck
import { Provider as PaperProvider } from "react-native-paper";
import React, {
  useEffect,
  useLayoutEffect,
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
import io from "socket.io-client";
import Button from "@/components/ui/Button";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { connectSocket, getSocket } from "@/src/socket/socket";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { DOMAIN } from "@/src/configs/base_url";
import { Auth } from "aws-amplify";
import FileMessage from "@/components/FileMessage";
import SettingsPanel from "@/components/ui/SettingsPanel";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import FilePickerModal from "@/components/FilePickerModal";
import MessageItem from "@/components/MessageItem";

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

interface DeviceFile {
  name: string;
  size: number;
  uri: string;
  lastModified: number;
}
interface User {
  _id: string;
  name: string;
  image: string;
}
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ChatScreen = () => {
  const [userID1, setUserID1] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null); // Ref để cuộn FlatList
  const [anotherUser, setAnotherUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null); // Tên nhóm
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false); // Kiểm tra xem có phải chat nhóm không
  const theme = useMemo(
    () => (colorScheme === "dark" ? DarkTheme : DefaultTheme),
    [colorScheme]
  );
  const [tempSelectedImages, setTempSelectedImages] = useState<
    MediaLibrary.Asset[]
  >([]);
  const [filePickerVisible, setFilePickerVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DeviceFile | null>(null);

  const { friendId, conversationId } = useLocalSearchParams();

  const { userID2, friendName } = useLocalSearchParams();
  const slideAnim = useState(new Animated.Value(SCREEN_WIDTH))[0];
  const [token, setToken] = useState<string>("");
  const dateBefore = useRef<Date | null>();

  // Xác định loại chat (đơn hay nhóm)
  useEffect(() => {
    if (conversationId && !friendId) {
      setIsGroupChat(true);
    } else {
      setIsGroupChat(false);
    }
  }, [conversationId, friendId]);

  // Nếu là chat nhóm, chuyển sang GroupChatScreen
  if (isGroupChat) {
    return <GroupChatScreen />;
  }
  // Lấy thông tin người dùng (dùng cho chat đôi)
  const fetchUserInfo = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/user/${userID2}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Không thể lấy thông tin người dùng");
      }

      const userData = await response.json();
      setAnotherUser({
        _id: friendId as string,
        name: userData.name || friendId,
        image:
          userData.avatarUrl ||
          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      });
    } catch (error: any) {
      console.error("Lỗi khi lấy thông tin người dùng:", error.message);
    }
  };
  useEffect(() => {
    setNickname(friendName.toString());
  }, [friendName]);
  useEffect(() => {
    fetchUserInfo();
  }, [userID2]);
  // Lấy token khi mount
  useEffect(() => {
    const getSub = async () => {
      try {
        const session = await Auth.currentSession();
        const sub = session.getIdToken().decodePayload().sub;
        setUserID1(sub);
        return;
      } catch (err) {
        console.error("Lỗi lấy getSub:", err);
        return "";
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

  useEffect(() => {
    if (token) {
      fetch(DOMAIN + ":3000/api/message?friendId=" + userID2, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          updateConversation(data);
        });
    }
  }, [token]);
  const updateConversation = (data: Message[]) => {
    console.log(data);
    const sort = [...data].sort((a: Message, b: Message) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    setConversation(sort);
  };

  useEffect(() => {
    let socketRef: any;
    connectSocket().then((socket) => {
      socketRef = socket;

      // Xử lý xóa
      socket.on("message-deleted", ({ messageId }: { messageId: string }) => {
        setConversation((prev) =>
          prev
            .filter((msg) => msg.id !== messageId)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
        );
      });

      // Xử lý thu hồi
      socket.on("message-recalled", ({ message }: { message: Message }) => {
        setConversation((prev) =>
          prev
            .map((msg) => (msg.id === message.id ? message : msg))
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
        );
      });

      // Tin nhắn mới (kết quả hoặc private)
      const handleNew = ({ message }: { message: Message }) => {
        setConversation((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          const updated = exists ? prev : [...prev, message];
          return updated.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      };

      socket.on("result", handleNew);
      socket.on("private-message", handleNew);
      
    });

    return () => {
      if (socketRef) {
        socketRef.off("message-deleted");
        socketRef.off("recall-message");
        socketRef.off("result");
        socketRef.off("private-message");
      }
    };
  }, []);

  const sendTextMessage = () => {
    if (!message.trim()) return;
    getSocket().emit("private-message", {
      receiverId: userID2,
      message,
      messageType: "private",
      contentType: "text",
    });
    setMessage("");
    setShowEmojiPicker(false);
  };

  // 2. Khi người dùng nhấn vào 1 ảnh thì toggle chọn / bỏ chọn
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

  // 3. Nút Send sẽ gọi upload với tất cả ảnh đã chọn
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

    console.log("openSettings called, settingsVisible:", settingsVisible);

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
  // Callback khi đổi tên gợi nhớ
  const handleRename = (newName: string) => {
    setNickname(newName); // Cập nhật nickname khi tên gợi nhớ được thay đổi
  };
  // 2. Mobile: chọn nhiều ảnh rồi upload
  const handleMobileMultiImageSelect = async (
    selectedAssets: MediaLibrary.Asset[]
  ) => {
    try {
      // map sang định dạng cần thiết
      const files = selectedAssets.map((asset) => ({
        uri: asset.uri,
        name: asset.filename,
      }));
      // 1) upload lên server, nhận mảng URL
      const imagesUpload = await uploadFilesToServer(files);
      // 2) emit socket cho mỗi URL hoặc gộp
      imagesUpload.forEach((image: any) => {
        getSocket().emit("private-message", {
          receiverId: userID2,
          message: { data: image.url, filename: image.filename },
          messageType: "private",
          contentType: "file",
        });
      });
      setShowImagePicker(false);
    } catch (error: any) {
      console.error("Upload images error:", error);
      Alert.alert("Error", error.message);
    }
  };
  // 1. Hàm upload chung
  async function uploadFilesToServer(
    files: Array<{ uri: string | File; name: string }>
  ) {
    const formData = new FormData();
    files.forEach((file) => {
      if (Platform.OS === "web" && file.uri instanceof File) {
        // Web: append trực tiếp File object
        formData.append("images", file.uri, file.name);
      } else {
        // Mobile: sử dụng thông tin hợp lệ
        formData.append("images", {
          uri: file.uri,
          name: file.name, // ✅ Đúng key
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
      // Gọi DocumentPicker với option multiple: true (chỉ hỗ trợ nhiều file trên web)
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true, // Trên iOS chỉ có thể chọn 1 file
      });
      console.log("DocumentPicker result:", result);

      let files: Array<{ name: string; size?: number; uri: string }> = [];

      if (Platform.OS === "web") {
        // Trên web, DocumentPicker trả về đối tượng có trường assets (mảng các file)
        if (result && (result as any).assets) {
          files = (result as any).assets;
        }
      } else {
        // Trên mobile (iOS/Android), kiểm tra xem người dùng đã chọn file thành công chưa
        if (result.type === "success") {
          files = [result]; // Chỉ có 1 file được chọn
        } else if (result.type === "cancel") {
          console.log("Người dùng hủy bỏ việc chọn file.");
          return; // Không thực hiện gì nếu hủy
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
  // Hàm upload
  const handleFileSelected = async (files: DeviceFile[]) => {
    console.log(files);
    if (files.length === 0) return;

    try {
      const uploadFiles = await Promise.all(
        files.map(async (file) => {
          const blob = await uriToBlob(file.uri);
          return {
            uri: file.uri, // optional
            name: file.name,
            type: blob.type || "application/octet-stream",
            blob: blob,
          };
        })
      );

      const urls = await uploadFilesToServer(uploadFiles); // custom logic

      urls.forEach((item: any) => {
        getSocket().emit("private-message", {
          receiverId: userID2,
          message: { data: item.url, filename: item.filename },
          messageType: "private",
          contentType: "file",
        });
      });
    } catch (error: any) {
      console.error("Lỗi upload file:", error);
      Alert.alert("Upload thất bại", error.message);
    }
  };

  const handleEmojiSelectMobile = (emoji: EmojiType) => {
    // dùng emoji.emoji để nối vào message
    setMessage((m) => {
      if (m) {
        return m + emoji.emoji;
      }
      return emoji.emoji;
    });
    setShowEmojiPicker(false);
  };

  // 3. Web: chọn nhiều file qua input[type="file"]
  const onWebFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      // map sang định dạng cho upload
      const uploadFiles = files.map((f) => ({
        uri: f,
        name: f.name,
      }));
      const urls = await uploadFilesToServer(uploadFiles);
      urls.forEach((item: any) => {
        getSocket().emit("private-message", {
          receiverId: userID2,
          message: { data: item.url, filename: item.filename },
          messageType: "private",
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

  // Xử lý khi nhận messageId từ SettingsPanel
  const handleMessageSelect = (messageId: string) => {
    console.log("Selected messageId:", messageId);

    const index = conversation.findIndex((msg) => msg.id === messageId);
    console.log("flatListRef:", flatListRef.current);

    if (index !== -1 && flatListRef.current) {
      // Cuộn đến tin nhắn với messageId
      flatListRef.current.scrollToIndex({
        index: index, // Vì FlatList đảo ngược (inverted)
        animated: true,
        viewPosition: 0.5, // Cuộn để tin nhắn nằm ở giữa màn hình
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
        {/* Hidden web file input */}
        {Platform.OS === "web" && (
          <input
            type="file"
            multiple
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={onWebFilesChange}
          />
        )}

        {/* Header */}
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {nickname || anotherUser?.name || "Chat"}
          </Text>
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

        {/* Messages */}
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
              month: "2-digit", // Tháng có 2 chữ số
              day: "2-digit", // Ngày có 2 chữ số
            });

            // Chuyển đổi lại chuỗi ngày thành đối tượng Date hợp lệ sau khi định dạng
            let dateParts = vietnamTime.split("/"); // Chia ngày, tháng, năm
            const formattedDate = new Date(
              `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`
            ); // Tạo đối tượng Date hợp lệ

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
            const isText = item.contentType === "text";
            const messageTime = format(new Date(item.createdAt), "HH:mm");

            dateBefore.current = createdAt;
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
                anotherUser={anotherUser}
              />
            );
          }}
          contentContainerStyle={styles.messagesContainer}
          // inverted // Tin nhắn mới nhất ở dưới cùng
          onScrollToIndexFailed={(info) => {
            console.warn("Failed to scroll to index:", info);
            // Cuộn gần đúng vị trí nếu scrollToIndex thất bại
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
            // you can customize height, columns, etc.
          />
        )}

        {/* Image Picker (Mobile) */}
        {showImagePicker && Platform.OS !== "web" && (
          <View
            style={[
              styles.imagePickerContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            {/* Header như cũ */}
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

            {/* Grid ảnh */}
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

            {/* Nút Gửi */}
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

        {/* Message Options Menu */}
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
        {/* Sử dụng SettingsPanel */}
        <SettingsPanel
          visible={settingsVisible}
          onClose={closeSettings}
          slideAnim={slideAnim}
          colorScheme={colorScheme || null}
          targetUserId={userID2 as string}
          onRename={handleRename}
          currentUserId={userID1 || ""}
          isGroupChat={isGroupChat}
          conversationId={conversationId as string}
          friendName={nickname || friendName.toString()}
          onMessageSelect={handleMessageSelect}
        />

        {/* Modal chọn nguồn file */}
        <FilePickerModal
          visible={filePickerVisible}
          onClose={() => setFilePickerVisible(false)}
          onFileSelected={handleFileSelected}
        />
        {/* Input */}
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

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "left",
    flex: 1,
    paddingLeft: 12,
    color: "#000",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginHorizontal: 12,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sentMessageContainer: {
    justifyContent: "flex-end",
    marginLeft: 60,
  },
  receivedMessageContainer: {
    justifyContent: "flex-start",
    marginRight: 60,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 8,
  },
  recalledMessageContainer: {
    opacity: 0.7,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 36,
  },
  threeDotContainer: {
    top: 5,
    right: 5,
    zIndex: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: "75%",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#000",
  },
  recalledMessageText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#666",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    color: "#666",
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageTimeText: {
    fontSize: 12,
    textAlign: "right",
    opacity: 0.7,
    color: "#666",
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  fileTimeText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 220,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  optionsContainer: {
    width: 220,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  optionItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
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
    backgroundColor: "#fff",
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000",
  },
  userInfo: {
    alignItems: "center",
    paddingVertical: 24,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    color: "#000",
  },
  settingsOptions: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 20,
  },
  settingsText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#333",
  },
  emojiPickerContainer: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  imagePickerContainer: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    height: 320,
    zIndex: 1000,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  imagePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  imageItem: {
    flex: 1,
    aspectRatio: 1,
    padding: 4,
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
});