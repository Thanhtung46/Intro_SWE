import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { createReview } from '../services/reviewService';
import { colors } from '@/constants/colors';

interface ReviewModalProps {
  visible: boolean;
  bookingId: number | null;
  onClose: () => void;
  onSubmitted: (bookingId: number) => void;
}

export function ReviewModal({ visible, bookingId, onClose, onSubmitted }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    setRating(0);
    setReviewText('');
    setFormError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!bookingId || rating < 1) {
      setFormError('Please select a star rating.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const result = await createReview({
      bookingId,
      rating,
      ...(reviewText.trim() ? { reviewText: reviewText.trim() } : {}),
    });
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.message || 'Something went wrong. Please try again.');
      return;
    }

    onSubmitted(bookingId);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.card} testID="review-modal-card">
                <Text style={styles.title}>Rate your experience</Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      testID={`review-star-${value}`}
                      onPress={() => setRating(value)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={value <= rating ? 'star' : 'star-outline'}
                        size={32}
                        color={colors.amber}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  testID="review-text-input"
                  style={styles.textarea}
                  placeholder="Share your experience (optional)"
                  placeholderTextColor={colors.placeholder}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <TouchableOpacity
                  testID="review-submit-button"
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="review-cancel-button" style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 88,
    marginBottom: 8,
  },
  formError: {
    color: colors.formError,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtitle,
  },
});
