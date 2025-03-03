import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../authentication/Root";

type SettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "settings"
>;

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [searchText, setSearchText] = useState("");

  const settingsOptions = [
    {
      id: "1",
      name: "Profile",
      icon: "person",
      screen: "profile",
      image: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
    },
    {
      id: "2",
      name: "Change Password",
      icon: "key",
      screen: "change-password",
      image: "https://cdn-icons-png.flaticon.com/512/565/565547.png",
    },
  ];

  const filteredOptions = settingsOptions.filter((option) =>
    option.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchText}
          onChangeText={setSearchText}
        />
        <Ionicons
          name="search"
          size={20}
          color="black"
          style={styles.searchIcon}
        />
      </View>

      <FlatList
        data={filteredOptions}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate(item.screen as keyof RootStackParamList)
            }
          >
            <Image source={{ uri: item.image }} style={styles.icon} />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  searchIcon: {
    marginLeft: 10,
  },
  listContainer: {
    alignItems: "center",
  },
  card: {
    width: 130,
    height: 130,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default SettingsScreen;
