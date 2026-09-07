import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import AssistantScreen from '../src/screens/assistant/AssistantScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import * as assistantService from '../src/services/assistantService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../src/services/assistantService');

let mockGranted = true;
const mockStart = jest.fn();
const mockStop = jest.fn();
const speechEventListeners: Record<string, (event: any) => void> = {};

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: mockGranted })),
    start: (...args: unknown[]) => mockStart(...args),
    stop: (...args: unknown[]) => mockStop(...args),
  },
  useSpeechRecognitionEvent: (eventName: string, listener: (event: any) => void) => {
    speechEventListeners[eventName] = listener;
  },
}));

const mockedSendMessage = assistantService.sendMessage as jest.Mock;
const mockedGetHistory = assistantService.getHistory as jest.Mock;
const mockedGetOrCreateConversationId = assistantService.getOrCreateConversationId as jest.Mock;

beforeEach(() => {
  mockedGetOrCreateConversationId.mockResolvedValue('conv-1');
  mockedGetHistory.mockResolvedValue([]);
  mockedSendMessage.mockReset();
});

async function renderReady() {
  render(
    <ThemeProvider>
      <AssistantScreen onBack={jest.fn()} />
    </ThemeProvider>,
  );
  // Wait for the mount effect (getOrCreateConversationId -> getHistory) to
  // resolve before interacting, so `conversationId` state is set.
  await waitFor(() => expect(mockedGetHistory).toHaveBeenCalled());
}

describe('AssistantScreen — text flow (User Story 2)', () => {
  it('sends a message and renders a results reply', async () => {
    mockedSendMessage.mockResolvedValue({
      outcome: 'ok',
      reply: {
        text: 'Mình tìm được 1 kèo phù hợp.',
        transcript: null,
        results: [{ matchId: 101, title: 'Cầu lông giao lưu', venueName: 'Sân ABC', startsAt: 't', spotsLeft: 2 }],
        pendingAction: null,
        clarifyingQuestion: null,
      },
    });

    await renderReady();

    fireEvent.changeText(screen.getByPlaceholderText(/nhắn/i), 'Tìm sân cầu lông ở Quận 7');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => expect(screen.getByText('Cầu lông giao lưu')).toBeTruthy());
  });

  it('renders a clarifying question reply distinctly from a results reply', async () => {
    mockedSendMessage.mockResolvedValue({
      outcome: 'ok',
      reply: {
        text: 'Bạn muốn tìm sân cầu lông hay bóng đá vậy?',
        transcript: null,
        results: null,
        pendingAction: null,
        clarifyingQuestion: 'Bạn muốn tìm sân cầu lông hay bóng đá vậy?',
      },
    });

    await renderReady();

    fireEvent.changeText(screen.getByPlaceholderText(/nhắn/i), 'Tìm sân ở Quận 7');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() =>
      expect(screen.getByText('Bạn muốn tìm sân cầu lông hay bóng đá vậy?')).toBeTruthy(),
    );
    expect(screen.queryByText(/spots left/i)).toBeNull();
  });

  it('shows an unavailable message when the assistant is down, instead of hanging', async () => {
    mockedSendMessage.mockResolvedValue({
      outcome: 'unavailable',
      message: 'Assistant is temporarily unavailable. Please use the search filters instead.',
    });

    await renderReady();

    fireEvent.changeText(screen.getByPlaceholderText(/nhắn/i), 'Tìm sân cầu lông');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() =>
      expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(),
    );
  });

  it('loads and renders existing history on mount', async () => {
    mockedGetHistory.mockResolvedValue([
      { role: 'player', inputMode: 'text', text: 'Chào bạn', timestamp: 't1' },
      { role: 'assistant', text: 'Mình có thể giúp gì cho bạn?', timestamp: 't2' },
    ]);

    render(
      <ThemeProvider>
        <AssistantScreen onBack={jest.fn()} />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByText('Mình có thể giúp gì cho bạn?')).toBeTruthy());
  });
});

