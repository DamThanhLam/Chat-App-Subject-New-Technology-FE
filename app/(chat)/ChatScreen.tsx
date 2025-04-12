import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
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
} from "react-native";
import io from "socket.io-client";
import Button from "@/components/ui/Button";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { connectSocket, getSocket } from "@/src/socket/socket";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { Theme } from "emoji-picker-react";

interface Message {
  id: string;
  id_user1: string;
  id_user2: string;
  message: string;
  name: string;
  category: "send" | "receive";
}

interface DeviceFile {
  name: string;
  size: number;
  uri: string;
  lastModified: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ChatScreen = () => {
  const [userID1, setUserID1] = useState("");
  const [userID2, setUserID2] = useState("");
  const [anotherUser, setAnotherUser] = useState<{
    _id: string;
    name: string;
    image: string;
  } | null>(null);
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
  const { userId } = useLocalSearchParams();

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

    console.log("openSettings called, settingsVisible:", settingsVisible);

    slideAnim.setValue(SCREEN_WIDTH);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSettingsVisible(true)); // Cập nhật trạng thái sau khi animation chạy xong
  }, [settingsVisible, menuVisible, optionsVisible, slideAnim]);

  const closeSettings = useCallback(() => {
    setSettingsVisible(false); // Đặt trạng thái về false trước
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const normalizeCategory = (category: string): "send" | "receive" => {
    return category === "send" || category === "receive" ? category : "receive";
  };

  const selectUser = (user: { _id: string; name: string; image: string }) => {
    setUserID2(user._id);
    setAnotherUser(user);
  };

  const sendMessage = () => {
    getSocket().emit("private-message", {
      receiverId: "b9ba65cc-2061-7031-229d-5f892034d870",
      message: message,
      messageType: "private",
      contentType: "text",
    });
    setMessage("");
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    connectSocket();
  }, []);

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
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
          {anotherUser?.name || "Chat"}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => alert("Call")}
            style={styles.iconSpacing}
          >
            <FontAwesome name="phone" size={24} color={theme.colors.primary} />
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
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
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
              style={[styles.menuItem, { backgroundColor: "red" }]}
              onPress={() => alert("Remove")}
            >
              <FontAwesome name="trash" size={20} color="#fff" />
              <Text style={styles.menuText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: "orange" }]}
              onPress={() => alert("Recall")}
            >
              <FontAwesome name="undo" size={20} color="#fff" />
              <Text style={styles.menuText}>Recall</Text>
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
                User Name
              </Text>
            </View>
            <View style={styles.settingsOptions}>
              <TouchableOpacity style={styles.settingsItem}>
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
              <TouchableOpacity style={styles.settingsItem}>
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

      {/* Input Container */}
      <View
        style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}
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
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={theme.colors.text}
        />
        {message === "" ? (
          <>
            <TouchableOpacity onPress={showOptions} style={styles.iconSpacing}>
              <FontAwesome
                name="ellipsis-v"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
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
              onPress={toggleImagePicker}
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
          <Button onPress={sendMessage}>Gửi</Button>
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
              <FontAwesome name="file" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                File
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => alert("Cloud")}
            >
              <FontAwesome name="cloud" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                Cloud
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => alert("Remind")}
            >
              <FontAwesome name="bell" size={20} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                Remind
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
                Close
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
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
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
                    {format(new Date(item.lastModified), "d/M/yyyy")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.fileList}
          />
        </View>
      )}
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "left",
    flex: 1,
    paddingLeft: 15,
  },
  container: {
    flex: 1,
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
  // Settings panel styles
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
  deleteButton: {
    marginTop: 20,
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
