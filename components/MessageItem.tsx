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
import FileMessage from "./FileMessage"; // file dummy hoặc thực
import { connectSocket, getSocket } from "@/src/socket/socket";

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

    const handleDeleteLocal =  () => {
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
            getSocket().emit("recall-message", item.id);
        } catch (error) {
            console.error("Error recalling message:", error);
            Alert.alert("Error", "Failed to recall message");
        }
    }, []);
    useEffect(()=>{
        connectSocket()
    },[])
    return (
        <>
            {showDate && (
                <Text style={{ textAlign: "center", color: theme.colors.text }}>
                    {stringDate}
                </Text>
            )}

            <TouchableOpacity
                onLongPress={() => {
                    // Nếu tin nhắn chưa bị thu hồi, xóa,... thì mở dialog
                    if (!isDeleted && !isRecalled) {
                        openDialog();
                    }
                }}
                style={[
                    styles.messageContainer,
                    isSender ? styles.sentMessageContainer : styles.receivedMessageContainer,
                ]}
            >
                {/* Avatar bên trái nếu người gửi không phải là bạn */}
                {!isSender && anotherUser && (
                    <Image source={{ uri: anotherUser.image }} style={styles.avatar} />
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
                    {/* Nội dung tin nhắn */}
                    {isFile ? (
                        <FileMessage item={item} theme={theme} userID1={userID1} onLongPress={openDialog} />
                    ) : (
                        <Text style={{ color: isSender ? "#FFF" : theme.colors.text }}>
                            {item.message}
                        </Text>
                    )}

                    {/* Thời gian */}
                    <Text style={{ fontSize: 11, color: isSender ? "#FFF" : theme.colors.text }}>
                        {messageTime}
                    </Text>
                </View>

                {/* Nếu là bạn, avatar placeholder */}
                {isSender && <View style={{ width: 32, height: 32 }} />}
            </TouchableOpacity>

            {/* Dialog hiển thị menu tùy chọn */}
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
        </>
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
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    messageBubble: {
        maxWidth: "75%",
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 8,
    },
});

export default MessageItem;
