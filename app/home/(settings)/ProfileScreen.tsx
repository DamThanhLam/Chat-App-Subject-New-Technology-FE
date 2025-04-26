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
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);
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

  useEffect(() => {
    setForm({
      name: user.name || "",
      dob: user.dob || "",
      gender: user.gender || "",
      phone: user.phoneNumber || "",
      email: user.email || "",
    });
    setAvatarUrl(user.avatarUrl || null);
    setOriginalAvatar(user.avatarUrl || null);
  }, [user]);

  const toggleEdit = (field: keyof typeof editable) => {
    setEditable((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
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
    setAvatarUrl(originalAvatar);
  };

  const pickAvatar = async () => {
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
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarUrl(asset.uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (avatarUrl && avatarUrl !== originalAvatar) {
        const response = await fetch(avatarUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("image", blob, `avatar_${user.id}.jpg`);
        const uploadResp = await fetch(
          `${DOMAIN}:3000/api/user/avatar`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );
        if (!uploadResp.ok) throw new Error("Avatar upload failed");
        const { avatar } = await uploadResp.json();
        newAvatarUrl = avatar;
      }
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
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
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
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.7}>
            <Image
              source={{ uri: avatarUrl || "https://cdn-icons-png.flaticon.com/512/219/219983.png" }}
              style={styles.avatar}
            />
            <View style={[styles.editOverlay, { backgroundColor: theme.colors.primary + "80" }]}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Thông tin cá nhân */}
          <View style={styles.infoContainer}>
            {(["name", "dob", "gender", "phone", "email"] as Array<keyof typeof form>).map((field, index) => (
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
                onChange={(val) => handleChange(field, val)}
                isEditable={editable[field] && !loading}
                onEdit={() => toggleEdit(field)}
                theme={theme}
                isLast={index === 4} // Đánh dấu item cuối để bỏ divider
              />
            ))}
          </View>

          {/* Nút hành động */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: "#FF4D4D" }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetText, { color: "#FF4D4D" }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.7}
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
  isLast,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isEditable: boolean;
  onEdit: () => void;
  theme: typeof DarkTheme | typeof DefaultTheme;
  isLast?: boolean;
}) => (
  <View style={[styles.itemContainer, !isLast && { borderBottomColor: theme.colors.border }]}>
    <Text style={[styles.itemLabel, { color: theme.colors.text }]}>{label}</Text>
    <TextInput
      style={[
        styles.itemValue,
        {
          color: theme.colors.text,
          backgroundColor: isEditable ? theme.colors.card : "transparent",
        },
      ]}
      value={value}
      onChangeText={onChange}
      editable={isEditable}
    />
    <TouchableOpacity onPress={onEdit} style={styles.editButton}>
      <Ionicons name="pencil" size={20} color={theme.colors.text} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  // ScrollView
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  // Avatar
  avatarContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 8,
    borderRadius: 16,
  },
  // Thông tin cá nhân
  infoContainer: {
    backgroundColor: "transparent",
    borderRadius: 12,
    marginBottom: 20,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  itemValue: {
    flex: 2,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButton: {
    padding: 8,
  },
  // Nút hành động
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 16,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;