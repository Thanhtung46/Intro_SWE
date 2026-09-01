import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { GalleryImage } from '@/types/group';

type Props = {
  images: GalleryImage[];
  isAdmin: boolean;
  onRequestDelete: (imageId: number) => void;
};

const COLUMNS = 3;

/**
 * Group Detail Gallery tab — simple image grid + tap-to-enlarge (Groups
 * implementation plan, no new dependency: plain Modal + Image). Admin-only
 * per-image delete via an "x" overlay; the actual confirm dialog + API call
 * live in GroupDetailScreen (this component just reports which image was
 * tapped for delete).
 */
export default function GroupGalleryGrid({ images, isAdmin, onRequestDelete }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (images.length === 0) {
    return <Text style={styles.emptyText}>No photos yet.</Text>;
  }

  return (
    <>
      <View style={styles.grid}>
        {images.map((image) => (
          <View key={image.imageId} style={styles.thumbWrap}>
            <TouchableOpacity testID={`group-gallery-thumb-${image.imageId}`} onPress={() => setPreviewUrl(image.imageUrl)}>
              <Image source={{ uri: image.imageUrl }} style={styles.thumb} resizeMode="cover" />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                testID={`group-gallery-delete-${image.imageId}`}
                style={styles.deleteButton}
                onPress={() => onRequestDelete(image.imageId)}
              >
                <Ionicons name="close" size={12} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <Modal visible={previewUrl != null} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewUrl(null)}>
          {previewUrl && <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" />}
          <TouchableOpacity testID="group-gallery-preview-close" style={styles.previewClose} onPress={() => setPreviewUrl(null)}>
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const THUMB_SIZE_PERCENT = `${100 / COLUMNS}%` as const;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  thumbWrap: { width: THUMB_SIZE_PERCENT, aspectRatio: 1, padding: 2 },
  thumb: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: colors.iconBackground },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 12, color: colors.outline },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%' },
  previewClose: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
