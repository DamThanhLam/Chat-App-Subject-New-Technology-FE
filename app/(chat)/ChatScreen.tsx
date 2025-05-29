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
import * as Location from "expo-location";
import { format } from "date-fns";
import { DOMAIN } from "@/src/configs/base_url";
import { Auth } from "aws-amplify";
import FileMessage from "@/components/FileMessage";
import SettingsPanel from "@/components/ui/SettingsPanel";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import FilePickerModal from "@/components/FilePickerModal";
import MessageItem from "@/components/MessageItem";
import { useAppTheme } from "@/src/theme/theme";

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

interface LocationMessage {
  latitude: number;
  longitude: number;
  address?: string;
  staticMapUrl?: string;
}

interface Message {
  id: string;
  conversationId: string | null;
  senderId: string;
  message: string | FileMessage | LocationMessage;
  createdAt: string;
  updatedAt: string;
  parentMessage?: Message;
  readed: string[];
  messageType: "group" | "private";
  contentType: "file" | "emoji" | "text" | "location";
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
  const { theme } = useAppTheme();
  const [userID1, setUserID1] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<{
    id: string;
    message: string;
  } | null>(null);
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
  const flatListRef = useRef<FlatList>(null);
  const [anotherUser, setAnotherUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false);
  const themeNav = useMemo(
    () => (theme.mode === "dark" ? DarkTheme : DefaultTheme),
    [theme.mode]
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

  useEffect(() => {
    if (conversationId && !friendId) {
      setIsGroupChat(true);
    } else {
      setIsGroupChat(false);
    }
  }, [conversationId, friendId]);

  if (isGroupChat) {
    return <GroupChatScreen />;
  }

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
      //28-5-2025
      socket.on("message-read", ({ message }: { message: Message }) => {
        setConversation((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, status: message.status, readed: message.readed }
              : m
          )
        );
      });

