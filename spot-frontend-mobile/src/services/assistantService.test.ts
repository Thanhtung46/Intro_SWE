import apiClient from './apiClient';
import { getHistory, sendMessage } from './assistantService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));

const mockedPost = apiClient.post as jest.Mock;
const mockedGet = apiClient.get as jest.Mock;

describe('assistantService.sendMessage', () => {
  afterEach(() => {
    mockedPost.mockReset();
  });

  it('sends a text payload to the conversation messages endpoint', async () => {
    mockedPost.mockResolvedValue({
      data: { reply: { text: 'ok', transcript: null, results: null, pendingAction: null, clarifyingQuestion: null } },
    });

    await sendMessage('conv-1', { inputMode: 'text', text: 'Tìm sân cầu lông' });

    expect(mockedPost).toHaveBeenCalledWith('/assistant/conversations/conv-1/messages', {
      inputMode: 'text',
      text: 'Tìm sân cầu lông',
    });
  });

  it('resolves outcome:"ok" with the reply on success', async () => {
    const reply = { text: 'ok', transcript: null, results: [], pendingAction: null, clarifyingQuestion: null };
    mockedPost.mockResolvedValue({ data: { reply } });

    const result = await sendMessage('conv-1', { inputMode: 'text', text: 'hi' });

    expect(result).toEqual({ outcome: 'ok', reply });
  });

  it('resolves outcome:"unavailable" on a 503/network error instead of throwing', async () => {
    mockedPost.mockRejectedValue({
      response: { status: 503, data: { error: 'Assistant is temporarily unavailable.' } },
    });

    const result = await sendMessage('conv-1', { inputMode: 'text', text: 'hi' });

    expect(result.outcome).toBe('unavailable');
  });

  it('resolves outcome:"conflict" with the alternative on a 409', async () => {
    mockedPost.mockRejectedValue({
      response: {
        status: 409,
        data: { error: 'No longer available.', alternative: { matchId: 2, title: 'B', startsAt: 'x' } },
      },
    });

    const result = await sendMessage('conv-1', { inputMode: 'text', text: 'confirm' });

    expect(result.outcome).toBe('conflict');
    if (result.outcome === 'conflict') {
      expect(result.alternative).toEqual({ matchId: 2, title: 'B', startsAt: 'x' });
    }
  });
});

describe('assistantService.getHistory', () => {
  afterEach(() => {
    mockedGet.mockReset();
  });

  it('returns the messages array on success', async () => {
    mockedGet.mockResolvedValue({ data: { messages: [{ role: 'player', text: 'hi', timestamp: 't' }] } });

    const messages = await getHistory('conv-1');

    expect(messages).toHaveLength(1);
  });

  it('returns an empty array on failure instead of throwing', async () => {
    mockedGet.mockRejectedValue(new Error('network down'));

    const messages = await getHistory('conv-1');

    expect(messages).toEqual([]);
  });
});