describe('AssistantScreen — confirm join/host (User Story 3)', () => {
  it('renders a pendingAction reply as a confirmation card with confirm/cancel controls', async () => {
    mockedSendMessage.mockResolvedValue({
      outcome: 'ok',
      reply: {
        text: 'Xác nhận tham gia kèo tại Sân ABC lúc 19:30, còn 2 chỗ nhé?',
        transcript: null,
        results: null,
        pendingAction: {
          actionId: 'action-1',
          type: 'JOIN_MATCH',
          matchId: 101,
          summary: { venueName: 'Sân ABC', startsAt: '19:30', spotsLeft: 2 },
          state: 'awaiting_confirmation',
          expiresAt: '2999-01-01T00:00:00Z',
        },
        clarifyingQuestion: null,
      },
    });

    await renderReady();

    fireEvent.changeText(screen.getByPlaceholderText(/nhắn/i), 'Tham gia sân đầu tiên đi');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => expect(screen.getAllByText(/Sân ABC/).length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Confirm')).toBeTruthy();
    expect(screen.getByLabelText('Cancel')).toBeTruthy();
  });

  it('confirming sends a follow-up message and renders the success reply', async () => {
    mockedSendMessage
      .mockResolvedValueOnce({
        outcome: 'ok',
        reply: {
          text: 'Xác nhận tham gia?',
          transcript: null,
          results: null,
          pendingAction: {
            actionId: 'action-1',
            type: 'JOIN_MATCH',
            matchId: 101,
            summary: { venueName: 'Sân ABC' },
            state: 'awaiting_confirmation',
            expiresAt: '2999-01-01T00:00:00Z',
          },
          clarifyingQuestion: null,
        },
      })
      .mockResolvedValueOnce({
        outcome: 'ok',
        reply: {
          text: 'Bạn đã tham gia kèo thành công!',
          transcript: null,
          results: null,
          pendingAction: null,
          clarifyingQuestion: null,
        },
      });

    await renderReady();

    fireEvent.changeText(screen.getByPlaceholderText(/nhắn/i), 'Tham gia sân đầu tiên đi');
    fireEvent.press(screen.getByLabelText('Send message'));
    await waitFor(() => expect(screen.getByLabelText('Confirm')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Confirm'));

    await waitFor(() => expect(screen.getByText('Bạn đã tham gia kèo thành công!')).toBeTruthy());
    expect(mockedSendMessage).toHaveBeenCalledTimes(2);
  });

  it('a 409 conflict renders a "no longer available" message with the alternative', async () => {
    mockedSendMessage
      .mockResolvedValueOnce({
        outcome: 'ok',
        reply: {
          text: 'Xác nhận tham gia?',
          transcript: null,
          results: null,
          pendingAction: {
            actionId: 'action-1',
            type: 'JOIN_MATCH',
            matchId: 101,
            summary: { venueName: 'Sân ABC' },
            state: 'awaiting_confirmation',
            expiresAt: '2999-01-01T00:00:00Z',
          },
          clarifyingQuestion: null,
        },
      })
      .mockResolvedValueOnce({
        outcome: 'conflict',
        message: 'That kèo is no longer available.',
        alternative: { matchId: 202, title: 'Sân XYZ', startsAt: 'u' },
      });

    await renderReady();

    fireEvent.changeText(screen.getByPlaceholderText(/nhắn/i), 'Tham gia sân đầu tiên đi');
    fireEvent.press(screen.getByLabelText('Send message'));
    await waitFor(() => expect(screen.getByLabelText('Confirm')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Confirm'));

    await waitFor(() => expect(screen.getByText(/no longer available/i)).toBeTruthy());
    expect(screen.getByText(/Sân XYZ/)).toBeTruthy();
  });
});

describe('AssistantScreen — voice input (User Story 4)', () => {
  beforeEach(() => {
    mockGranted = true;
    mockStart.mockReset();
    mockStop.mockReset();
  });

  it('finishing on-device recognition sends the transcript as a text message', async () => {
    mockedSendMessage.mockResolvedValue({
      outcome: 'ok',
      reply: {
        text: 'Mình tìm được 1 kèo phù hợp.',
        transcript: null,
        results: [{ matchId: 101, title: 'Cầu lông giao lưu', venueName: 'Sân ABC', startsAt: 't', spotsLeft: 2 }],
        pendingAction: null,
        clarifyingQuestion: null,
      },
    });

    await renderReady();

    fireEvent.press(screen.getByLabelText('Voice input'));
    await waitFor(() => expect(screen.getByLabelText('Stop recording')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Stop recording'));

    // Simulate the native module emitting a final recognition result.
    act(() => {
      speechEventListeners.result({
        isFinal: true,
        results: [{ transcript: 'Tìm sân cầu lông ở Quận 7' }],
      });
    });

    await waitFor(() =>
      expect(mockedSendMessage).toHaveBeenCalledWith('conv-1', {
        inputMode: 'text',
        text: 'Tìm sân cầu lông ở Quận 7',
      }),
    );
    await waitFor(() => expect(screen.getByText('Tìm sân cầu lông ở Quận 7')).toBeTruthy());
    expect(screen.getByText('Cầu lông giao lưu')).toBeTruthy();
  });

  it('an empty recognition result shows the repeat-or-type prompt instead of sending anything', async () => {
    await renderReady();

    fireEvent.press(screen.getByLabelText('Voice input'));
    await waitFor(() => expect(screen.getByLabelText('Stop recording')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Stop recording'));

    act(() => {
      speechEventListeners.result({ isFinal: true, results: [{ transcript: '' }] });
    });

    await waitFor(() => expect(screen.getByText(/Không nghe rõ/)).toBeTruthy());
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });

  it('a recognition error shows the repeat-or-type prompt instead of hanging', async () => {
    await renderReady();

    fireEvent.press(screen.getByLabelText('Voice input'));
    await waitFor(() => expect(screen.getByLabelText('Stop recording')).toBeTruthy());

    act(() => {
      speechEventListeners.error({ error: 'no-speech', message: 'No speech detected' });
    });

    await waitFor(() => expect(screen.getByText(/Không nghe rõ/)).toBeTruthy());
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });

  it('a denied microphone permission offers typing instead of hanging', async () => {
    mockGranted = false;

    await renderReady();

    fireEvent.press(screen.getByLabelText('Voice input'));

    await waitFor(() => expect(screen.getByText(/Không nghe rõ/)).toBeTruthy());
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });
});
