import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';

interface Message {
  id: string;
  conversationId: string | null;
  senderId: string;
  message: FileMessage;
  createdAt: string;
  updatedAt: string;
  readed: string[];
  messageType: 'group' | 'private';
  contentType: 'file' | 'emoji' | 'text';
  receiverId: string;
  status: 'recall' | 'delete' | 'readed' | 'sended' | 'received';
}

interface FileMessage {
  data: string; // URL
  filename: string;
  size: number;
  type: string;
}

interface FileMessageProps {
  item: Message;
  userID1: string;
  theme: {
    colors: {
      text: string;
    };
  };
  onLongPress: any;
}

// Helpers
const isImage = (filename: string) => /\.(jpeg|jpg|gif|png)$/i.test(filename);
const isVideo = (filename: string) => /\.(mp4|mov|avi)$/i.test(filename);
const isDocument = (filename: string) => /\.(pdf|docx|xlsx|pptx)$/i.test(filename);

const FileMessage: React.FC<FileMessageProps> = ({ item, userID1, theme,onLongPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [viewingVideo, setViewingVideo] = useState(false);
  const file = item.message;

  const openFile = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web: Tải trực tiếp
        const link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Mobile: Mở trình duyệt để tải file
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      console.error('Lỗi khi mở file:', err);
    }
  };

  const handlePress = () => {
    if (isImage(file.filename)) {
      setViewingVideo(false);
      setModalVisible(true);
    } else if (isVideo(file.filename)) {
      setViewingVideo(true);
      setModalVisible(true);
    } else {
      openFile(file.data);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.fileContainer} onPress={handlePress} onLongPress={onLongPress}>
        {isImage(file.filename) ? (
          <Image source={{ uri: file.data }} style={styles.imagePreview} resizeMode="cover" />
        ) : isVideo(file.filename) ? (
          <FontAwesome name="play-circle" size={50} color="#333" />
        ) : (
          <FontAwesome name="file" size={24} color={theme.colors.text} />
        )}

        <View style={styles.fileInfo}>
          <Text
            style={[
              styles.fileName,
              { color: item.senderId === userID1 ? '#fff' : theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {file.filename}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal xem ảnh hoặc video */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          >
            <FontAwesome name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {viewingVideo ? (
            <Video
              source={{ uri: file.data }}
              style={styles.modalVideo}
              useNativeControls
              resizeMode="contain"
              shouldPlay
            />
          ) : (
            <Image source={{ uri: file.data }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = {
  fileContainer: {
    flexDirection: "column",
    alignItems: 'center',
    marginVertical: 10,

  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  fileInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  modalVideo: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
};

export default FileMessage;
