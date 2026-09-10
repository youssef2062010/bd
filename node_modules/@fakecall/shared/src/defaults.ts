import { FakeCallConfig, RingtoneConfig } from './types.js';

/**
 * High-definition crisp SVG avatar data URI for default caller photo.
 * Ensures 100% offline rendering without any external image dependencies.
 */
export const DEFAULT_CALLER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%231e293b"/><circle cx="50" cy="40" r="18" fill="%2364748b"/><path d="M22 84c0-16 12-26 28-26s28 10 28 26z" fill="%2364748b"/></svg>`;

export const RINGTONE_PRESETS: RingtoneConfig[] = [
  {
    id: 'modern',
    name: 'Modern Smartphone (Marimba)',
    uri: 'synth:modern',
    enabled: true,
    volume: 0.85
  },
  {
    id: 'classic',
    name: 'Classic Dual Bell',
    uri: 'synth:classic',
    enabled: true,
    volume: 0.8
  },
  {
    id: 'chime',
    name: 'Gentle Acoustic Chime',
    uri: 'synth:chime',
    enabled: true,
    volume: 0.9
  },
  {
    id: 'radar',
    name: 'Sonar Radar Pulse',
    uri: 'synth:radar',
    enabled: true,
    volume: 0.75
  }
];

export const DEFAULT_SPEECH_TEXT = '';

export const DEFAULT_CONFIG: FakeCallConfig = {
  id: 'main',
  version: 1,
  callerName: '',
  callerPhone: '',
  callerImage: '',
  voiceAudio: null,
  ringtone: RINGTONE_PRESETS[0],
  callSettings: {
    launchAction: 'incoming',
    autoAnswerDelaySeconds: 0,
    callDuration: 60,
    autoEndWhenAudioFinishes: true,
    vibrationEnabled: true,
    animationStyle: 'pulse',
    theme: 'romantic',
    fallingHeartsEnabled: true,
    uiStyle: 'ios',
    answerMethod: 'buttons',
    realisticVoiceFilter: true,
    autoRecordCalls: true
  },
  branding: {
    appDisplayName: '',
    appIcon: '',
    customIconUri: ''
  },
  updatedAt: Date.now()
};

export function nextConfigVersion(currentVersion?: number): number {
  return (typeof currentVersion === 'number' ? currentVersion : 0) + 1;
}

export function normalizeConfig(value: Partial<FakeCallConfig> | null | undefined): FakeCallConfig {
  const base = DEFAULT_CONFIG;
  const input = (value && typeof value === 'object') ? value : {};
  const brandingInput = input.branding;
  // Stored values are user data. Never erase a valid record because it happens
  // to resemble a historic test fixture.
  const hasLegacyTestBranding = false;
  const hasLegacyTestCaller = false;

  return {
    ...base,
    ...input,
    version: typeof input.version === 'number' ? input.version : (typeof (input as any).schemaVersion === 'number' ? (input as any).schemaVersion : 1),
    callerName: hasLegacyTestCaller ? '' : (typeof input.callerName === 'string' ? input.callerName : base.callerName),
    callerPhone: hasLegacyTestCaller ? '' : (typeof input.callerPhone === 'string' ? input.callerPhone : base.callerPhone),
    callerImage: hasLegacyTestCaller ? '' : (typeof input.callerImage === 'string' ? input.callerImage : base.callerImage),
    voiceAudio: hasLegacyTestCaller ? null : (input.voiceAudio ?? base.voiceAudio),
    ringtone: {
      ...base.ringtone,
      ...input.ringtone,
      id: typeof input.ringtone?.id === 'string' ? input.ringtone.id : base.ringtone.id,
      name: typeof input.ringtone?.name === 'string' ? input.ringtone.name : base.ringtone.name,
      uri: typeof input.ringtone?.uri === 'string' ? input.ringtone.uri : base.ringtone.uri,
      enabled: typeof input.ringtone?.enabled === 'boolean' ? input.ringtone.enabled : base.ringtone.enabled,
      volume: typeof input.ringtone?.volume === 'number' ? input.ringtone.volume : base.ringtone.volume
    },
    callSettings: {
      ...base.callSettings,
      ...input.callSettings,
      launchAction: ['incoming', 'answer', 'decline'].includes(input.callSettings?.launchAction as string) ? (input.callSettings?.launchAction ?? base.callSettings.launchAction) : base.callSettings.launchAction,
      autoAnswerDelaySeconds: typeof input.callSettings?.autoAnswerDelaySeconds === 'number' ? input.callSettings.autoAnswerDelaySeconds : base.callSettings.autoAnswerDelaySeconds,
      callDuration: typeof input.callSettings?.callDuration === 'number' ? input.callSettings.callDuration : base.callSettings.callDuration,
      autoEndWhenAudioFinishes: typeof input.callSettings?.autoEndWhenAudioFinishes === 'boolean' ? input.callSettings.autoEndWhenAudioFinishes : base.callSettings.autoEndWhenAudioFinishes,
      vibrationEnabled: typeof input.callSettings?.vibrationEnabled === 'boolean' ? input.callSettings.vibrationEnabled : base.callSettings.vibrationEnabled,
      animationStyle: typeof input.callSettings?.animationStyle === 'string' ? input.callSettings.animationStyle : base.callSettings.animationStyle,
      theme: typeof input.callSettings?.theme === 'string' ? input.callSettings.theme : base.callSettings.theme,
      fallingHeartsEnabled: typeof input.callSettings?.fallingHeartsEnabled === 'boolean' ? input.callSettings.fallingHeartsEnabled : base.callSettings.fallingHeartsEnabled,
      uiStyle: typeof input.callSettings?.uiStyle === 'string' ? input.callSettings.uiStyle : base.callSettings.uiStyle,
      answerMethod: typeof input.callSettings?.answerMethod === 'string' ? input.callSettings.answerMethod : base.callSettings.answerMethod,
      realisticVoiceFilter: typeof input.callSettings?.realisticVoiceFilter === 'boolean' ? input.callSettings.realisticVoiceFilter : base.callSettings.realisticVoiceFilter,
      autoRecordCalls: typeof input.callSettings?.autoRecordCalls === 'boolean' ? input.callSettings.autoRecordCalls : base.callSettings.autoRecordCalls
    },
    branding: {
      ...base.branding,
      ...(hasLegacyTestBranding ? {} : brandingInput),
      appDisplayName: hasLegacyTestBranding ? '' : (typeof brandingInput?.appDisplayName === 'string' ? brandingInput.appDisplayName : base.branding.appDisplayName),
      appIcon: hasLegacyTestBranding ? '' : (typeof brandingInput?.appIcon === 'string' ? brandingInput.appIcon : base.branding.appIcon),
      customIconUri: hasLegacyTestBranding ? '' : (typeof brandingInput?.customIconUri === 'string' ? brandingInput.customIconUri : undefined)
    },
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : Date.now()
  };
}
