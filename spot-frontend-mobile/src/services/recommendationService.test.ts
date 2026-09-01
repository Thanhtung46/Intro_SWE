import apiClient from './apiClient';
import { getRecommendations } from './recommendationService';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('recommendationService.getRecommendations', () => {
  afterEach(() => {
    mockedGet.mockReset();
  });

  it('sends the request with the current sport mapped to the backend enum', async () => {
    mockedGet.mockResolvedValue({ data: { items: [], fallback: false } });

    await getRecommendations('football');

    expect(mockedGet).toHaveBeenCalledWith('/recommendations', {
      params: { sport: 'FOOTBALL' },
    });
  });

  it('resolves success:true with items on a 200 response', async () => {
    mockedGet.mockResolvedValue({
      data: { items: [{ venueId: 1, venueName: 'A', address: '', sport: 'FOOTBALL', score: 1, suggestedSlots: [] }], fallback: true },
    });

    const result = await getRecommendations('football');

    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.fallback).toBe(true);
  });

  it('resolves success:false on a non-200/network error instead of throwing', async () => {
    mockedGet.mockRejectedValue(new Error('network down'));

    const result = await getRecommendations('badminton');

    expect(result.success).toBe(false);
    expect(result.items).toBeUndefined();
  });
});
