import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../authentication/Root";

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, "profile">;

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [name, setName] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const [editableFields, setEditableFields] = useState({
    name: false,
    dob: false,
    gender: false,
    phone: false,
    email: false,
  });

  const toggleEdit = (field: keyof typeof editableFields) => {
    setEditableFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const resetData = () => {
    setName("");
    setDob("");
    setGender("");
    setPhone("");
    setEmail("");
    setEditableFields({
      name: false,
      dob: false,
      gender: false,
      phone: false,
      email: false,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
          }}
          style={styles.avatar}
        />
      </View>

      <View style={styles.infoContainer}>
        <ProfileItem
          label="Full name"
          value={name}
          onChange={setName}
          isEditable={editableFields.name}
          onEdit={() => toggleEdit("name")}
        />
        <ProfileItem
          label="Birth day"
          value={dob}
          onChange={setDob}
          isEditable={editableFields.dob}
          onEdit={() => toggleEdit("dob")}
        />
        <ProfileItem
          label="Gender"
          value={gender}
          onChange={setGender}
          isEditable={editableFields.gender}
          onEdit={() => toggleEdit("gender")}
        />
        <ProfileItem
          label="Phone number"
          value={phone}
          onChange={setPhone}
          isEditable={editableFields.phone}
          onEdit={() => toggleEdit("phone")}
        />
        <ProfileItem
          label="Email"
          value={email}
          onChange={setEmail}
          isEditable={editableFields.email}
          onEdit={() => toggleEdit("email")}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.resetButton} onPress={resetData}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

type ProfileItemProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  isEditable: boolean;
  onEdit: () => void;
};

const ProfileItem: React.FC<ProfileItemProps> = ({
  label,
  value,
  onChange,
  isEditable,
  onEdit,
}) => {
  return (
    <View style={styles.itemContainer}>
      <Text style={styles.itemLabel}>{label} :</Text>
      <TextInput
        style={styles.itemValue}
        value={value}
        onChangeText={onChange}
        editable={isEditable}
      />
      <TouchableOpacity onPress={onEdit}>
        <Ionicons name="pencil" size={18} color="black" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    padding: 15,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  infoContainer: {
    marginHorizontal: 20,
    marginTop: 15,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 10,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  itemValue: {
    flex: 4,
    fontSize: 14,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  resetButton: {
    backgroundColor: "red",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 10,
  },
  resetText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  saveText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ProfileScreen;
