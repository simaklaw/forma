import {
  MAX_CONVERSATIONS,
  selectActiveProvider,
  useAiAssistantStore
} from './useAiAssistantStore';

const baseProvider = {
  label: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test',
  model: 'gpt-4o-mini',
  supportsVision: true
};

beforeEach(() => {
  useAiAssistantStore.setState({
    providers: [],
    activeProviderId: null,
    conversations: {}
  });
});

describe('providers', () => {
  it('upsertProvider creates an id and activates the first provider', () => {
    const created = useAiAssistantStore.getState().upsertProvider(baseProvider);
    expect(created.id).toBeTruthy();
    const state = useAiAssistantStore.getState();
    expect(state.providers).toHaveLength(1);
    expect(state.activeProviderId).toBe(created.id);
    expect(selectActiveProvider(state)?.label).toBe('OpenAI');
  });

  it('upsertProvider updates an existing provider by id', () => {
    const created = useAiAssistantStore.getState().upsertProvider(baseProvider);
    useAiAssistantStore.getState().upsertProvider({ ...baseProvider, label: 'OpenRouter', id: created.id });
    const state = useAiAssistantStore.getState();
    expect(state.providers).toHaveLength(1);
    expect(state.providers[0].label).toBe('OpenRouter');
  });

  it('deleteProvider switches the active provider to the remaining one', () => {
    const first = useAiAssistantStore.getState().upsertProvider(baseProvider);
    const second = useAiAssistantStore
      .getState()
      .upsertProvider({ ...baseProvider, label: 'OpenRouter' });
    useAiAssistantStore.getState().setActiveProvider(first.id);
    useAiAssistantStore.getState().deleteProvider(first.id);
    const state = useAiAssistantStore.getState();
    expect(state.activeProviderId).toBe(second.id);
  });

  it('deleteProvider keeps active null-safe when no providers remain', () => {
    const only = useAiAssistantStore.getState().upsertProvider(baseProvider);
    useAiAssistantStore.getState().deleteProvider(only.id);
    const state = useAiAssistantStore.getState();
    expect(state.providers).toHaveLength(0);
    expect(state.activeProviderId).toBeNull();
  });
});

describe('conversations', () => {
  it('appendTurn creates a conversation and accumulates tokens', () => {
    const store = useAiAssistantStore.getState();
    store.appendTurn('nutritionist:nutrition-day', 'hash1', { role: 'user', content: 'данные' }, { role: 'assistant', content: 'анализ' }, 150);
    store.appendTurn('nutritionist:nutrition-day', 'hash2', { role: 'user', content: 'данные2' }, { role: 'assistant', content: 'анализ2' }, 100);

    const conversation = useAiAssistantStore.getState().conversations['nutritionist:nutrition-day'];
    expect(conversation.messages).toHaveLength(4);
    expect(conversation.totalTokens).toBe(250);
    expect(conversation.contextHash).toBe('hash2');
  });

  it('clearConversation removes the stored analysis', () => {
    useAiAssistantStore.getState().appendTurn('coach:chat', 'chat', { role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }, 10);
    useAiAssistantStore.getState().clearConversation('coach:chat');
    expect(useAiAssistantStore.getState().conversations['coach:chat']).toBeUndefined();
  });

  it('prunes old conversations beyond the cap', () => {
    for (let i = 0; i < MAX_CONVERSATIONS + 3; i++) {
      useAiAssistantStore.getState().appendTurn(
        `coach:chat-${i}`,
        'h',
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
        1
      );
    }
    const conversations = useAiAssistantStore.getState().conversations;
    expect(Object.keys(conversations)).toHaveLength(MAX_CONVERSATIONS);
    expect(conversations['coach:chat-0']).toBeUndefined();
    expect(conversations[`coach:chat-${MAX_CONVERSATIONS + 2}`]).toBeDefined();
  });
});
