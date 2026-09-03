import React, { useEffect, useRef } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  images: { imageUrl: string }[];
  /** Index to open on — the lightbox scrolls here when it opens. */
  initialIndex: number;
  onClose: () => void;
};

/** Full-screen tap-to-zoom photo viewer — swipe between photos, tap to close. */
export default function ImageLightbox({ visible, images, initialIndex, onClose }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (!visible) return;
    // Jump to the tapped photo without an animated scroll fighting the
    // modal's own open transition.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    });
  }, [visible, initialIndex, width]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{`${initialIndex + 1}/${images.length}`}</Text>
          </View>
        )}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
        >
          {images.map((image, index) => (
            <TouchableOpacity
              key={`${image.imageUrl}-${index}`}
              style={[styles.page, { width }]}
              activeOpacity={1}
              onPress={onClose}
            >
              <Image source={{ uri: image.imageUrl }} style={styles.image} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  counter: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    zIndex: 1,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '80%',
  },
});
