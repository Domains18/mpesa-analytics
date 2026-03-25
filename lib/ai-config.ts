import * as SecureStore from 'expo-secure-store';

const API_KEY_STORE = 'anthropic_api_key';
const AI_ENABLED_STORE = 'ai_parser_enabled';

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_STORE);
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORE, key);
}

export async function removeApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORE);
}

export async function isAiParserEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(AI_ENABLED_STORE);
  return val === 'true';
}

export async function setAiParserEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(AI_ENABLED_STORE, enabled ? 'true' : 'false');
}
