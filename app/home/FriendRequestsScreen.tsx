// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

const FriendRequestsScreen = () => {
  const [friendRequests, setFriendRequests] = useState([
    { id: "1", name: "John Doe", time: "1 phút", avatar: "https://i.pravatar.cc/100?img=1" },
    { id: "2", name: "Jane Smith", time: "10 phút", avatar: "https://i.pravatar.cc/100?img=2" },
    { id: "3", name: "David Johnson", time: "1 tiếng", avatar: "https://i.pravatar.cc/100?img=3" },
    { id: "4", name: "Emily Brown", time: "2 tiếng", avatar: "https://i.pravatar.cc/100?img=4" },
    { id: "5", name: "Michael Lee", time: "1 ngày", avatar: "https://i.pravatar.cc/100?img=5" },
    { id: "6", name: "Sarah Wilson", time: "2 ngày", avatar: "https://i.pravatar.cc/100?img=6" },
    { id: "7", name: "Chris Evans", time: "1 tuần", avatar: "https://i.pravatar.cc/100?img=7" },
    { id: "8", name: "Robert Downey", time: "1 tháng", avatar: "https://i.pravatar.cc/100?img=8" },
    { id: "9", name: "Tuan", time: "5 tháng", avatar: "https://i.pravatar.cc/100?img=9" },
    { id: "10", name: "Luc", time: "5 tháng", avatar: "https://i.pravatar.cc/100?img=10" },
  ]);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const convertTimeToMinutes = (time: any) => {
    const parts = time.split(" ");
    const value = parseInt(parts[0]);
    const unit = parts[1];

    if (unit.includes("phút")) return value;
    if (unit.includes("tiếng")) return value * 60;
    if (unit.includes("ngày")) return value * 1440;
    if (unit.includes("tuần")) return value * 10080;
    if (unit.includes("tháng")) return value * 43200;

    return Number.MAX_SAFE_INTEGER; // Nếu không xác định được, cho về giá trị rất lớn
  };

  const sortRequests = (type: any) => {
    let sortedList = [...friendRequests];

    if (type === "time") {
      sortedList.sort((a, b) => convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time));
    } else if (type === "nameAsc") {
      sortedList.sort((a, b) => a.name.localeCompare(b.name));
    } else if (type === "nameDesc") {
      sortedList.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFriendRequests(sortedList);
    setSortModalVisible(false);
  };

  const FriendRequestItem = ({ name, time, avatar }: any) => (
    <View style={[styles.requestContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{name}</Text>
          <Text style={[styles.time, { color: theme.colors.text, opacity: 0.7 }]}>{time}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.buttonTextAccept}>Xác nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.colors.border }]}>
            <Text style={[styles.buttonTextDelete, { color: theme.colors.text }]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Lời mời kết bạn ({friendRequests.length})
        </Text>
        <TouchableOpacity onPress={() => setSortModalVisible(true)}>
          <Text style={[styles.sortText, { color: theme.colors.primary }]}>Sắp xếp</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={friendRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FriendRequestItem {...item} />}
      />

      {/* Modal sắp xếp */}
      <Modal
        visible={sortModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sắp xếp theo</Text>
            <TouchableOpacity onPress={() => sortRequests("time")}>
              <Text style={[styles.modalOption, { color: theme.colors.primary }]}>Mới nhất</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sortRequests("nameAsc")}>
              <Text style={[styles.modalOption, { color: theme.colors.primary }]}>Tên A → Z</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sortRequests("nameDesc")}>
              <Text style={[styles.modalOption, { color: theme.colors.primary }]}>Tên Z → A</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sortText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  requestContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderBottomWidth: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  textContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  time: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 6,
  },
  acceptButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 5,
    minWidth: 125,
    minHeight: 29,
    alignItems: "center",
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 125,
    minHeight: 29,
    alignItems: "center",
    marginLeft: "auto", // Đẩy nút Xóa về bên phải
  },
  buttonTextAccept: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonTextDelete: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: 300,
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalOption: {
    fontSize: 16,
    paddingVertical: 8,
  },
});

export default FriendRequestsScreen;