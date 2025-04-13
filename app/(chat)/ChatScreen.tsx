import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
  useColorScheme,
  Dimensions,
  Animated,
  Keyboard,
  SafeAreaView,
} from "react-native";
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { connectSocket, getSocket } from "@/src/socket/socket";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { Theme } from "emoji-picker-react";
import SettingsPanel from "../../components/ui/SettingsPanel";
import { getNickname } from "@/src/apis/nickName";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import { Auth } from "aws-amplify";

interface Message {
  id: string;
  id_user1: string;
  id_user2: string;
  message: string;
  name: string;
  senderId: string; // Thêm senderId để biết người gửi
  category: "send" | "receive";
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

interface Conversation {
  id: string;
  participants: string[];
  groupName?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ChatScreen = () => {
  const [userID1, setUserID1] = useState("");
  const [userID2, setUserID2] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [anotherUser, setAnotherUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null); // Tên nhóm
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false); // Kiểm tra xem có phải chat nhóm không
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
  const colorScheme = useColorScheme();
  const theme = useMemo(
    () => (colorScheme === "dark" ? DarkTheme : DefaultTheme),
    [colorScheme]
  );
  const { friendId, conversationId } = useLocalSearchParams();

  // Animation for sliding panel
  const slideAnim = useState(new Animated.Value(SCREEN_WIDTH))[0];

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
    setSettingsVisible(false);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // Lấy currentUserId từ Auth
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const userId = user.attributes.sub;
        if (!userId || typeof userId !== "string") {
          throw new Error("ID người dùng hiện tại không hợp lệ");
        }
        setCurrentUserId(userId);
      } catch (error: any) {
        console.error("Lỗi khi lấy currentUserId:", error.message);
      }
    };
    fetchCurrentUser();
  }, []);

  // Lấy thông tin cuộc trò chuyện (chat nhóm hoặc chat đôi)
  const fetchConversationInfo = async () => {
    try {
      if (conversationId) {
        // Nếu có conversationId, đây là chat nhóm
        const headers = await getAuthHeaders();
        const response = await fetch(
          `${API_BASE_URL}/conversation/${conversationId}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error("Không thể lấy thông tin cuộc trò chuyện");
        }

        const conversationData: Conversation = await response.json();
        setIsGroupChat(conversationData.participants.length > 2);
        setGroupName(conversationData.groupName || "Nhóm mới");
      } else if (friendId) {
        // Nếu có friendId, đây là chat đôi
        setIsGroupChat(false);
        await fetchUserInfo();
        await fetchNickname();
      } else {
        throw new Error("Không có friendId hoặc conversationId hợp lệ");
      }
    } catch (error: any) {
      console.error("Lỗi khi lấy thông tin cuộc trò chuyện:", error.message);
    }
  };

  // Lấy thông tin người dùng (dùng cho chat đôi)
  const fetchUserInfo = async () => {
    try {
      if (!friendId || typeof friendId !== "string") {
        throw new Error("friendId không hợp lệ");
      }
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/user/${friendId}`, {
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
          userData.urlAVT ||
          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      });
    } catch (error: any) {
      console.error("Lỗi khi lấy thông tin người dùng:", error.message);
    }
  };

  // Lấy tên gợi nhớ (dùng cho chat đôi)
  const fetchNickname = async () => {
    try {
      if (!friendId || typeof friendId !== "string") {
        throw new Error("friendId không hợp lệ");
      }
      const { nickname } = await getNickname(friendId);
      setNickname(nickname);
    } catch (error: any) {
      console.error("Lỗi khi lấy tên gợi nhớ:", error.message);
    }
  };

  // Load thông tin cuộc trò chuyện khi màn hình được mở
  useEffect(() => {
    const loadData = async () => {
      await fetchConversationInfo();
    };
    loadData();
    connectSocket();
  }, [friendId, conversationId]);

  // Callback khi đổi tên gợi nhớ
  const handleRename = (newName: string) => {
    setNickname(newName); // Cập nhật nickname khi tên gợi nhớ được thay đổi
  };

  const normalizeCategory = (category: string): "send" | "receive" => {
    return category === "send" || category === "receive" ? category : "receive";
  };

  const selectUser = (user: { _id: string; name: string; image: string }) => {
    setUserID2(user._id);
    setAnotherUser(user);
  };

  const sendMessage = () => {
    if (!message.trim()) return; // Không gửi tin nhắn rỗng
    const socket = getSocket();
    if (!socket) {
      console.error("Socket chưa được kết nối");
      return;
    }

    socket.emit("private-message", {
      receiverId: conversationId || friendId, // Sử dụng conversationId cho chat nhóm, friendId cho chat đôi
      message: message,
      messageType: isGroupChat ? "group" : "private",
      contentType: "text",
    });
    setMessage("");
    setShowEmojiPicker(false);
  };

  const handleLongPress = (message: { id: string; message: string }) => {
    setSelectedMessage(message);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedMessage(null);
  };

  const showOptions = () => {
    setOptionsVisible(true);
    setShowFilePicker(false);
  };

  const closeOptions = () => {
    setOptionsVisible(false);
  };

  const handleFileOptionPress = () => {
    setOptionsVisible(false);
    setShowFilePicker(true);
    getDeviceFiles();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
    if (showEmojiPicker) {
      Keyboard.dismiss();
    }
    setShowImagePicker(false);
    setShowFilePicker(false);
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

  const handleImageSelect = async (asset: MediaLibrary.Asset) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setShowImagePicker(false);
    }
  };

  const toggleImagePicker = () => {
    setShowImagePicker(!showImagePicker);
    if (showImagePicker) {
      Keyboard.dismiss();
    }
    setShowEmojiPicker(false);
    setShowFilePicker(false);
  };

  const getDeviceFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
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
                  name: file.name || "Không xác định",
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
        setDeviceFiles(fileDetails.filter((f): f is DeviceFile => f !== null));
      }
    } catch (error) {
      console.error("Lỗi khi chọn file:", error);
    }
  };

  const openFile = async (fileUri: string) => {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUri,
        FileSystem.documentDirectory + "tempfile"
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (downloadResult) {
        const contentUri = await FileSystem.getContentUriAsync(
          downloadResult.uri
        );
        console.log("File sẵn sàng để mở:", contentUri);
      }
    } catch (error) {
      console.error("Lỗi khi mở file:", error);
    }
  };

  const emojiPickerTheme: Theme =
    colorScheme === "dark" ? Theme.DARK : Theme.LIGHT;

  const toggleFilePicker = () => {
    setShowFilePicker(!showFilePicker);
    if (showFilePicker) {
      Keyboard.dismiss();
    }
    setShowEmojiPicker(false);
    setShowImagePicker(false);
  };

  useEffect(() => {
    if (showImagePicker) {
      loadDeviceImages();
    }
    if (showFilePicker) {
      getDeviceFiles();
    }
  }, [showImagePicker, showFilePicker]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "image";
      case "mp3":
      case "wav":
      case "aac":
        return "audiotrack";
      case "mp4":
      case "mov":
      case "avi":
        return "video-file";
      case "pdf":
        return "picture-as-pdf";
      case "apk":
        return "android";
      case "doc":
      case "docx":
        return "description";
      case "xls":
      case "xlsx":
        return "grid-on";
      case "ppt":
      case "pptx":
        return "slideshow";
      case "zip":
      case "rar":
        return "folder-zip";
      default:
        return "insert-drive-file";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView
      style={[
        styles.safeContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[
          styles.customHeader,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isGroupChat ? groupName : nickname || anotherUser?.name || "Chat"}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => alert("Call")}
            style={styles.iconSpacing}
          >
            <Ionicons name="call" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => alert("Video")}
            style={styles.iconSpacing}
          >
            <Ionicons name="videocam" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openSettings} style={styles.iconSpacing}>
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Messages */}
      <FlatList
        data={conversation || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => handleLongPress(item)}
            style={[
              styles.messageContainer,
              item.category === "send"
                ? styles.sentMessage
                : styles.receivedMessage,
            ]}
          >
            {item.category === "receive" && (
              <Image
                source={{ uri: anotherUser?.image }}
                style={styles.avatar}
              />
            )}
            <View
              style={[
                styles.messageBubble,
                {
                  backgroundColor:
                    item.category === "send"
                      ? theme.colors.primary
                      : theme.colors.card,
                },
              ]}
            >
              {isGroupChat && item.category === "receive" && (
                <Text style={[styles.senderName, { color: theme.colors.text }]}>
                  {item.name}
                </Text>
              )}
              <Text style={[styles.messageText, { color: theme.colors.text }]}>
                {item.message}
              </Text>
              <Text style={[styles.messageTime, { color: theme.colors.text }]}>
                {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

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

      {showImagePicker && (
        <View
          style={[
            styles.imagePickerContainer,
            {
              backgroundColor: theme.colors.card,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.imagePickerHeader}>
            <Text
              style={[styles.imagePickerTitle, { color: theme.colors.text }]}
            >
              Chọn ảnh
            </Text>
            <TouchableOpacity onPress={() => setShowImagePicker(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={deviceImages}
            numColumns={3}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleImageSelect(item)}
                style={styles.imageItem}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.imageThumbnail}
                />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.imageList}
          />
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
                Trả lời
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => alert("Forward")}
            >
              <FontAwesome name="share" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                Chuyển tiếp
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => alert("Copy")}
            >
              <FontAwesome name="copy" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                Sao chép
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => alert("Save to Cloud")}
            >
              <FontAwesome name="cloud" size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                Lưu lên đám mây
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: "red" }]}
              onPress={() => alert("Remove")}
            >
              <FontAwesome name="trash" size={20} color="#fff" />
              <Text style={[styles.menuText, { color: "#fff" }]}>Xóa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: "orange" }]}
              onPress={() => alert("Recall")}
            >
              <FontAwesome name="undo" size={20} color="#fff" />
              <Text style={[styles.menuText, { color: "#fff" }]}>Thu hồi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.border },
              ]}
              onPress={closeMenu}
            >
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                Đóng
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
        targetUserId={friendId as string}
        onRename={handleRename}
        currentUserId={currentUserId || ""}
        isGroupChat={isGroupChat}
        conversationId={conversationId as string}
      />

      {/* Input Container */}
      <View
        style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}
      >
        <TouchableOpacity
          onPress={toggleEmojiPicker}
          style={styles.iconSpacing}
        >
          <Ionicons
            name="happy-outline"
            size={24}
            color={showEmojiPicker ? theme.colors.primary : theme.colors.text}
          />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={theme.colors.text}
        />
        {message === "" ? (
          <>
            <TouchableOpacity onPress={showOptions} style={styles.iconSpacing}>
              <Ionicons
                name="ellipsis-vertical"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => alert("Record")}
              style={styles.iconSpacing}
            >
              <Ionicons name="mic" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleImagePicker}
              style={styles.iconSpacing}
            >
              <Ionicons
                name="image"
                size={24}
                color={
                  showImagePicker ? theme.colors.primary : theme.colors.text
                }
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={sendMessage} style={styles.iconSpacing}>
            <Ionicons name="send" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Options Modal */}
      <Modal visible={optionsVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[
              styles.optionsContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleFileOptionPress}
            >
              <Ionicons name="document" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                File
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => alert("Cloud")}
            >
              <Ionicons name="cloud" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                Đám mây
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => alert("Remind")}
            >
              <Ionicons name="alarm" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                Nhắc nhở
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.border },
              ]}
              onPress={closeOptions}
            >
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showFilePicker && (
        <View
          style={[
            styles.filePickerContainer,
            {
              backgroundColor: theme.colors.card,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.filePickerHeader}>
            <Text
              style={[styles.filePickerTitle, { color: theme.colors.text }]}
            >
              Chọn file
            </Text>
            <TouchableOpacity onPress={() => setShowFilePicker(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={deviceFiles}
            keyExtractor={(item) => item.uri}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openFile(item.uri)}
                style={styles.fileItem}
              >
                <View style={styles.fileIconContainer}>
                  <MaterialIcons
                    name={getFileIcon(item.name)}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.fileInfoContainer}>
                  <Text
                    style={[styles.fileName, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.fileDetails, { color: theme.colors.text }]}
                  >
                    {formatFileSize(item.size)} •{" "}
                    {new Date(item.lastModified).toLocaleDateString("vi-VN")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.fileList}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginHorizontal: 10,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  sentMessage: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  receivedMessage: {
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    maxWidth: "70%",
  },
  senderName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 5,
    opacity: 0.7,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
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
    padding: 10,
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
  imageList: {
    padding: 5,
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
  filePickerContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 1000,
  },
  filePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  filePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  fileList: {
    padding: 10,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  fileInfoContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    marginBottom: 3,
  },
  fileDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
});
