import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";

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

  const convertTimeToMinutes = (time) => {
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
  
  const sortRequests = (type) => {
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
  

  const FriendRequestItem = ({ name, time, avatar }) => (
    <View style={styles.requestContainer}>
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton}>
            <Text style={styles.buttonTextAccept}>Xác nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton}>
            <Text style={styles.buttonTextDelete}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lời mời kết bạn ({friendRequests.length})</Text>
        <TouchableOpacity onPress={() => setSortModalVisible(true)}>
          <Text style={styles.sortText}>Sắp xếp</Text>
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
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Sắp xếp theo</Text>
            <TouchableOpacity onPress={() => sortRequests("time")}>
              <Text style={styles.modalOption}>Mới nhất</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sortRequests("nameAsc")}>
              <Text style={styles.modalOption}>Tên A → Z</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sortRequests("nameDesc")}>
              <Text style={styles.modalOption}>Tên Z → A</Text>
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
    backgroundColor: "#fff",
    padding: 16,
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
    color: "blue",
    fontSize: 16,
    fontWeight: "bold",
  },
  requestContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "#D3D3D3",
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
    color: "#B2B2B2",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 6,
  },
  acceptButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 5,
    minWidth: 125,
    minHeight: 29,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#B2B2B2",
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
    color: "#000",
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
    backgroundColor: "#fff",
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
    color: "blue",
  },
});

export default FriendRequestsScreen;
