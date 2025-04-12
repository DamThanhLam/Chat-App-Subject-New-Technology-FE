// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Auth } from "aws-amplify";
import { updateUser } from "@/src/redux/slices/UserSlice";
import * as ImagePicker from 'expo-image-picker';
import { DOMAIN } from "@/src/configs/base_url";

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null); // lưu avatar ban đầu
  const [token, setToken] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    dob: "",
    gender: "",
    phone: "",
    email: "",
  });

  const [editable, setEditable] = useState({
    name: false,
    dob: false,
    gender: false,
    phone: false,
    email: false,
  });

  const [loading, setLoading] = useState(false);

  // Lấy token khi mount
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

  // Gọi API khi token đã có và user.id tồn tại
  useEffect(() => {
    if (!token || !user.id) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(DOMAIN+`:3000/api/user`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        dispatch(updateUser({ ...data }));
      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, [token, user.id]);

  // Khi mount, set giá trị ban đầu từ redux và lưu avatar ban đầu
  useEffect(() => {
    setForm({
      name: user.name || "",
      dob: user.dob || "",
      gender: user.gender || "",
      phone: user.phoneNumber || "",
      email: user.email || "",
    });
    setAvatarUrl(user.avatarUrl || null);
    setOriginalAvatar(user.avatarUrl || null); // lưu avatar ban đầu
  }, [user]);

  const toggleEdit = (field: keyof typeof editable) => {
    setEditable((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    // Reset lại các thông tin profile
    setForm({
      name: user.name || "",
      dob: user.dob || "",
      gender: user.gender || "",
      phone: user.phoneNumber || "",
      email: user.email || "",
    });
    setEditable({
      name: false,
      dob: false,
      gender: false,
      phone: false,
      email: false,
    });
    // Reset avatar về giá trị ban đầu
    setAvatarUrl(originalAvatar);
  };

  const pickAvatar = async () => {
    // Yêu cầu quyền truy cập thư viện ảnh
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Bạn cần cấp quyền truy cập ảnh để thay đổi avatar");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
      base64: false,
    });
    console.log(result)
    // Nếu người dùng không hủy việc chọn ảnh
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Lấy ảnh đầu tiên từ mảng assets
      const asset = result.assets[0];
      // Cập nhật uri của ảnh vào state
      setAvatarUrl(asset.uri);
    }
  };
  const handleSave = async () => {
    setLoading(true);
    try {
      let newAvatarUrl = avatarUrl; // sử dụng biến này để cập nhật profile

      // Nếu URL avatar thay đổi, upload ảnh mới
      if (avatarUrl && avatarUrl !== originalAvatar) {
        // Chuyển đổi data URI thành Blob
        const response = await fetch(avatarUrl);
        const blob = await response.blob();

        const formData = new FormData();
        // Khi sử dụng Blob, bạn có thể truyền tên file ở tham số thứ ba
        formData.append("image", blob, `avatar_${user.id}.jpg`);

        const uploadResp = await fetch(
          `${DOMAIN}:3000/api/user/avatar`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              // Không cần set "Content-Type"
            },
            body: formData,
          }
        );
        if (!uploadResp.ok) throw new Error("Avatar upload failed");
        const { avatar } = await uploadResp.json();

        // Gán URL mới trả về từ server
        newAvatarUrl = avatar;
      }

      // Gửi PUT cập nhật profile với avatar URL mới
      const resp = await fetch(`${DOMAIN}:3000/api/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, avatarUrl: newAvatarUrl }),
      });
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const updated = await resp.json();
      dispatch(updateUser(updated.user));
      Alert.alert("Success", "Cập nhật thông tin thành công");
      setEditable({ name: false, dob: false, gender: false, phone: false, email: false });
      // Sau khi lưu thành công, cập nhật lại giá trị avatar gốc
      setOriginalAvatar(newAvatarUrl);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Không thể cập nhật, thử lại sau");
    } finally {
      setLoading(false);
    }
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
            <Image
              source={{ uri: avatarUrl || "https://cdn-icons-png.flaticon.com/512/219/219983.png" }}
              style={styles.avatar}
            />
            <View style={styles.editOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Thông tin cá nhân */}
          <View style={styles.infoContainer}>
            {(["name", "dob", "gender", "phone", "email"] as Array<keyof typeof form>).map(field => (
              <ProfileItem
                key={field}
                label={
                  field === "name"
                    ? "Full name"
                    : field === "dob"
                      ? "Birth day"
                      : field === "phone"
                        ? "Phone number"
                        : field === "email"
                          ? "Email"
                          : "Gender"
                }
                value={form[field]}
                onChange={val => handleChange(field, val)}
                isEditable={editable[field] && !loading}
                onEdit={() => toggleEdit(field)}
                theme={theme}
              />
            ))}
          </View>

          {/* Nút hành động */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: "red" }]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ProfileItem = ({
  label,
  value,
  onChange,
  isEditable,
  onEdit,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isEditable: boolean;
  onEdit: () => void;
  theme: typeof DarkTheme | typeof DefaultTheme;
}) => (
  <View style={styles.itemContainer}>
    <Text style={[styles.itemLabel, { color: theme.colors.text }]}>{label} :</Text>
    <TextInput
      style={[
        styles.itemValue,
        {
          color: theme.colors.text,
          borderBottomColor: theme.colors.border,
          backgroundColor: isEditable ? theme.colors.card : "transparent",
        },
      ]}
      value={value}
      onChangeText={onChange}
      editable={isEditable}
    />
    <TouchableOpacity onPress={onEdit}>
      <Ionicons name="pencil" size={18} color={theme.colors.text} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  avatarContainer: { alignItems: "center", marginVertical: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  infoContainer: { marginHorizontal: 20, marginBottom: 20 },
  itemContainer: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  itemLabel: { flex: 1, fontSize: 14, fontWeight: "bold" },
  itemValue: { flex: 4, fontSize: 14, borderBottomWidth: 1, paddingBottom: 5 },
  buttonContainer: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  resetButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, marginRight: 10 },
  resetText: { color: "white", fontSize: 16, fontWeight: "bold" },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  saveText: { color: "white", fontSize: 16, fontWeight: "bold" },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0008",
    padding: 6,
    borderRadius: 12,
  },
});

export default ProfileScreen;