      const handleNew = ({ message }: { message: Message }) => {
        setConversation((prev) => {
          const exists = prev.some(
            (m) =>
              m.id === message.id || (message.tempId && m.id === message.tempId)
          );

          if (exists && message.tempId) {
            return prev
              .map((m) =>
                m.id === message.tempId ? { ...message, id: message.id } : m
              )
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              );
          }

          if (!exists) {
            return [...prev, message].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          }

          return prev;
        });
      };

      socket.on("result", handleNew);
      socket.on("private-message", handleNew);
      //28-5-2025
      socket.on("message-read", handleNew)
    });

    return () => {
      if (socketRef) {
        socketRef.off("message-deleted");
        socketRef.off("recall-message");
        socketRef.off("result");
        socketRef.off("private-message");
        //28-5-2025
        socketRef.off("message-read");
      }
    };
  }, []);

  const sendTextMessage = () => {
    if (!message.trim()) return;

    // Tạo tempId cho tin nhắn
    const tempId = `temp-${Date.now()}`;

    // Tạo tin nhắn optimistic để hiển thị ngay lập tức
    const optimisticMessage: Message = {
      id: tempId,
      conversationId: null,
      senderId: userID1,
      receiverId: userID2 as string,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readed: [],
      messageType: "private",
      contentType: "text",
      status: "sended",
    };

    // Cập nhật UI ngay lập tức
    setConversation((prev) => {
      // Kiểm tra xem tin nhắn đã tồn tại chưa
      if (prev.some((m) => m.id === tempId)) {
        return prev;
      }
      return [...prev, optimisticMessage].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    // Gửi tin nhắn qua socket với tempId
    getSocket().emit("private-message", {
      receiverId: userID2,
      message: message.trim(),
      messageType: "private",
      contentType: "text",
      tempId,
    });

    // Cuộn xuống cuối danh sách tin nhắn
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Xóa nội dung tin nhắn và đóng emoji picker
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

  //28-5-2025
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    viewableItems.forEach(viewable => {
      const item: Message = viewable.item;
      // Nếu tin nhắn không gửi bởi người dùng hiện tại và trạng thái chưa là "readed"
      if (item.senderId !== userID1 && item.status !== "readed") {
        getSocket().emit("read-message", item.id);
      }
    });
  }).current;

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
    if (settingsVisible || optionsVisible) {
      console.log("Cannot open settings: another modal is visible", {
        settingsVisible,
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
  }, [settingsVisible, optionsVisible, slideAnim]);

  const closeSettings = useCallback(() => {
    console.log("Closing SettingsPanel");
    setSettingsVisible(false);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleRename = (newName: string) => {
    setNickname(newName);
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
          Alert.alert("Lỗi", "Không thể lấy thông tin file hợp lệ.");
        }
      }
    } catch (error) {
      console.error("Lỗi khi chọn file:", error);
      Alert.alert("Lỗi", "Không thể truy cập file. Vui lòng thử lại.");
    }
  };
  const uriToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const handleFileSelected = async (files: DeviceFile[]) => {
    console.log(files);
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

  const emojiPickerTheme = theme.mode === "dark" ? Theme.DARK : Theme.LIGHT;

  const handleMessageSelect = (messageId: string) => {
    console.log("Selected messageId:", messageId);

    const index = conversation.findIndex((msg) => msg.id === messageId);
    console.log("flatListRef:", flatListRef.current);

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

  // Share location
  const shareLocation = async () => {
    // First show confirmation dialog
    if (Platform.OS === "web") {
      if (!confirm("Bạn có muốn chia sẻ vị trí của mình không?")) {
        return; // User declined
      }
    } else {
      // Use Alert for mobile platforms
      return new Promise((resolve) => {
        Alert.alert(
          "Chia sẻ vị trí",
          "Bạn có muốn chia sẻ vị trí của mình không?",
          [
            {
              text: "Không",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Có",
              onPress: async () => {
                resolve(true);
                await shareLocationAfterConfirmation();
              },
            },
          ],
          { cancelable: false }
        );
      });
    }

    // For web, execute directly after confirmation
    if (Platform.OS === "web") {
      await shareLocationAfterConfirmation();
    }
  };

  // Actual location sharing logic
  const shareLocationAfterConfirmation = async () => {
    try {
      let latitude, longitude;

      if (Platform.OS === "web") {
        // Use browser's geolocation API for web
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } else {
        // Use Expo Location for native platforms
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Quyền bị từ chối", "Không thể truy cập vị trí.");
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      // Lấy địa chỉ từ tọa độ
      let address = `Vị trí: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      // Sử dụng Static Map từ OpenStreetMap thay vì Google Maps
      let staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=300x150&markers=${latitude},${longitude},red`;

      try {
        // Sử dụng OpenStreetMap Nominatim API thay vì Google Maps API
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`;
        console.log("Calling Nominatim API for geocoding");

        const response = await fetch(nominatimUrl, {
          headers: {
            // Quan trọng: Thêm User-Agent để tuân thủ điều khoản sử dụng của Nominatim
            "User-Agent": "ChatApp/1.0",
          },
        });

        if (!response.ok) {
          console.error(
            "Nominatim API response not OK:",
            await response.text()
          );
          // Không throw lỗi, sử dụng địa chỉ tọa độ mặc định đã đặt ở trên
        } else {
          const data = await response.json();
          console.log("Nominatim API response:", data);

          if (data && data.display_name) {
            address = data.display_name;
          }
        }
      } catch (err) {
        console.error("Lỗi lấy địa chỉ:", err);
        // Sử dụng địa chỉ tọa độ mặc định đã đặt ở trên
      }

      // Create temporary location message with tempId
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        conversationId: null,
        senderId: userID1,
        receiverId: userID2 as string,
        message: { latitude, longitude, address, staticMapUrl },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        readed: [],
        messageType: "private",
        contentType: "location",
        status: "sended",
      };

      // Update UI immediately with optimistic update
      setConversation((prev) => {
        // Kiểm tra xem tin nhắn đã tồn tại chưa
        if (prev.some((m) => m.id === tempId)) {
          return prev;
        }
        return [...prev, optimistic].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );

      // Send via Socket.IO
      const socket = getSocket();
      if (!socket) {
        Alert.alert("Lỗi", "Không kết nối được với server.");
        return;
      }

      // Gửi tin nhắn với tempId để có thể cập nhật đúng tin nhắn sau khi server phản hồi
      socket.emit("private-message", {
        receiverId: userID2,
        message: { latitude, longitude, address, staticMapUrl },
        messageType: "private",
        contentType: "location",
        tempId,
      });
    } catch (error) {
      console.error("Lỗi chia sẻ vị trí:", error);
      if (Platform.OS === "web") {
        alert(
          "Không thể chia sẻ vị trí. Vui lòng kiểm tra quyền truy cập vị trí trong trình duyệt."
        );
      } else {
        Alert.alert("Lỗi", "Không thể chia sẻ vị trí.");
      }
    }
  };

  const iconColor = theme.colors.primary;

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
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <FontAwesome name="arrow-left" size={24} color={iconColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {nickname || anotherUser?.name || "Trò Chuyện"}
          </Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Thông Báo", "Chức năng gọi điện chưa hỗ trợ")
              }
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <FontAwesome name="phone" size={24} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Thông Báo", "Chức năng video chưa hỗ trợ")
              }
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <FontAwesome name="video-camera" size={24} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openSettings}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <FontAwesome name="list" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          //28-5-2025
          data={conversation}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
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
            const isLocation = item.contentType === "location";
            const messageTime = format(new Date(item.createdAt), "HH:mm");

            dateBefore.current = createdAt;
            return (
              <MessageItem
                item={item}
                userID1={userID1}
                theme={themeNav}
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
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <EmojiPicker
              width="100%"
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
              {
                backgroundColor: theme.colors.background,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.imagePickerHeader,
                {
                  backgroundColor: theme.colors.card,
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[styles.imagePickerTitle, { color: theme.colors.text }]}
              >
                Chọn Ảnh ({tempSelectedImages.length})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowImagePicker(false);
                  setTempSelectedImages([]);
                }}
                activeOpacity={0.7}
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
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    activeOpacity={0.7}
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
              style={[
                styles.imagePickerFooter,
                {
                  backgroundColor: theme.colors.card,
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <Button
                disabled={tempSelectedImages.length === 0}
                onPress={sendSelectedImages}
                style={styles.sendButton}
              >
                Gửi {tempSelectedImages.length} ảnh
              </Button>
            </View>
          </View>
        )}

        <SettingsPanel
          visible={settingsVisible}
          onClose={closeSettings}
          slideAnim={slideAnim}
          colorScheme={theme.mode}
          targetUserId={userID2 as string}
          onRename={handleRename}
          currentUserId={userID1 || ""}
          isGroupChat={isGroupChat}
          conversationId={conversationId as string}
          friendName={nickname || friendName?.toString() || ""}
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
            {
              backgroundColor: theme.colors.card,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={toggleEmojiPicker}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="smile-o"
              size={24}
              color={
                showEmojiPicker
                  ? theme.colors.primary
                  : theme.colors.text + "80"
              }
            />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={theme.colors.text + "80"}
          />
          {message.trim() === "" ? (
            <>
              <TouchableOpacity
                onPress={shareLocation}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="location-pin"
                  size={24}
                  color={theme.colors.text + "80"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openImagePicker}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <FontAwesome
                  name="image"
                  size={24}
                  color={
                    showImagePicker
                      ? theme.colors.primary
                      : theme.colors.text + "80"
                  }
                />
              </TouchableOpacity>
            </>
          ) : (
            <Button onPress={sendTextMessage} style={styles.sendButton}>
              Gửi
            </Button>
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
    backgroundColor: "#f5f5f5",
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    paddingLeft: 12,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  sentMessageContainer: {
    alignItems: "flex-end",
    marginLeft: "20%",
    marginVertical: 6,
  },
  receivedMessageContainer: {
    alignItems: "flex-start",
    marginRight: "20%",
    marginVertical: 6,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  recalledMessageContainer: {
    opacity: 0.6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  avatarPlaceholder: {
    width: 40,
  },
  threeDotContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: "80%",
    backgroundColor: "#007bff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#ffffff",
  },
  recalledMessageText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#888888",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
    color: "#666666",
    textAlign: "right",
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginBottom: 4,
    resizeMode: "cover",
  },
  imageTimeText: {
    fontSize: 12,
    textAlign: "right",
    opacity: 0.8,
    color: "#666666",
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },
  fileTimeText: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
    color: "#666666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0e0",
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#007bff",
  },
  emojiPickerContainer: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imagePickerContainer: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    height: 360,
    zIndex: 1000,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imagePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0e0",
    backgroundColor: "#fafafa",
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  imagePickerFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0e0",
    backgroundColor: "#fafafa",
  },
  imageItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    resizeMode: "cover",
  },
});
