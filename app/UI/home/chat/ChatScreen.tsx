import React, { useEffect, useLayoutEffect, useState } from "react";
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
} from "react-native";
import io from "socket.io-client";
import Button from "@/components/ui/Button";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

const SOCKET_SERVER = "http://10.0.2.2:8084";
const socket = io(SOCKET_SERVER);

interface Message {
  id: string;
  id_user1: string;
  id_user2: string;
  message: string;
  name: string;
  category: "send" | "receive";
}

const ChatScreen = ({ navigation }: any) => {
  const [userID1, setUserID1] = useState("");
  const [userID2, setUserID2] = useState("");
  const [anotherUser, setAnotherUser] = useState<{ _id: string; name: string; image: string } | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; message: string } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const normalizeCategory = (category: string): "send" | "receive" => {
    return category === "send" || category === "receive" ? category : "receive";
  };

  const selectUser = (user: { _id: string; name: string; image: string }) => {
    setUserID2(user._id);
    setAnotherUser(user);
  };

  const sendMessage = () => {
    if (!message || !userID2) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      id_user1: userID1,
      id_user2: userID2,
      message,
      name: "You",
      category: "send",
    };

    setConversation([...conversation, newMessage]);
    socket.emit("send_message", newMessage);
    setMessage("");
  };

  useEffect(() => {
    socket.on("receive_message", (data: any) => {
      const receivedMessage: Message = {
        id: data.id,
        id_user1: data.id_user1,
        id_user2: data.id_user2,
        message: data.message,
        name: data.name,
        category: normalizeCategory(data.category),
      };
      setConversation((prev) => [...prev, receivedMessage]);
      const getUserID = async () => {
        const id = await AsyncStorage.getItem("user_id");
        setUserID1(id || "");
      };
      getUserID();
    });

    return () => {
      socket.off("receive_message");
    };
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
  };

  const closeOptions = () => {
    setOptionsVisible(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => alert("Call")} style={styles.iconSpacing}>
            <FontAwesome name="phone" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert("Video")} style={styles.iconSpacing}>
            <FontAwesome name="video-camera" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={showOptions} style={styles.iconSpacing}>
            <FontAwesome name="list" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Chat Messages */}
      <FlatList
        data={conversation || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => handleLongPress(item)}
            style={[
              styles.messageContainer,
              item.category === "send" ? styles.sentMessage : styles.receivedMessage,
            ]}
          >
            {item.category === "receive" && <Image source={{ uri: anotherUser?.image }} style={styles.avatar} />}
            <View
              style={[
                styles.messageBubble,
                {
                  backgroundColor:
                    item.category === "send" ? theme.colors.primary : theme.colors.card,
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

      {/* Message Options Modal */}
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
              style={[styles.closeButton, { backgroundColor: theme.colors.border }]}
              onPress={closeMenu}
            >
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Input Container */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={() => alert("Add Emoji")} style={styles.iconSpacing}>
          <FontAwesome name="smile-o" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={theme.colors.text}
        />
        {message === "" ? (
          <>
            <TouchableOpacity onPress={showOptions} style={styles.iconSpacing}>
              <FontAwesome name="ellipsis-v" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => alert("Record")} style={styles.iconSpacing}>
              <FontAwesome name="microphone" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => alert("Add Image")} style={styles.iconSpacing}>
              <FontAwesome name="image" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </>
        ) : (
          <Button onPress={sendMessage}>Gửi</Button>
        )}
      </View>

      {/* Options Modal */}
      <Modal visible={optionsVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.optionsContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity style={styles.optionItem} onPress={() => alert("File")}>
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
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
});