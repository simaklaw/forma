import { useSessionFeedbackStore } from './useSessionFeedbackStore';

describe('useSessionFeedbackStore', () => {
  beforeEach(() => {
    useSessionFeedbackStore.setState({ entries: [] });
  });

  it('records an early-leave entry with the given reason', () => {
    useSessionFeedbackStore.getState().recordEarlyLeave('s1', 'day-a', 'no_time');
    const entries = useSessionFeedbackStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      sessionId: 's1',
      dayId: 'day-a',
      kind: 'early_leave',
      earlyLeaveReason: 'no_time'
    });
  });

  it('records a completion feedback entry', () => {
    useSessionFeedbackStore.getState().recordCompletionFeedback('s2', 'day-b', {
      feel: 4,
      difficulty: 'just_right',
      hadPain: false,
      wouldRepeat: true
    });
    const entries = useSessionFeedbackStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'completed', feel: 4, difficulty: 'just_right' });
  });

  it('caps entries at MAX_ENTRIES, dropping oldest first', () => {
    for (let i = 0; i < 205; i += 1) {
      useSessionFeedbackStore.getState().recordEarlyLeave(`s${i}`, 'day-a', 'other');
    }
    const entries = useSessionFeedbackStore.getState().entries;
    expect(entries.length).toBe(200);
    expect(entries[0].sessionId).toBe('s5'); // first 5 dropped
  });
});
