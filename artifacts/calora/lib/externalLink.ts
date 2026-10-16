export type ExternalLinkLauncher = {
  canOpenURL: (url: string) => Promise<boolean>;
  openURL: (url: string) => Promise<unknown>;
};

export type ExternalLinkLaunchResult = 'opened' | 'unsupported' | 'failed';

/** Launches an external destination only when the host reports support, without exposing provider errors. */
export async function launchExternalUrl(
  launcher: ExternalLinkLauncher,
  url: string,
): Promise<ExternalLinkLaunchResult> {
  try {
    if (!(await launcher.canOpenURL(url))) return 'unsupported';
  } catch {
    return 'unsupported';
  }

  try {
    await launcher.openURL(url);
    return 'opened';
  } catch {
    return 'failed';
  }
}
