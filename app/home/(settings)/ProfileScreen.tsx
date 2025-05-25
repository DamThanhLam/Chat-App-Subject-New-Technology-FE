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
  useWindowDimensions,
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
import * as FileSystem from "expo-file-system";
import { showError } from "@/src/utils/announce";

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const { width } = useWindowDimensions();

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
        const res = await fetch(DOMAIN + `:3000/api/user`, {
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
      let newAvatarUrl = avatarUrl; // mặc định

      if (avatarUrl && avatarUrl !== originalAvatar) {
        const formData = new FormData();

        if (Platform.OS === "web") {
          // Xử lý cho web
          const response = await fetch(avatarUrl);
          const blob = await response.blob();
          formData.append("image", blob, `avatar_${user.id}.jpg`);
        } else {
          // Xử lý cho mobile
          const fileInfo = await FileSystem.getInfoAsync(avatarUrl);
          if (!fileInfo.exists) throw new Error("File not found");

          formData.append("image", {
            uri: avatarUrl,
            name: `avatar_${user.id}.jpg`,
            type: "image/jpeg", // hoặc dựa theo asset.mimeType
          });
        }

        const uploadResp = await fetch(`${DOMAIN}:3000/api/user/avatar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(Platform.OS === "web" ? {} : { "Content-Type": "multipart/form-data" }), // Web không cần Content-Type
          },
          body: formData,
        });
        if (!uploadResp.ok) {
          throw new Error(await uploadResp.json());
        }
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
      showError(err)
    } finally {
      setLoading(false);
    }
  };

  const isLargeScreen = width >= 768;
  const isSmallScreen = width <= 320;

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
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingHorizontal: isLargeScreen ? width * 0.15 : 16,
              paddingTop: isLargeScreen ? 30 : 20
            }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={pickAvatar}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: avatarUrl || "https://cdn-icons-png.flaticon.com/512/219/219983.png" }}
                style={[
                  styles.avatar,
                  {
                    width: isLargeScreen ? 150 : 100,
                    height: isLargeScreen ? 150 : 100,
                  }
                ]}
              />
              <View style={[styles.editOverlay, { backgroundColor: theme.colors.primary + "80" }]}>
                <Ionicons
                  name="camera"
                  size={isLargeScreen ? 24 : 20}
                  color="#fff"
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={[
            styles.infoContainer,
            {
              backgroundColor: theme.colors.card,
              padding: isLargeScreen ? 24 : 16,
              borderRadius: 16,
              elevation: 2,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }
          ]}>
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
                isEditable={field === "phone" || field === "email" ? false : editable[field] && !loading}
                onEdit={() => toggleEdit(field)}
                theme={theme}
                showEditIcon={field !== "phone" && field !== "email"}
                isLargeScreen={isLargeScreen}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={[
            styles.buttonContainer,
            {
              marginTop: isLargeScreen ? 30 : 20,
              paddingHorizontal: isLargeScreen ? width * 0.1 : 0,
              marginBottom: 50

            }
          ]}>
            <TouchableOpacity
              style={[
                styles.resetButton,
                {
                  borderColor: "#FF4D4D",
                  paddingVertical: isLargeScreen ? 16 : 12,
                }
              ]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetText, { color: "#FF4D4D" }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.colors.primary,
                  paddingVertical: isLargeScreen ? 16 : 12,
                }
              ]}
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
  showEditIcon = true,
  isLargeScreen,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isEditable: boolean;
  onEdit: () => void;
  theme: typeof DarkTheme | typeof DefaultTheme;
  showEditIcon?: boolean;
  isLargeScreen: boolean;
}) => (
  <View style={[
    styles.itemContainer,
    {
      borderBottomColor: theme.colors.border,
      paddingVertical: isLargeScreen ? 16 : 12,
    }
  ]}>
    <Text style={[
      styles.itemLabel,
      {
        color: theme.colors.text,
        fontSize: isLargeScreen ? 18 : 16,
      }
    ]}>
      {label}
    </Text>
    <TextInput
      style={[
        styles.itemValue,
        {
          color: theme.colors.text,
          backgroundColor: isEditable ? theme.colors.card : "transparent",
          fontSize: isLargeScreen ? 18 : 16,
          paddingVertical: isLargeScreen ? 10 : 8,
          paddingHorizontal: isLargeScreen ? 16 : 12,
        },
      ]}
      value={value}
      onChangeText={onChange}
      editable={isEditable}
    />
    {showEditIcon && (
      <TouchableOpacity onPress={onEdit} style={styles.editButton}>
        <Ionicons
          name="pencil"
          size={isLargeScreen ? 22 : 18}
          color={theme.colors.text}
        />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
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
    fontSize: 20,
    fontWeight: "600",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#fff",
  },
  editOverlay: {
    position: "absolute",
    bottom: 5,
    right: 5,
    padding: 8,
    borderRadius: 20,
  },
  infoContainer: {
    width: "100%",
    marginBottom: 20,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  itemLabel: {
    flex: 1,
    fontWeight: "500",
  },
  itemValue: {
    flex: 2,
    borderRadius: 8,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  resetButton: {
    flex: 1,
    maxWidth: 200,
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
    maxWidth: 200,
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