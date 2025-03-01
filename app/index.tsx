import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

const Index = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      {/* Biểu tượng tin nhắn */}
      <Image
        source={{ uri: "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" }}
        style={styles.logo}
      />
      {/* Nút Login */}
      <TouchableOpacity
        style={[styles.button, styles.loginButton]}
        onPress={() => navigation.navigate("auth",{screen:"login"})}
      >
        <Text style={styles.loginText}>Log in</Text>
      </TouchableOpacity>
      {/* Nút Create Account */}
      <TouchableOpacity
        style={[styles.button, styles.createButton]}
        onPress={() => navigation.navigate("auth",{screen:"register"})}
      >
        <Text style={styles.createText}>Create new account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Index;




const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 200,
  },
  button: {
    width: "80%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  loginButton: {
    backgroundColor: "blue",
  },
  loginText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "gray",
  },
  createText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
