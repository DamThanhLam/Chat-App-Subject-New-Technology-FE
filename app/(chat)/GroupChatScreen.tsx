// @ts-nocheck
import {
  Provider as PaperProvider,
  DefaultTheme as PaperDefaultTheme,
  MD2DarkTheme as PaperDarkTheme,
} from "react-native-paper";
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
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { connectSocket, getSocket } from "@/src/socket/socket";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import * as MediaLibrary from "expo-media-library";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { DOMAIN } from "@/src/configs/base_url";
import { Auth } from "aws-amplify";
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
  lastModified?: number;
}
interface Message {
  id: string;
  conversationId: string | null;
  senderId: string;
  message: string | FileMessage;
  createdAt: string;
  updatedAt: string;
  readed: string[];
  messageType: "group";
  contentType: "file" | "emoji" | "text";
  status: "recalled" | "deleted" | "readed" | "sended" | "received";
}
interface User {
  _id: string;
  name: string;
  image: string;
}
interface Conversation {
  id: string;
  participants: (string | User)[];
  groupName?: string;
  permission: any;
  leaderId: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GroupChatScreen = () => {
  const [userID1, setUserID1] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [tempSelectedImages, setTempSelectedImages] = useState<
    MediaLibrary.Asset[]
  >([]);
  const [deviceImages, setDeviceImages] = useState<MediaLibrary.Asset[]>([]);
  const [filePickerVisible, setFilePickerVisible] = useState(false);
  const [token, setToken] = useState("");
  const [groupParticipants, setGroupParticipants] = useState<User[]>([]);
  const { conversationId } = useLocalSearchParams();
  const slideAnim = useState(new Animated.Value(SCREEN_WIDTH))[0];
  const flatListRef = useRef<FlatList>(null);
  const dateBefore = useRef<Date | null>(null);
  const colorScheme = useColorScheme();
  const theme = useMemo(
    () => (colorScheme === "dark" ? PaperDarkTheme : PaperDefaultTheme),
    [colorScheme]
  );
  const emojiPickerTheme: Theme =
    colorScheme === "dark" ? Theme.DARK : Theme.LIGHT;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [groupName, setGroupName] = useState("Group Chat");
  const [isChatting, setIsChatting] = useState(false);
  const [isLeader, setIsleader] = useState(false);
  const isRemoved = useRef(false);
  useEffect(() => {
    if (flatListRef.current && conversation.length > 0) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [conversation]);

  // Authentication: get userID and token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await Auth.currentSession();
        const payload = session.getIdToken().decodePayload();
        setUserID1(payload.sub);
        setToken(session.getIdToken().getJwtToken());
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();
  }, []);

