import React, { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format } from "date-fns";
import { DOMAIN } from "@/src/configs/base_url";
import { Auth } from "aws-amplify";
import FileMessage from "@/components/FileMessage";
import SettingsPanel from "@/components/ui/SettingsPanel";

interface FileMessage {
  data: string;
  filename: string;
  size: number;
  type: string;
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
  status: "recall" | "delete" | "readed" | "sended" | "received";
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
  const [userID1, setUserID1] = useState("4574703b-f2c0-41dd-a850-dd780297e8ae");
  const [userID2] = useState("b9ba65cc-2061-7031-229d-5f892034d870");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; message: string } | null>(null);
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
  const [anotherUser, setAnotherUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null); // Tên nhóm
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false); // Kiểm tra xem có phải chat nhóm không
  const theme = useMemo(() => (colorScheme === "dark" ? DarkTheme : DefaultTheme), [colorScheme]);
  const [tempSelectedImages, setTempSelectedImages] = useState<MediaLibrary.Asset[]>([]);
  const { friendId, conversationId } = useLocalSearchParams();

  // router.push({ pathname: '/ChatScreen', params: { userID2: '1234' } });
  // const { userID2 } = useLocalSearchParams();
  const slideAnim = useState(new Animated.Value(SCREEN_WIDTH))[0];
  const [token, setToken] = useState<string>("");
  const dateBefore = useRef<Date | null>()
  // Lấy token khi mount
  
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

      }).then(res => res.json())
        .then(data => {
          setConversation(data)
        })
    }
  }, [token])
  useEffect(() => {
    let socketRef: any = null;
    connectSocket().then(socket => {
      socketRef = socket;
      socket.on("delete-message", (data: { messageId: string }) => {
        setConversation(prev => prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, status: "delete", message: "Tin nhắn đã bị xóa" }
            : msg
        ));
      });

      socket.on("recall-message", (data: { message: Message }) => {
        setConversation(prev => prev.map(msg =>
          msg.id === data.message.id
            ? { ...msg, status: "recall", message: "Tin nhắn đã bị thu hồi" }
            : msg
        ));
      });
      socket.on("result", (data: { message: Message }) => {
        setConversation(prev => [...prev, data.message]);
      });
      socket.on("private-message", (data: { message: Message }) => {
        setConversation(prev => [...prev, data.message]);
      });
    });

    return () => {
      if (socketRef) {
        socketRef.off("delete-message");
        socketRef.off("recall-message");
      }
    };
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      getSocket().emit("delete-message", messageId);
      setConversation(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: "delete", message: "Tin nhắn đã bị xóa" }
          : msg
      ));
      setMenuVisible(false);
    } catch (error) {
      console.error("Error deleting message:", error);
      Alert.alert("Error", "Failed to delete message");
    }
  }, []);

  const handleRecallMessage = useCallback(async (messageId: string) => {
    try {
      getSocket().emit("recall-message", messageId);
      setConversation(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: "recall", message: "Tin nhắn đã bị thu hồi" }
          : msg
      ));
      setMenuVisible(false);
    } catch (error) {
      console.error("Error recalling message:", error);
      Alert.alert("Error", "Failed to recall message");
    }
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
    setTempSelectedImages(prev => {
      const exists = prev.find(a => a.id === asset.id);
      if (exists) {
        return prev.filter(a => a.id !== asset.id);
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
      console.log("Cannot open settings: another modal is visible", { settingsVisible, menuVisible, optionsVisible });
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
      message: typeof item.message === "string" ? item.message : "[File message]",
    });
    setMenuVisible(true);
  };
  // Callback khi đổi tên gợi nhớ
  const handleRename = (newName: string) => {
    setNickname(newName); // Cập nhật nickname khi tên gợi nhớ được thay đổi
  };
  // 2. Mobile: chọn nhiều ảnh rồi upload
  const handleMobileMultiImageSelect = async (selectedAssets: MediaLibrary.Asset[]) => {
    try {
      // map sang định dạng cần thiết
      const files = selectedAssets.map(asset => ({
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
    files: Array<{ uri: string | any; name: string; }>
  ) {
    const formData = new FormData();
    files.forEach((file) => {
      if (Platform.OS === "web" && file.uri instanceof File) {
        // Web: append trực tiếp File object
        formData.append("images", file.uri, file.name);
      } else {
        // Mobile: append RN file object
        formData.append("images", {
          uri: file.uri,
          name: file.filename,
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

  const handleMobileImageSelect = async (asset: MediaLibrary.Asset) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      getSocket().emit("private-message", {
        receiverId: userID2,
        message: {
          data: base64,
          filename: asset.filename || `IMG_${asset.id}.jpg`,
          size: asset.width * asset.height,
          type: 'image/jpeg'
        },
        messageType: "private",
        contentType: "file",
      });
      setShowImagePicker(false);
    } catch (error) {
      console.error("Error selecting mobile image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  // Web file change
  const onWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      getSocket().emit("private-message", {
        receiverId: userID2,
        message: {
          data: base64,
          filename: file.name,
        },
        messageType: "private",
        contentType: "file",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const openImagePicker = () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    } else {
      setShowImagePicker((prev) => !prev);
      setShowEmojiPicker(false);
      setShowFilePicker(false);
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
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result && result.assets) {
        const files = result.assets;
        const fileDetails = await Promise.all(
          files.map(async (file) => {
            try {
              const fileInfo = await FileSystem.getInfoAsync(file.uri);
              if (fileInfo.exists) {
                return {
                  name: file.name || 'Unknown',
                  size: file.size || 0,
                  uri: file.uri,
                  lastModified: fileInfo.modificationTime || Date.now(),
                };
              }
              return null;
            } catch (error) {
              console.error('Error getting file info:', error);
              return null;
            }
          })
        );
        setDeviceFiles(fileDetails.filter((f): f is DeviceFile => f !== null));
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      Alert.alert("Error", "Could not access files. Please try again.");
    }
  };

  const openFile = async (fileUri: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(fileUri, '_blank');
        return;
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUri,
        FileSystem.documentDirectory + 'tempfile'
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (downloadResult) {
        const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
        console.log('File ready to open:', contentUri);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert("Error", "Could not open file. Please try again.");
    }
  };
  // 3. Web: chọn nhiều file qua input[type="file"]
  const onWebFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      // map sang định dạng cho upload
      const uploadFiles = files.map(f => ({
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


  const emojiPickerTheme: Theme = colorScheme === 'dark' ? Theme.DARK : Theme.LIGHT;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
      <View style={[styles.customHeader, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {anotherUser?.name || "Chat"}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => alert("Call")} style={styles.iconSpacing}>
            <FontAwesome name="phone" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert("Video")} style={styles.iconSpacing}>
            <FontAwesome name="video-camera" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openSettings} style={styles.iconSpacing}>
            <FontAwesome name="list" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={conversation}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          let showDate = false;
          let stringDate = ""
          let createdAt = new Date(item.createdAt);
          const vietnamTime = createdAt.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit", // Tháng có 2 chữ số
            day: "2-digit", // Ngày có 2 chữ số
          });

          // Chuyển đổi lại chuỗi ngày thành đối tượng Date hợp lệ sau khi định dạng
          let dateParts = vietnamTime.split("/"); // Chia ngày, tháng, năm
          const formattedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`); // Tạo đối tượng Date hợp lệ


          if (!dateBefore.current) {
            showDate = true;
            stringDate = formattedDate.getFullYear() + "/" + (formattedDate.getMonth() + 1) + "/" + formattedDate.getDate();
          }
          if (dateBefore.current &&
            (
              dateBefore.current.getDate() != createdAt.getDate() ||
              dateBefore.current.getMonth() != createdAt.getMonth() ||
              dateBefore.current.getFullYear() != createdAt.getFullYear()
            )
          ) {
            showDate = true;
            stringDate = formattedDate.getFullYear() + "/" + (formattedDate.getMonth() + 1) + "/" + formattedDate.getDate();
          }
          const isDeleted = item.status === "delete";
          const isRecalled = item.status === "recall";
          const isFile = item.contentType === "file";
          const isText = item.contentType === "text";
          const messageTime = format(new Date(item.createdAt), "HH:mm");

          dateBefore.current = createdAt;
          return (
            <>
              {showDate && <Text style={{ color: theme.colors.text, textAlign: 'center' }}>{stringDate}</Text>}
              <TouchableOpacity
                onLongPress={() => !isDeleted && !isRecalled && handleLongPress(item)}
                style={[
                  styles.messageContainer,
                  item.senderId === userID1
                    ? styles.sentMessageContainer
                    : styles.receivedMessageContainer,
                  (isDeleted || isRecalled) && styles.recalledMessageContainer
                ]}
              >
                {/* Avatar for received messages */}
                {item.senderId !== userID1 && anotherUser && (
                  <Image
                    source={{ uri: anotherUser.image }}
                    style={styles.avatar}
                  />
                )}

                {/* Message bubble */}
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor:
                        item.senderId === userID1
                          ? theme.colors.primary
                          : theme.colors.card,
                      marginLeft: item.senderId !== userID1 ? 8 : 0,
                      marginRight: item.senderId === userID1 ? 8 : 0,
                      opacity: isDeleted || isRecalled ? 0.7 : 1
                    },
                  ]}
                >
                  {/* Render recalled/deleted message */}
                  {(isDeleted || isRecalled) ? (
                    <Text
                      style={[
                        styles.recalledMessageText,
                        {
                          color: item.senderId === userID1 ? "#fff" : theme.colors.text,
                          fontStyle: "italic"
                        }
                      ]}
                    >
                      {typeof item.message === "string" ? item.message : "Tin nhắn đã bị thu hồi"}
                    </Text>
                  ) : isFile ? (
                    <FileMessage item={item} theme={theme} userID1={userID1} key={item.id} />
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: item.senderId === userID1 ? "#fff" : theme.colors.text
                        }
                      ]}
                    >
                      {typeof item.message === "string" ? item.message : ""}
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.messageTime,
                      {
                        color: item.senderId === userID1 ? "#fff" : theme.colors.text,
                        alignSelf: item.senderId === userID1 ? "flex-end" : "flex-start",
                      }
                    ]}
                  >
                    {messageTime}
                    {(isDeleted || isRecalled) && (
                      <FontAwesome
                        name={isDeleted ? "trash" : "undo"}
                        size={12}
                        color={item.senderId === userID1 ? "#fff" : theme.colors.text}
                        style={{ marginLeft: 5 }}
                      />
                    )}
                  </Text>
                </View>

                {/* Empty view to balance avatar space for sent messages */}
                {item.senderId === userID1 && <View style={styles.avatarPlaceholder} />}
              </TouchableOpacity>
            </>
          );
        }}
        contentContainerStyle={styles.messagesContainer}
      />

      {/* Emoji Picker */}
      {showEmojiPicker && (
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

      {/* Image Picker (Mobile) */}
      {showImagePicker && Platform.OS !== "web" && (
        <View style={[styles.imagePickerContainer, { backgroundColor: theme.colors.card }]}>
          {/* Header như cũ */}
          <View style={styles.imagePickerHeader}>
            <Text style={[styles.imagePickerTitle, { color: theme.colors.text }]}>
              Select Images ({tempSelectedImages.length})
            </Text>
            <TouchableOpacity onPress={() => { setShowImagePicker(false); setTempSelectedImages([]); }}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Grid ảnh */}
          <FlatList
            data={deviceImages}
            numColumns={3}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = !!tempSelectedImages.find(a => a.id === item.id);
              return (
                <TouchableOpacity
                  onPress={() => toggleSelectImage(item)}
                  style={[
                    styles.imageItem,
                    selected && { borderWidth: 2, borderColor: theme.colors.primary }
                  ]}
                >
                  <Image source={{ uri: item.uri }} style={styles.imageThumbnail} />
                </TouchableOpacity>
              );
            }}
          />

          {/* Nút Gửi */}
          <View style={{ padding: 10, borderTopWidth: 1, borderColor: theme.colors.border }}>
            <Button disabled={tempSelectedImages.length === 0} onPress={sendSelectedImages}>
              Gửi {tempSelectedImages.length} ảnh
            </Button>
          </View>
        </View>
      )}


      {/* Message Options Menu */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => alert("Reply")}>
              <FontAwesome name="reply" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => alert("Forward")}>
              <FontAwesome name="share" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Forward</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => alert("Copy")}>
              <FontAwesome name="copy" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => alert("Save to Cloud")}>
              <FontAwesome name="cloud" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Cloud</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: "red" }]}
              onPress={() => selectedMessage && handleDeleteMessage(selectedMessage.id)}
            >
              <FontAwesome name="trash" size={20} color="#fff" />
              <Text style={styles.menuText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: "orange" }]}
              onPress={() => selectedMessage && handleRecallMessage(selectedMessage.id)}
            >
              <FontAwesome name="undo" size={20} color="#fff" />
              <Text style={styles.menuText}>Recall</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.border }]}
              onPress={closeMenu}
            >
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Close</Text>
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
        targetUserId={friendId as string}
        onRename={handleRename}
        currentUserId={currentUserId || ""}
        isGroupChat={isGroupChat}
        conversationId={conversationId as string}
      />
      {/* Settings Panel */}
      <Modal visible={settingsVisible} transparent animationType="none">
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
              <TouchableOpacity onPress={closeSettings}>
                <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.settingsTitle, { color: theme.colors.text }]}>Settings</Text>
            </View>
            <View style={styles.userInfo}>
              <FontAwesome name="user-circle" size={60} color={theme.colors.text} />
              <Text style={[styles.userName, { color: theme.colors.text }]}>User Name</Text>
            </View>
            <View style={styles.settingsOptions}>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="pencil" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Change Nickname</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="image" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Media, Files & Links</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="search" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Search Messages</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="bell" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Mute Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="user-plus" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Create Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="users" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Add to Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <FontAwesome name="group" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>View Common Groups</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.settingsItem]}>
                <FontAwesome name="trash" size={20} color={theme.colors.text} />
                <Text style={[styles.settingsText, { color: theme.colors.text }]}>Clear Chat History</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Options Modal */}
      <Modal visible={optionsVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.optionsContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleFileOptionPress}
            >
              <FontAwesome name="file" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>File</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => alert("Cloud")}>
              <FontAwesome name="cloud" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>Cloud</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => alert("Remind")}>
              <FontAwesome name="bell" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>Remind</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.border }]}
              onPress={closeOptions}
            >
              <Text style={[styles.optionText, { color: theme.colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={toggleEmojiPicker} style={styles.iconSpacing}>
          <FontAwesome
            name="smile-o"
            size={24}
            color={showEmojiPicker ? theme.colors.primary : theme.colors.text}
          />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.text}
        />
        {message.trim() === "" ? (
          <>
            <TouchableOpacity onPress={showOptions} style={styles.iconSpacing}>
              <FontAwesome name="ellipsis-v" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => alert("Record")} style={styles.iconSpacing}>
              <FontAwesome name="microphone" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openImagePicker} style={styles.iconSpacing}>
              <FontAwesome
                name="image"
                size={24}
                color={showImagePicker ? theme.colors.primary : theme.colors.text}
              />
            </TouchableOpacity>
          </>
        ) : (
          <Button onPress={sendTextMessage}>Send</Button>
        )}
      </View>
    </View>
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
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 30
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: 'left',
    flex: 1,
    paddingLeft: 15
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
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  recalledMessageText: {
    fontSize: 16,
    fontStyle: 'italic',
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
    paddingHorizontal: 20
  },
  settingsText: {
    fontSize: 16,
    marginLeft: 15,
  },
  emojiPickerContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  imagePickerContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 1000,
  },
  imagePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageItem: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
});