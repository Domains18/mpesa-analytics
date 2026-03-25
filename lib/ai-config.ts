import * as SecureStore from 'expo-secure-store';
import Config from 'react-native-config';



const AI_ENABLED_STORE = 'ai_parser_enabled';

export async function getApiKey(): Promise<string | null> {
  return Config.OPENROUTER_API_KEY || null;
}


export async function isAiParserEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(AI_ENABLED_STORE);
  return val === 'true';
}

export async function setAiParserEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(AI_ENABLED_STORE, enabled ? 'true' : 'false');
}
