import * as MediaLibrary from 'expo-media-library';
import React, { useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    Modal,
    StyleSheet,
    Linking
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from "expo-file-system";

// Định nghĩa interface DeviceFile
interface DeviceFile {
    name: string;
    size: number;
    uri: string;
    lastModified: number;
}

const FilePickerModal = ({
    visible,
    onClose,
    onFileSelected
}: {
    visible: boolean;
    onClose: () => void;
    onFileSelected: (files: DeviceFile[]) => void;
}) => {
    // Hàm yêu cầu quyền truy cập thư viện ảnh
    const requestMediaLibraryPermission = async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                "Quyền truy cập thư viện ảnh",
                "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh. Bạn có muốn mở cài đặt hệ thống để cấp quyền không?",
                [
                    { text: "Hủy", style: "cancel" },
                    { text: "Mở cài đặt", onPress: () => Linking.openSettings() }
                ]
            );
            return false;
        }
        return true;
    };

    // Hàm mở thư viện ảnh với hỗ trợ chọn nhiều file
    const openImageLibrary = async () => {
        try {
            const hasPermission = await requestMediaLibraryPermission();
            if (!hasPermission) return;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (result.canceled) {
                console.log("Người dùng đã hủy chọn ảnh.");
                return;
            }

            if (result.assets && result.assets.length > 0) {
                const files: DeviceFile[] = result.assets.map(asset => {
                    const fileName = asset.uri.substring(asset.uri.lastIndexOf('/') + 1);
                    return {
                        name: fileName,
                        size: 0,
                        uri: asset.uri,
                        lastModified: Date.now(),
                    };
                });
                onFileSelected(files);
            }
        } catch (error) {
            console.error("Lỗi khi mở thư viện ảnh:", error);
            Alert.alert("Lỗi", "Không thể mở thư viện ảnh. Vui lòng thử lại.");
        } finally {
            onClose();
        }
    };

    // Hàm mở File Storage (Document Picker) với hỗ trợ chọn nhiều file nếu có thể
    const openFileStorage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: true, // Android: chọn nhiều, iOS: chọn 1
            });

            console.log("Kết quả chọn file:", result);

            let files: DeviceFile[] = [];


            // Vì API trả về object (kể cả khi chọn nhiều file), cần xử lý khác
            if (!result.canceled) {

                const processedFiles: DeviceFile[] = await Promise.all(
                    result.assets.map(async (item) => {
                      return {
                        name: item.name || 'Unknown',
                        size: item.size , // ép chắc chắn thành number
                        uri: item.uri,
                        lastModified: item.lastModified, // ép chắc chắn thành number
                      } as DeviceFile;
                    })
                  );
                  
                  onFileSelected(processedFiles);
                  
            } else {
                console.log("Người dùng hủy bỏ việc chọn file.");
            }


        } catch (error) {
            console.error("Lỗi mở File Storage:", error);
            Alert.alert("Lỗi", "Không thể mở File Storage. Vui lòng thử lại.");
        } finally {
            onClose();
        }
    };

    useEffect(() => {
        (async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Thông báo', 'Bạn cần cấp quyền để truy cập ảnh và video!');
            } else {
                console.log('Đã được cấp quyền truy cập media library');
            }
        })();
    }, []);
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Chọn nguồn file</Text>
                    <TouchableOpacity style={styles.optionButton} onPress={openImageLibrary}>
                        <Text style={styles.optionText}>Thư viện ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.optionButton} onPress={openFileStorage}>
                        <Text style={styles.optionText}>Lưu trữ file</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.optionButton, { backgroundColor: "#ccc" }]} onPress={onClose}>
                        <Text style={styles.optionText}>Đóng</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default FilePickerModal;

// Styles
const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: 250,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 20,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 15,
    },
    optionButton: {
        width: "100%",
        padding: 15,
        marginVertical: 5,
        backgroundColor: "#4a90e2",
        borderRadius: 5,
        alignItems: "center",
    },
    optionText: {
        color: "#fff",
        fontSize: 16,
    },
});