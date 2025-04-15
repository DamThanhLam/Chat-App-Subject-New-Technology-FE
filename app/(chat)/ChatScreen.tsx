import React, { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format } from "date-fns";
import { DOMAIN } from "@/src/configs/base_url";
import { Auth } from "aws-amplify";
import FileMessage from "@/components/FileMessage";
import SettingsPanel from "@/components/ui/SettingsPanel";
import { API_BASE_URL, getAuthHeaders } from "@/src/utils/config";
import FilePickerModal from "@/components/FilePickerModal";

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
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ChatScreen = () => {
  const [userID1, setUserID1] = useState("");
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
  const [anotherUser, setAnotherUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false);
  const theme = useMemo(() => (colorScheme === "dark" ? DarkTheme : DefaultTheme), [colorScheme]);
  const [tempSelectedImages, setTempSelectedImages] = useState<MediaLibrary.Asset[]>([]);
  const [filePickerVisible, setFilePickerVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DeviceFile | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyPreviewVisible, setReplyPreviewVisible] = useState(false);

  const { friendId, conversationId } = useLocalSearchParams();
  const { userID2, friendName } = useLocalSearchParams();
  const slideAnim = useState(new Animated.Value(SCREEN_WIDTH))[0];
  const [token, setToken] = useState<string>("");
  const dateBefore = useRef<Date | null>()

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setReplyPreviewVisible(true);
    setMenuVisible(false);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyPreviewVisible(false);
  };

  const sendTextMessage = () => {
    if (!message.trim()) return;
    
    getSocket().emit("private-message", {
      receiverId: userID2,
      message,
      messageType: "private",
      contentType: "text",
      parentMessage: replyingTo || undefined,
    });
    
    setMessage("");
    setShowEmojiPicker(false);
    setReplyingTo(null);
    setReplyPreviewVisible(false);
  };

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
    setNickname(friendName.toString())
  }, [friendName])

  useEffect(() => {
    fetchUserInfo()
  }, [userID2])

  // Lấy token khi mount
  useEffect(() => {
    const getSub = async () => {
      try {
        const session = await Auth.currentSession();
        const sub = session.getIdToken().decodePayload().sub;
        setUserID1(sub)
        return;
      } catch (err) {
        console.error("Lỗi lấy getSub:", err);
        return ""
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
      }).then(res => res.json())
        .then(data => {
          updateConversation(data)
        })
    }
  }, [token])

  const updateConversation = (data: Message[]) => {
    console.log(data)
    const sort = [...data].sort((a: Message, b: Message) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    setConversation(sort)
  };

  useEffect(() => {
    let socketRef: any;
    connectSocket().then(socket => {
      socketRef = socket;

      // Xử lý xóa
      socket.on("delete-message", ({ messageId }: { messageId: string }) => {
        setConversation(prev =>
          prev
            .map(msg =>
              msg.id === messageId
                ? { ...msg, status: "deleted" as Message["status"], message: "Tin nhắn đã bị xóa" }
                : msg
            )
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      });

      // Xử lý thu hồi
      socket.on("recall-message", ({ message }: { message: Message }) => {
        setConversation(prev =>
          prev
            .map(msg =>
              msg.id === message.id
                ? { ...msg, status: "recalled" as Message["status"], message: "Tin nhắn đã bị thu hồi" }
                : msg
            )
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      });

      // Tin nhắn mới (kết quả hoặc private)
      const handleNew = ({ message }: { message: Message }) => {
        setConversation(prev => {
          const exists = prev.some(m => m.id === message.id);
          const updated = exists ? prev : [...prev, message];
          return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      };

      socket.on("result", handleNew);
      socket.on("private-message", handleNew);
    });

    return () => {
      if (socketRef) {
        socketRef.off("delete-message");
        socketRef.off("recall-message");
        socketRef.off("result");
        socketRef.off("private-message");
      }
    };
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      getSocket().emit("delete-message", messageId);
      setConversation(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: "deleted", message: "Tin nhắn đã bị xóa" }
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
          ? { ...msg, status: "recalled", message: "Tin nhắn đã bị thu hồi" }
          : msg
      ));
      setMenuVisible(false);
    } catch (error) {
      console.error("Error recalling message:", error);
      Alert.alert("Error", "Failed to recall message");
    }
  }, []);

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
    if (item.status === "deleted" || item.status === "recalled") return;
    setSelectedMessage({
      id: item.id,
      message: typeof item.message === "string" ? item.message : "[File message]",
    });
    setMenuVisible(true);
  };

  const handleRename = (newName: string) => {
    setNickname(newName);
  };

  const handleMobileMultiImageSelect = async (selectedAssets: MediaLibrary.Asset[]) => {
    try {
      const files = selectedAssets.map(asset => ({
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
      setFilePickerVisible(true)
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
      console.log("DocumentPicker result:", result);

      let files: Array<{ name: string; size?: number; uri: string }> = [];

      if (Platform.OS === "web") {
        if (result && (result as any).assets) {
          files = (result as any).assets;
        }
      } else {
        if (result.type === 'success') {
          files = [result];
        } else if (result.type === 'cancel') {
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
                  name: file.name || 'Unknown',
                  size: file.size || 0,
                  uri: file.uri,
                  lastModified: fileInfo.modificationTime || Date.now(),
                };
              }
              return null;
            } catch (error) {
              console.error('Lỗi khi lấy thông tin file:', error);
              return null;
            }
          })
        );

        const validFiles = fileDetails.filter((f): f is DeviceFile => f !== null);
        if (validFiles.length > 0) {
          setDeviceFiles(validFiles);
          console.log("Danh sách file được chọn:", validFiles);
        } else {
          Alert.alert("Error", "Không thể lấy thông tin file hợp lệ.");
        }
      }
    } catch (error) {
      console.error('Lỗi khi chọn file:', error);
      Alert.alert("Error", "Không thể truy cập file. Vui lòng thử lại.");
    }
  };

  const uriToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const handleFileSelected = async (files: DeviceFile[]) => {
    console.log(files)
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
    setMessage(m => {
      if (m) {
        return m + emoji.emoji
      }
      return emoji.emoji
    });
    setShowEmojiPicker(false);
  };

  const onWebFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
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
      {Platform.OS === "web" && (
        <input
          type="file"
          multiple
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={onWebFilesChange}
        />
      )}

      <View style={[styles.customHeader, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {nickname || anotherUser?.name || "Chat"}
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
            month: "2-digit",
            day: "2-digit",
          });

          let dateParts = vietnamTime.split("/");
          const formattedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`);

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
          const isDeleted = item.status === "deleted";
          const isRecalled = item.status === "recalled";
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
                {item.senderId !== userID1 && anotherUser && (
                  <Image
                    source={{ uri: anotherUser.image }}
                    style={styles.avatar}
                  />
                )}

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
                  {/* Hiển thị tin nhắn đang được phản hồi nếu có */}
                  {item.parentMessage && (
                    <View style={[
                      styles.replyBox, 
                      {
                        backgroundColor: item.senderId === userID1 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'rgba(0, 0, 0, 0.1)',
                        borderLeftColor: theme.colors.primary
                      }
                    ]}>
                      <Text style={[
                        styles.replyAuthor,
                        { color: item.senderId === userID1 ? '#fff' : theme.colors.text }
                      ]}>
                        {item.parentMessage.senderId === userID1 ? "Bạn" : anotherUser?.name || "Unknown"}
                      </Text>
                      <Text 
                        style={[
                          styles.replyContent,
                          { color: item.senderId === userID1 ? '#fff' : theme.colors.text }
                        ]} 
                        numberOfLines={1}
                      >
                        {typeof item.parentMessage.message === "string"
                          ? item.parentMessage.message
                          : "[File]"}
                      </Text>
                    </View>
                  )}

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

                {item.senderId === userID1 && <View style={styles.avatarPlaceholder} />}
              </TouchableOpacity>
            </>
          );
        }}
        contentContainerStyle={styles.messagesContainer}
      />

      {replyPreviewVisible && replyingTo && (
        <View style={[styles.replyPreviewContainer, { 
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }]}>
          <View style={styles.replyPreviewContent}>
            <View style={[styles.replyPreviewLine, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.replyPreviewDetails}>
              <Text style={[styles.replyPreviewName, { color: theme.colors.primary }]}>
                {replyingTo.senderId === userID1 ? "You" : anotherUser?.name}
              </Text>
              {replyingTo.contentType === "text" ? (
                <Text 
                  style={[styles.replyPreviewText, { color: theme.colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {typeof replyingTo.message === "string" ? replyingTo.message : ""}
                </Text>
              ) : replyingTo.contentType === "file" ? (
                <Text 
                  style={[styles.replyPreviewText, { color: theme.colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  <FontAwesome name="file" size={14} color={theme.colors.text} /> File
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleCancelReply}>
              <FontAwesome name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
        <View style={[styles.imagePickerContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.imagePickerHeader}>
            <Text style={[styles.imagePickerTitle, { color: theme.colors.text }]}>
              Select Images ({tempSelectedImages.length})
            </Text>
            <TouchableOpacity onPress={() => { setShowImagePicker(false); setTempSelectedImages([]); }}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

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

          <View style={{ padding: 10, borderTopWidth: 1, borderColor: theme.colors.border }}>
            <Button disabled={tempSelectedImages.length === 0} onPress={sendSelectedImages}>
              Gửi {tempSelectedImages.length} ảnh
            </Button>
          </View>
        </View>
      )}

      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => selectedMessage && handleReply(conversation.find(m => m.id === selectedMessage.id)!)}
            >
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
      />

      <FilePickerModal
        visible={filePickerVisible}
        onClose={() => setFilePickerVisible(false)}
        onFileSelected={handleFileSelected}
      />

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
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
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
  replyBox: {
    borderLeftWidth: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  replyAuthor: {
    fontWeight: "600",
    fontSize: 13,
  },
  replyContent: {
    fontStyle: "italic",
    fontSize: 13,
    opacity: 0.8,
  },
  replyPreviewContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  replyPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyPreviewLine: {
    width: 3,
    height: 40,
    marginRight: 10,
    borderRadius: 2,
  },
  replyPreviewDetails: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
    opacity: 0.8,
  },
});

