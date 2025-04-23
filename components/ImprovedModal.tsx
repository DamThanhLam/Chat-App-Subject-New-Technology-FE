import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Image, Dimensions } from 'react-native';
import Video from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const ImprovedModal = ({ modalVisible, setModalVisible, file, viewingVideo }) => {
  const [videoAspectRatio, setVideoAspectRatio] = useState(1);

  return (
    <Modal visible={modalVisible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <TouchableOpacity
          onPress={() => setModalVisible(false)}
          style={{
            position: 'absolute',
            top: 40,
            right: 20,
            zIndex: 10,
            padding: 10,
          }}
        >
          <FontAwesome name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {viewingVideo ? (
          <View style={{
            width: '100%',
            maxWidth: windowWidth * 0.9,
            maxHeight: windowHeight * 0.8,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Video
              source={{ uri: file.data }}
              useNativeControls
              resizeMode="contain"
              shouldPlay
              onLoad={({ naturalSize }) => {
                if (naturalSize?.width && naturalSize?.height) {
                  setVideoAspectRatio(naturalSize.width / naturalSize.height);
                }
              }}
              style={{
                width: '100%',
                height: undefined,
                aspectRatio: videoAspectRatio,
                backgroundColor: 'black',
              }}
            />
          </View>
        ) : (
          <Image
            source={{ uri: file.data }}
            style={{
              width: '100%',
              height: undefined,
              maxWidth: windowWidth * 0.9,
              maxHeight: windowHeight * 0.8,
              aspectRatio: 1,
              resizeMode: 'contain',
            }}
          />
        )}
      </View>
    </Modal>
  );
};

export default ImprovedModal;