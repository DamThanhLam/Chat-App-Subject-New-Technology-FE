import { Link, Stack } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAppTheme } from "@/src/theme/theme";

export default function NotFoundScreen() {
  const { theme } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ThemedView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ThemedText type="title" style={{ color: theme.colors.text }}>
          This screen doesn't exist.
        </ThemedText>
        <Link href="/" asChild>
          <TouchableOpacity
            style={[styles.link, { backgroundColor: theme.colors.primary }]}
          >
            <ThemedText type="link" style={{ color: theme.colors.background }}>
              Go to home screen!
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