  // Fetch group info: name and participants
  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!conversationId || !token) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${API_BASE_URL}/conversations/${conversationId}`,
          { headers }
        );
        if (!res.ok) throw new Error("Could not fetch group info");
        const groupData: Conversation = await res.json();
        setIsChatting(groupData.permission.chat);
        setGroupName(groupData.groupName);
        setIsleader(userID1 === groupData.leaderId);
        const users: User[] = await Promise.all(
          groupData.participants.map(async (p) => {
            const uid = p.id;
            try {
              const ures = await fetch(`${API_BASE_URL}/user/${uid}`, {
                headers,
              });
              const udata = await ures.json();
              console.log(udata);
              return {
                _id: uid,
                name: udata.username || udata.name || "Unknown",
                image: udata.avatarUrl || udata.urlAVT || "",
              };
            } catch (e) {
              console.log(e.message);
              return { _id: uid, name: "Unknown", image: "" };
            }
          })
        );
        setGroupParticipants(users);
      } catch (err) {
        console.error("fetchGroupInfo error", err);
        Alert.alert("Error", "Failed to load group info");
      }
    };
    fetchGroupInfo();
  }, [conversationId, token, userID1]);

  const handleEmojiSelectMobile = (emoji: EmojiType) => {
    setMessage((m) => {
      if (m) {
        return m + emoji.emoji;
      }
      return emoji.emoji;
    });
    setShowEmojiPicker(false);
  };

  // Fetch group messages history
  useEffect(() => {
    if (!conversationId || !token) return;
    fetch(`${DOMAIN}:3000/api/message/group?conversationId=${conversationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject("Fetch messages failed")))
      .then((msgs: Message[]) => {
        const sorted = msgs.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setConversation(sorted);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: false }),
          100
        );
      })
      .catch((err) => console.error("fetch messages error", err));
  }, [conversationId, token]);

  // Socket.IO for group chat
  useEffect(() => {
    let socket: any;

    // Skip if the group is already marked as removed
    if (isRemoved.current) return;

    const handleNew = ({
      message: newMsg,
      conversationId: cid,
    }: {
      message: Message & { tempId?: string };
    }) => {
      if (cid === conversationId) {
        setConversation((prev) => {
          let list = [...prev];
          if (newMsg.tempId) list = list.filter((m) => m.id !== newMsg.tempId);
          if (!list.some((m) => m.id === newMsg.id)) list.push(newMsg);
          list.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setTimeout(
            () => flatListRef.current?.scrollToEnd({ animated: true }),
            100
          );
          return list;
        });
      }
    };

    // Handle group deletion
    const handleGroupDeleted = ({
      conversationId: cid,
    }: {
      conversationId: string;
    }) => {
      if (cid === conversationId) {
        // Use a ref to track if notification was already shown
        if (isRemoved.current) return; // Skip if already processed
        isRemoved.current = true; // Mark as processed

        const alertMessage =
          "Nhóm đã giải tán. Bạn sẽ được chuyển về trang chính.";
        Platform.OS === "web"
          ? window.alert(alertMessage)
          : Alert.alert("Thông báo", alertMessage);
        router.replace("/home");
      }
    };

    const handleRemovedFromGroup = ({
      conversationId: cid,
      message,
    }: {
      conversationId: string;
      message: string;
    }) => {
      if (cid === conversationId) {
        Platform.OS === "web"
          ? window.alert(message)
          : Alert.alert("Thông báo", message);

        // Navigate back to home screen
        router.replace("/home");
      }
    };

    const handleUserLeft = ({
      userId,
      username,
      conversationId: cid,
      message,
    }: {
      userId: string;
      username: string;
      conversationId: string;
      message?: any;
    }) => {
      if (cid === conversationId) {
        if (userId === userID1) {
          router.back();
          return; // Exit early if current user left
        }

        // Update participants list first
        setGroupParticipants((prev) => prev.filter((p) => p._id !== userId));

        // Only add the message to conversation if it's valid and has the required format
        if (message && typeof message === "object" && message.createdAt) {
          setConversation((prev) => [...prev, message]);
        } else if (username) {
          // Create a system message if the message object is not valid
          const systemMessage: Message = {
            id: `system-${Date.now()}`,
            conversationId: conversationId,
            senderId: "system",
            message: `${username} đã rời khỏi nhóm`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            readed: [],
            messageType: "group",
            contentType: "text",
            status: "sended",
          };
          setConversation((prev) => [...prev, systemMessage]);
        }
      }
    };

    connectSocket()
      .then(() => {
        socket = getSocket();
        socket?.on("message-deleted", ({ messageId }) =>
          setConversation((prev) => prev.filter((m) => m.id !== messageId))
        );
        socket?.on("message-recalled", ({ message }) => {
          console.log("message-recalled");
          console.log(message);
          setConversation((prev) =>
            prev.map((m) => (m.id === message.id ? message : m))
          );
        });
        socket?.on("group-message", handleNew);
        socket?.on("userLeft", handleUserLeft);
        socket?.on("group-deleted", handleGroupDeleted);
        socket?.on("removed-from-group", handleRemovedFromGroup);
        socket?.emit("join-group", conversationId);
        socket.on(
          "group-renamed",
          ({ conversationId: cid, newName, leaderId }) => {
            conversationId === cid && setGroupName(newName);
          }
        );
        socket.on(
          "userJoinedGroup",
          ({ message, userJoin, conversationId: cid }) => {
            if (cid === conversationId) {
              setConversation((pre) => [...pre, message]);
              userJoin &&
                setGroupParticipants((pre) => [
                  ...pre,
                  {
                    _id: userJoin.id,
                    name: userJoin.name || userJoin.username || "Unknown",
                    image: userJoin.urlAVT || userJoin.avatarUrl || "",
                  },
                ]);
            }
          }
        );
        socket.on(
          "reponse-approve-into-group",
          ({ message, userJoin, conversationId: cid }) => {
            if (cid === conversationId) {
              setConversation((pre) => [...pre, message]);
              userJoin &&
                setGroupParticipants((pre) => [
                  ...pre,
                  {
                    _id: userJoin.id,
                    name: userJoin.name || userJoin.username || "Unknown",
                    image: userJoin.urlAVT || userJoin.avatarUrl || "",
                  },
                ]);
            }
          }
        );
        socket.on("response-invite-join-group", (response) => {
          console.log("response-invite-join-group");
          console.log(response);
        });
        socket.on("block-chatting", ({ isChatting, conversationId: cid }) => {
          if (cid === conversationId) {
            setIsChatting(isChatting);
          }
        });
      })
      .catch((err) => console.error("Socket connect error", err));

    return () => {
      if (socket) {
        console.log("Cleaning up socket listeners for GroupChatScreen");
        socket.emit("leave-group", conversationId);
        socket.off("message-deleted");
        socket.off("message-recalled");
        socket.off("group-message", handleNew);
        socket.off("userLeft", handleUserLeft);
        socket.off("group-deleted", handleGroupDeleted);
        socket.off("removed-from-group", handleRemovedFromGroup);
        socket.off("group-renamed");
        socket.off("userJoinedGroup");
        socket.off("reponse-approve-into-group");
        socket.off("response-invite-join-group");
        socket.off("block-chatting");
      }
    };
  }, [conversationId, userID1]);

  useEffect(() => {
    console.log(
      "Socket useEffect running with conversationId:",
      conversationId
    );
    // ... rest of the code
  }, [conversationId]);

  const openSettings = useCallback(() => {
    if (settingsVisible || menuVisible || optionsVisible) return;

    slideAnim.setValue(SCREEN_WIDTH);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSettingsVisible(true));
  }, [settingsVisible, menuVisible, optionsVisible, slideAnim]);

  const sendTextMessage = () => {
    if (!message.trim()) return;
    const socket = getSocket();
    if (!socket) return Alert.alert("Error", "Socket not connected");
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      senderId: userID1,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readed: [],
      messageType: "group",
      contentType: "text",
      status: "sended",
    };
    setConversation((prev) => [...prev, optimistic]);
    setMessage("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    socket.emit("group-message", {
      conversationId,
      message: optimistic.message,
      messageType: "group",
      contentType: "text",
      tempId,
    });
  };

  const handleMobileMultiImageSelect = async (
    selectedAssets: MediaLibrary.Asset[]
  ) => {
    try {
      const files = selectedAssets.map((asset) => ({
        uri: asset.uri,
        name: asset.filename,
      }));

      // 1) upload lên server, nhận mảng URL
      const imagesUpload = await uploadFilesToServer(files);

      // 2) emit socket cho mỗi URL hoặc gộp
      imagesUpload.forEach((image: any) => {
        // Create a temporary optimistic message for each uploaded image
        const tempId = `temp-file-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        const optimisticMessage: Message = {
          id: tempId,
          conversationId,
          senderId: userID1,
          message: {
            data: image.url,
            filename: image.filename,
            size: 0,
            type: "image",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          readed: [],
          messageType: "group",
          contentType: "file",
          status: "sended",
        };

        // Add the optimistic message to the conversation
        setConversation((prev) => [...prev, optimisticMessage]);

        // Emit the actual message
        getSocket().emit("group-message", {
          conversationId: conversationId,
          message: { data: image.url, filename: image.filename },
          messageType: "group",
          contentType: "file",
          tempId,
        });
      });

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
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

  const toggleSelectImage = (asset: MediaLibrary.Asset) => {
    setTempSelectedImages((prev) => {
      const exists = prev.find((a) => a.id === asset.id);
      return exists ? prev.filter((a) => a.id !== asset.id) : [...prev, asset];
    });
  };

  const sendSelectedImages = async () => {
    console.log(tempSelectedImages.length);
    if (tempSelectedImages.length === 0) return;
    await handleMobileMultiImageSelect(tempSelectedImages);
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

  const handleFileOptionPress = () => {
    setOptionsVisible(false);
    setShowFilePicker(true);
    getDeviceFiles();
  };

  useEffect(() => {
    if (showImagePicker && Platform.OS !== "web") loadDeviceImages();
  }, [showImagePicker]);

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((v) => !v);
    setShowImagePicker(false);
    setFilePickerVisible(false);
    if (showEmojiPicker) Keyboard.dismiss();
  };

  const handleEmojiClick = (e: EmojiClickData) =>
    setMessage((m) => m + e.emoji);

  const openImagePicker = () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    } else {
      setFilePickerVisible(true);
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
      console.log(uploadFiles);
      const urls = await uploadFilesToServer(uploadFiles);

      urls.forEach((image: any) => {
        getSocket().emit("group-message", {
          conversationId: conversationId,
          message: { data: image.url, filename: image.filename },
          messageType: "group",
          contentType: "file",
        });
      });
    } catch (error: any) {
      console.error("Lỗi upload file:", error);
      Alert.alert("Upload thất bại", error.message);
    }
  };

  const handleMessageSelect = (msgId: string) => {
    const idx = conversation.findIndex((m) => m.id === msgId);
    if (idx >= 0)
      flatListRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.5,
      });
  };

  const closeSettings = useCallback(() => {
    setSettingsVisible(false);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedMessage(null);
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
      urls.forEach((image: any) => {
        getSocket().emit("group-message", {
          conversationId: conversationId,
          message: { data: image.url, filename: image.filename },
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

  return (
    <PaperProvider theme={theme}>
      {/* Hidden web file input */}
      {Platform.OS === "web" && (
        <input
          id="fileInput"
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={() => {}}
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
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {groupName || "Nhóm chat"}
          </Text>
          <Text style={[styles.participantsText, { color: theme.colors.text }]}>
            {groupParticipants.length} thành viên
          </Text>
        </View>
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
      {/* FlatList */}
      <FlatList
        data={conversation}
        ref={flatListRef}
        keyExtractor={(item) =>
          item ? item.id : `fallback-${Date.now()}-${Math.random()}`
        }
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        renderItem={({ item }) => {
          // Skip rendering if item is null or undefined
          if (!item || !item.createdAt) {
            console.warn("Skipping invalid message item:", item);
            return null;
          }

          let showDate = false;
          let stringDate = "";

          try {
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
            const messageTime = format(createdAt, "HH:mm");
            dateBefore.current = createdAt;
            const sender = groupParticipants.find(
              (p) => p?._id === item.senderId || p?.id === item.senderId
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
                isGroupChat={true}
              />
            );
          } catch (error) {
            console.error("Error rendering message:", error, item);
            return null;
          }
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

      {/* Emoji Picker */}
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
      {/* Image Picker (Mobile) */}
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
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
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

          {/* Input Area */}
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <TouchableOpacity
              onPress={toggleEmojiPicker}
              style={[
                styles.iconSpacing,
                { display: isChatting || isLeader ? "flex" : "none" },
              ]}
            >
              <FontAwesome name="smile-o" size={24} color="#007bff" />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              editable={isChatting || isLeader}
              value={message}
              onChangeText={setMessage}
              placeholder={
                isChatting || isLeader
                  ? "Type a message..."
                  : "Nhóm trưởng đã khá chat"
              }
              placeholderTextColor="#666666"
            />
            {message.trim() === "" ? (
              <>
                {Platform.OS === "web" && (
                  <input
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    ref={fileInputRef}
                    onChange={onWebFilesChange}
                    disabled={!(isChatting || isLeader)}
                  />
                )}
                <TouchableOpacity
                  onPress={openImagePicker}
                  style={styles.iconSpacing}
                  disabled={!(isChatting || isLeader)}
                >
                  <FontAwesome name="image" size={24} color="#007bff" />
                </TouchableOpacity>
              </>
            ) : isChatting || isLeader ? (
              <Button onPress={sendTextMessage}>Send</Button>
            ) : (
              <></>
            )}
          </View>
        </View>
      </View>

      {/* Modals and Panels */}
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

      <SettingsPanel
        visible={settingsVisible}
        onClose={closeSettings}
        slideAnim={slideAnim}
        colorScheme={colorScheme || null}
        targetUserId=""
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
        style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}
      >
        <TouchableOpacity
          onPress={toggleEmojiPicker}
          style={[
            styles.iconSpacing,
            { display: isChatting || isLeader ? "flex" : "none" },
          ]}
          style={[
            styles.iconSpacing,
            { display: isChatting || isLeader ? "flex" : "none" },
          ]}
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
          editable={isChatting || isLeader}
          value={message}
          onChangeText={setMessage}
          placeholder={
            isChatting || isLeader
              ? "Type a message..."
              : "Nhóm trưởng đã khá chat"
          }
          placeholder={
            isChatting || isLeader
              ? "Type a message..."
              : "Nhóm trưởng đã khá chat"
          }
          placeholderTextColor={theme.colors.text}
        />
        {message.trim() === "" ? (
          <>
            <TouchableOpacity
              onPress={() => alert("Record")}
              style={styles.iconSpacing}
              disabled={!(isChatting || isLeader)}
            >
              <FontAwesome
                name="microphone"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            {/* Hidden web file input */}
            {Platform.OS === "web" && (
              <input
                type="file"
                multiple
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={onWebFilesChange}
                disabled={!(isChatting || isLeader)}
              />
            )}

            <TouchableOpacity
              onPress={openImagePicker}
              style={styles.iconSpacing}
              disabled={!(isChatting || isLeader)}
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
        ) : isChatting || isLeader ? (
          <Button onPress={sendTextMessage}>Send</Button>
        ) : (
          <></>
        )}
        ) : isChatting || isLeader ? (
          <Button onPress={sendTextMessage}>Send</Button>
        ) : (
          <></>
        )}
      </View>
    </PaperProvider>
  );
};

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#e0e0e0", // Updated to gray background
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
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
  },
  chatContainer: {
    flex: 1,
    flexDirection: "column",
  },
  headerTitleContainer: {
    flex: 1,
    paddingLeft: SCREEN_WIDTH * 0.02,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    paddingLeft: 12,
  },
  participantsText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666666",
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginHorizontal: SCREEN_WIDTH * 0.01,
    padding: 8,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.02,
    paddingVertical: 10,
    backgroundColor: "#e0e0e0", // Updated to gray background
  },
  dateSeparatorContainer: {
    alignSelf: "center",
    marginVertical: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: "#666666",
  },
  sentMessageContainer: {
    justifyContent: "flex-end",
    marginLeft: SCREEN_WIDTH * 0.2,
    marginVertical: 8,
  },
  receivedMessageContainer: {
    justifyContent: "flex-start",
    marginRight: SCREEN_WIDTH * 0.2,
    marginVertical: 8,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
    borderWidth: 1,
    borderColor: "#e0e0e0", // Added border to match the image
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 14,
    color: "#ffffff", // Default text color (will be overridden in MessageItem)
    fontWeight: "400",
  },
  recalledMessageText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#888888",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    color: "#666666",
    alignSelf: "flex-end",
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: 16,
    marginBottom: 4,
  },
  imageTimeText: {
    fontSize: 12,
    textAlign: "right",
    opacity: 0.7,
    color: "#666666",
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    maxWidth: "75%",
    elevation: 1,
    shadowColor: "#e0e0e0",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
  },
  fileTimeText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    color: "#666666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: SCREEN_WIDTH * 0.02,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#ffffff",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 10,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 14,
    color: "#000000",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  menuItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  optionsContainer: {
    width: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  optionItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
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
    backgroundColor: "#ffffff",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000000",
  },
  userInfo: {
    alignItems: "center",
    paddingVertical: 24,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    color: "#000000",
  },
  settingsOptions: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  settingsText: {
    fontSize: 14,
    marginLeft: 12,
    color: "#333333",
    fontWeight: "500",
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
    bottom: 60,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH * 0.9,
    zIndex: 1000,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imagePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  imagePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  imageItem: {
    flex: 1,
    aspectRatio: 1,
    padding: 6,
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
});
