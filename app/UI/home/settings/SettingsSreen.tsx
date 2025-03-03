import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export default function SettingsScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState("");
  const colorScheme = useColorScheme(); // Lấy chế độ sáng/tối
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

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
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.searchContainer, { borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, }]}
            placeholder="Search..."
            placeholderTextColor={theme.colors.text}
            value={searchText}
            onChangeText={setSearchText}
          />
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.text}
            style={styles.searchIcon}
          />
        </View>

        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.id}
          numColumns={1}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              {item.icon ? <Ionicons name={item.icon} size={24} color={theme.colors.text} /> : <Image source={{ uri: item.image }} style={[styles.icon,]} />}

              <Text style={[styles.cardText, { color: theme.colors.text }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
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
    // alignItems: "center",
  },
  card: {
    marginLeft:"5%",
    width: "90%",
    height: 50,
    borderRadius: 10,
    display:'flex',
    flexDirection:'row',
    alignItems:'center',
    paddingLeft:10,
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
    padding:10
  },
});