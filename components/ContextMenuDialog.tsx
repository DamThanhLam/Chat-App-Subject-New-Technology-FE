import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Portal, Dialog, Text } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";

/**
 * Các props nhận vào:
 * - visible: boolean - kiểm soát dialog hiển thị
 * - onDismiss: () => void - đóng dialog
 * - onCopy: () => void
 * - onPin: () => void
 * - onMark: () => void
 * - onMultiSelect: () => void
 * - onDetails: () => void
 * - onOther: () => void
 * - onDeleteLocal: () => void
 * - onRecall: () => void  (tùy chọn, chỉ hiển thị nếu tin nhắn là của bạn)
 */
const ContextMenuDialog = ({
  visible,
  onDismiss,
  onCopy,
  onPin,
  onMark,
  onMultiSelect,
  onDetails,
  onOther,
  onDeleteLocal,
  onRecall,
}) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <View style={styles.menuContainer}>
          {/* Item: Copy tin nhắn */}
          {/* <TouchableOpacity style={styles.menuItem} onPress={onCopy}>
            <FontAwesome name="copy" size={16} style={styles.icon} />
            <Text style={styles.menuItemText}>Copy tin nhắn</Text>
          </TouchableOpacity> */}

          {/* Item: Ghim tin nhắn */}
          {/* <TouchableOpacity style={styles.menuItem} onPress={onPin}>
            <FontAwesome name="thumb-tack" size={16} style={styles.icon} />
            <Text style={styles.menuItemText}>Ghim tin nhắn</Text>
          </TouchableOpacity> */}

          {/* Item: Đánh dấu tin nhắn */}
          {/* <TouchableOpacity style={styles.menuItem} onPress={onMark}>
            <FontAwesome name="star" size={16} style={styles.icon} />
            <Text style={styles.menuItemText}>Đánh dấu tin nhắn</Text>
          </TouchableOpacity> */}

          {/* Item: Chọn nhiều tin nhắn */}
          {/* <TouchableOpacity style={styles.menuItem} onPress={onMultiSelect}>
            <FontAwesome name="check-square-o" size={16} style={styles.icon} />
            <Text style={styles.menuItemText}>Chọn nhiều tin nhắn</Text>
          </TouchableOpacity> */}

          {/* Item: Xem chi tiết */}
          {/* <TouchableOpacity style={styles.menuItem} onPress={onDetails}>
            <FontAwesome name="info-circle" size={16} style={styles.icon} />
            <Text style={styles.menuItemText}>Xem chi tiết</Text>
          </TouchableOpacity> */}

          {/* Item: Tùy chọn khác */}
          {/* <TouchableOpacity style={styles.menuItem} onPress={onOther}>
            <FontAwesome name="ellipsis-h" size={16} style={styles.icon} />
            <Text style={styles.menuItemText}>Tuỳ chọn khác</Text>
          </TouchableOpacity> */}

          {/* Đường kẻ phân cách */}
          {/* <View style={styles.separator} /> */}

          {/* Item: Xóa tin nhắn chỉ ở phía tôi */}
          <TouchableOpacity style={styles.menuItem} onPress={onDeleteLocal}>
            <FontAwesome name="trash" size={16} color="#E53935" style={styles.icon} />
            <Text style={[styles.menuItemText, { color: "#E53935" }]}>
              Xóa chỉ ở phía tôi
            </Text>
          </TouchableOpacity>

          {/* Nếu onRecall được truyền vào, hiển thị thêm mục thu hồi tin nhắn */}
          {onRecall && (
            <TouchableOpacity style={styles.menuItem} onPress={onRecall}>
              <FontAwesome name="undo" size={16} color="#E53935" style={styles.icon} />
              <Text style={[styles.menuItemText, { color: "#E53935" }]}>
                Thu hồi tin nhắn
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: "#2F2F2F", // Màu nền tối (giống ảnh)
    borderRadius: 8,
  },
  menuContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 15,
    color: "#FFFFFF", // màu chữ trắng
  },
  icon: {
    color: "#FFFFFF", // màu icon trắng
    marginRight: 10,
  },
  separator: {
    height: 1,
    backgroundColor: "#555",
    marginVertical: 4,
  },
});

export default ContextMenuDialog;
