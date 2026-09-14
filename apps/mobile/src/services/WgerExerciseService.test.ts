import { WgerExerciseService } from './WgerExerciseService';

function mockFetchOnce(body: unknown, ok = true) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => body
  });
}

describe('WgerExerciseService.searchExerciseImage', () => {
  afterEach(() => {
    jest.resetAllMocks();
    // Each test uses a distinct search term to avoid hitting the module's
    // internal cache from a previous test.
  });

  it('returns the first suggestion with an absolute image URL, building one from a relative path', async () => {
    mockFetchOnce({
      suggestions: [
        { value: 'Barbell Squat', data: { id: 345, name: 'Barbell Squat', image: '/media/exercise-images/73/Squat-1.png' } }
      ]
    });

    const result = await WgerExerciseService.searchExerciseImage('unique-term-1');
    expect(result).toEqual({ id: 345, name: 'Barbell Squat', imageUrl: 'https://wger.de/media/exercise-images/73/Squat-1.png' });
  });

  it('leaves an already-absolute image URL untouched', async () => {
    mockFetchOnce({
      suggestions: [{ data: { id: 1, name: 'X', image: 'https://cdn.example.com/x.png' } }]
    });

    const result = await WgerExerciseService.searchExerciseImage('unique-term-2');
    expect(result?.imageUrl).toBe('https://cdn.example.com/x.png');
  });

  it('skips suggestions with no image and falls through to the next one', async () => {
    mockFetchOnce({
      suggestions: [{ data: { id: 1, name: 'No photo' } }, { data: { id: 2, name: 'Has photo', image: '/media/a.png' } }]
    });

    const result = await WgerExerciseService.searchExerciseImage('unique-term-3');
    expect(result?.id).toBe(2);
  });

  it('returns null when there are no suggestions', async () => {
    mockFetchOnce({ suggestions: [] });
    const result = await WgerExerciseService.searchExerciseImage('unique-term-4');
    expect(result).toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const result = await WgerExerciseService.searchExerciseImage('unique-term-5');
    expect(result).toBeNull();
  });

  it('returns null instead of throwing on a non-ok response', async () => {
    mockFetchOnce({}, false);
    const result = await WgerExerciseService.searchExerciseImage('unique-term-6');
    expect(result).toBeNull();
  });

  it('returns null and does not crash on a malformed/unexpected response shape', async () => {
    mockFetchOnce({ unexpected: 'shape' });
    const result = await WgerExerciseService.searchExerciseImage('unique-term-7');
    expect(result).toBeNull();
  });

  it('caches by term+language — a second call for the same term does not refetch', async () => {
    mockFetchOnce({ suggestions: [{ data: { id: 9, name: 'Cached', image: '/media/c.png' } }] });
    await WgerExerciseService.searchExerciseImage('unique-term-8');
    await WgerExerciseService.searchExerciseImage('unique-term-8');
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
  });
});
