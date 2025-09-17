import type { LlmMessage, LlmProvider } from '../types';
export class MockProvider {
  constructor(config = {}) {
    // Enforce No-Mock policy in production
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_MOCK_PROVIDER) {
      throw new Error('Mock provider disabled in production. Set ENABLE_MOCK_PROVIDER=true to override.');
    }
     implements LlmProvider { name = 'mock'; private model = 'mock/test'; getActiveModel() { return this.model; } async generate(messages: LlmMessage[]): Promise<string> { const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || ''; return `MOCK_RESPONSE: (${lastUser.slice(0,40)}) :: top_artists=["Artist A","Artist B"]`; } }