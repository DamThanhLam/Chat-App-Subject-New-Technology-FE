import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import ContextMenuDialog from "./ContextMenuDialog";
import { connectSocket, getSocket } from "@/src/socket/socket";
import FileMessage from "./FileMessage";
import { Linking } from "react-native";

interface LocationMessage {
  latitude: number;
  longitude: number;
  address?: string;
  staticMapUrl?: string;
}

interface MessageItemProps {
  item: {
    id: string;
    senderId: string;
    message: string | LocationMessage | any;
    contentType: string;
    avatarUrl?: string;
    userName?: string;
  };
  userID1: string;
  anotherUser?: any;
  theme: {
    colors: {
      text: string;
      primary: string;
      card: string;
      background: string;
    };
  };
  showDate: boolean;
  stringDate: string;
  isDeleted: boolean;
  isRecalled: boolean;
  isFile: boolean;
  messageTime: string;
  isGroupChat?: boolean;
}

const MessageItem = ({
  item,
  userID1,
  anotherUser,
  theme,
  showDate,
  stringDate,
  isDeleted,
  isRecalled,
  isFile,
  messageTime,
}: // ...các hàm handle
MessageItemProps) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const isSender = item.senderId === userID1;
  const isLocation = item.contentType === "location";

  const openDialog = () => {
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
  };

  // Ví dụ: Xử lý cho mỗi lựa chọn trong dialog
  const handleCopy = () => {
    closeDialog();
    console.log("Copy tin nhắn:", item.message);
  };
  const handlePin = () => {
    closeDialog();
    console.log("Ghim tin nhắn:", item.message);
  };
  const handleMark = () => {
    closeDialog();
    console.log("Đánh dấu tin nhắn:", item.message);
  };
  const handleMultiSelect = () => {
    closeDialog();
    console.log("Chọn nhiều tin nhắn:", item.message);
  };
  const handleDetails = () => {
    closeDialog();
    console.log("Xem chi tiết tin nhắn:", item.message);
  };
  const handleOther = () => {
    closeDialog();
    console.log("Các tùy chọn khác:", item.message);
  };

  const handleDeleteLocal = () => {
    closeDialog();
    try {
      console.log("handleDeleteLocal");
      const socket = getSocket();
      if (socket) {
        socket.emit("delete-message", item.id);
      } else {
        console.error("Socket is not connected");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      Alert.alert("Error", "Failed to delete message");
    }
  };

  const handleRecall = useCallback(async () => {
    closeDialog();
    try {
      connectSocket().then((socket) => {
        socket?.emit("recall-message", item.id);
      });
    } catch (error) {
      console.error("Error recalling message:", error);
      Alert.alert("Error", "Failed to recall message");
    }
  }, []);
  const handleLocationPress = () => {
    if (isLocation && isValidLocationMessage(item.message)) {
      const { latitude, longitude } = item.message;

      // Sử dụng OpenStreetMap thay vì Google Maps
      const url = Platform.select({
        ios: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`,
        android: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`,
        default: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`,
      });

      if (url) {
        Linking.openURL(url).catch((err) => {
          console.error("Error opening map link:", err);
          // Fallback for web or in case the primary method fails
          window.open(
            `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`,
            "_blank"
          );
        });
      }
    }
  };

  const isValidLocationMessage = (message: any): message is LocationMessage => {
    return (
      message &&
      typeof message === "object" &&
      typeof message.latitude === "number" &&
      typeof message.longitude === "number"
    );
  };

  useEffect(() => {
    connectSocket();
  }, []);
  return item && item.contentType == "notification" ? (
    <>
      <Text
        style={{
          color: isSender ? "#FFF" : theme.colors.text,
          margin: 20,
          textAlign: "center",
        }}
      >
        {item.message}
      </Text>
    </>
  ) : (
    <View>
      {showDate && (
        <Text style={{ textAlign: "center", color: theme.colors.text }}>
          {stringDate}
        </Text>
      )}

      <View
        style={[
          styles.messageWrapper,
          isSender ? styles.sentWrapper : styles.receivedWrapper,
        ]}
      >
        {/* Avatar + nội dung tin nhắn */}
        {!isSender && item && (
          <Image
            source={{
              uri:
                item.avatarUrl ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            }}
            style={styles.avatar}
          />
        )}

        <TouchableOpacity
          onLongPress={() => {
            if (!isDeleted && !isRecalled) openDialog();
          }}
          activeOpacity={0.8}
          style={styles.bubbleContainer}
        >
          {!isSender && item && (
            <Text style={styles.senderName}>{item.userName}</Text>
          )}
          <View
            style={[
              styles.messageBubble,
              {
                backgroundColor: isSender
                  ? theme.colors.primary
                  : theme.colors.card,
                opacity: isDeleted || isRecalled ? 0.7 : 1,
              },
            ]}
          >
            {isFile ? (
              <FileMessage
                item={item as any}
                theme={theme}
                userID1={userID1}
                onLongPress={openDialog}
              />
            ) : isLocation && isValidLocationMessage(item.message) ? (
              <TouchableOpacity
                onPress={handleLocationPress}
                style={styles.locationTouchable}
                activeOpacity={0.7}
              >
                <View style={styles.locationContainer}>
                  {(item.message as LocationMessage).staticMapUrl && (
                    <View style={styles.mapImageContainer}>
                      <Image
                        source={{
                          uri: (item.message as LocationMessage).staticMapUrl,
                        }}
                        style={styles.staticMapImage}
                      />
                      <View style={[styles.mapOverlay, { opacity: 0.8 }]}>
                        <MaterialIcons
                          name="open-in-new"
                          size={22}
                          color="#ffffff"
                        />
                        <Text style={styles.viewMapText}>Xem bản đồ</Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.locationContent}>
                    <MaterialIcons
                      name="location-pin"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={{ flex: 1, paddingHorizontal: 8 }}>
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: isSender ? "#ffffff" : theme.colors.text,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        Vị trí đã chia sẻ
                      </Text>
                      <Text
                        style={[
                          { fontSize: 14, marginTop: 2 },
                          { color: isSender ? "#f0f0f0" : "#666666" },
                        ]}
                        numberOfLines={2}
                      >
                        {(item.message as LocationMessage).address ||
                          ((item.message as LocationMessage).latitude &&
                          (item.message as LocationMessage).longitude
                            ? `${(
                                item.message as LocationMessage
                              ).latitude.toFixed(6)}, ${(
                                item.message as LocationMessage
                              ).longitude.toFixed(6)}`
                            : "Vị trí được chia sẻ")}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: isSender ? "#FFF" : theme.colors.text }}>
                {typeof item.message === "string"
                  ? item.message
                  : JSON.stringify(item.message)}
              </Text>
            )}
            <Text
              style={[
                styles.messageTime,
                { color: isSender ? "#FFF" : theme.colors.text },
              ]}
            >
              {messageTime}
            </Text>
          </View>
        </TouchableOpacity>

        {isSender && <View style={{ width: 32, height: 32 }} />}
      </View>

      <ContextMenuDialog
        visible={dialogVisible}
        onDismiss={closeDialog}
        onCopy={handleCopy}
        onPin={handlePin}
        onMark={handleMark}
        onMultiSelect={handleMultiSelect}
        onDetails={handleDetails}
        onOther={handleOther}
        onDeleteLocal={handleDeleteLocal}
        onRecall={isSender ? handleRecall : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 6,
    paddingHorizontal: 10,
  },
  sentMessageContainer: {
    justifyContent: "flex-end",
  },
  receivedMessageContainer: {
    justifyContent: "flex-start",
  },
  messageWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginVertical: 6,
  },

  sentWrapper: {
    justifyContent: "flex-end",
  },

  receivedWrapper: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 6,
    marginTop: 4,
  },

  bubbleContainer: {
    flexShrink: 1,
    maxWidth: "80%",
  },

  senderName: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },

  messageBubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 4,
    width: 240,
  },
  locationContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    width: "100%",
  },
  staticMapImage: {
    width: 240,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  messageTime: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  locationTouchable: {
    borderRadius: 10,
    overflow: "hidden",
  },
  mapImageContainer: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  viewMapText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});

export default MessageItem;
