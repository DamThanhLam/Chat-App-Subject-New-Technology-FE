import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import ContextMenuDialog from "./ContextMenuDialog";
import { connectSocket, getSocket } from "@/src/socket/socket";
import FileMessage from "./FileMessage";

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
    // ...các hàm handle
}) => {
    const [dialogVisible, setDialogVisible] = useState(false);
    const isSender = item.senderId === userID1;

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
            console.log("handleDeleteLocal")
            getSocket().emit("delete-message", item.id);
        } catch (error) {
            console.error("Error deleting message:", error);
            Alert.alert("Error", "Failed to delete message");
        }
    };

    const handleRecall = useCallback(async () => {
        closeDialog();
        try {
            connectSocket().then(socket => {
                socket?.emit("recall-message", item.id);
            })
        } catch (error) {
            console.error("Error recalling message:", error);
            Alert.alert("Error", "Failed to recall message");
        }
    }, []);
    useEffect(() => {
        connectSocket()
    }, [])
    return (
        item && item.contentType == 'notification' ?
            <>
                <Text style={{ color: isSender ? "#FFF" : theme.colors.text, margin:20, textAlign:'center' }}>
                    {item.message}
                </Text>
            </>
            :
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
                        <Image source={{ uri: item.avatarUrl||"https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }} style={styles.avatar} />
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
                                    backgroundColor: isSender ? theme.colors.primary : theme.colors.card,
                                    opacity: isDeleted || isRecalled ? 0.7 : 1,
                                },
                            ]}
                        >
                            {isFile ? (
                                <FileMessage item={item} theme={theme} userID1={userID1} onLongPress={openDialog} />
                            ) : (
                                <Text style={{ color: isSender ? "#FFF" : theme.colors.text }}>
                                    {item.message}
                                </Text>
                            )}
                            <Text style={[styles.messageTime, { color: isSender ? "#FFF" : theme.colors.text }]}>
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

    messageTime: {
        fontSize: 11,
        textAlign: "right",
        marginTop: 4,
    },

});

export default MessageItem;
