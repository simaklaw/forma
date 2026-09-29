import React from 'react';
import { OpenFoodFactsService } from '@/services/OpenFoodFactsService';
import AddFoodSheet from './AddFoodSheet';

const { act, create } = require('react-test-renderer');

jest.mock('react-native', () => ({
  ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity', View: 'View',
  StyleSheet: { create: (styles: unknown) => styles }
}));
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('@/components/BottomSheet', () => 'BottomSheet');
jest.mock('@/core/theme/useThemeColors', () => ({ useThemeColors: () => ({}) }));
jest.mock('@/services/OpenFoodFactsService', () => ({
  OpenFoodFactsService: { searchProducts: jest.fn() }
}));

function deferred() {
  let resolve!: (value: unknown[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const food = (name: string) => ({ name, kcal: 100, protein: 10, fat: 5, carbs: 2 });

describe('AddFoodSheet search cancellation', () => {
  let tree: ReturnType<typeof create>;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    act(() => { tree = create(React.createElement(AddFoodSheet, {
      mealKey: 'breakfast', mealLabel: 'Завтрак', onClose: () => {}
    })); });
  });
  afterEach(() => {
    act(() => tree.unmount());
    jest.useRealTimers();
  });
  function search(query: string) {
    act(() => tree.root.findByType('TextInput').props.onChangeText(query));
    act(() => jest.advanceTimersByTime(400));
  }

  it.each(['success', 'empty', 'failure'])('ignores stale %s without clearing the next search loading state', async (outcome) => {
    const first = deferred();
    const next = deferred();
    (OpenFoodFactsService.searchProducts as jest.Mock)
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);
    search('old');
    search('new');
    const pending = JSON.stringify(tree.toJSON());
    await act(async () => {
      if (outcome === 'failure') first.reject(new Error('offline'));
      else first.resolve(outcome === 'empty' ? [] : [food('old remote')]);
    });
    expect(JSON.stringify(tree.toJSON())).toBe(pending);
    await act(async () => next.resolve([food('new remote')]));
    expect(JSON.stringify(tree.toJSON())).toContain('new remote');
    expect(JSON.stringify(tree.toJSON())).not.toContain('old remote');
  });

  it('keeps newer results when an older response finishes last', async () => {
    const first = deferred();
    const next = deferred();
    (OpenFoodFactsService.searchProducts as jest.Mock)
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);
    search('old');
    search('new');
    await act(async () => next.resolve([food('new remote')]));
    const latest = JSON.stringify(tree.toJSON());
    await act(async () => first.resolve([food('old remote')]));
    expect(JSON.stringify(tree.toJSON())).toBe(latest);
  });
});
