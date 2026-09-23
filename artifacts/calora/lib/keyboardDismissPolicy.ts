export type KeyboardDismissPlatform = 'ios' | 'android' | 'web' | 'windows' | 'macos';

export function defaultKeyboardDismissMode(
  platform: KeyboardDismissPlatform,
): 'interactive' | 'on-drag' {
  return platform === 'ios' ? 'interactive' : 'on-drag';
}
