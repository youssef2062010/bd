import { FakeCallConfig, RingtoneConfig } from './types.js';
/**
 * High-definition crisp SVG avatar data URI for default caller photo.
 * Ensures 100% offline rendering without any external image dependencies.
 */
export declare const DEFAULT_CALLER_AVATAR = "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"50\" fill=\"%231e293b\"/><circle cx=\"50\" cy=\"40\" r=\"18\" fill=\"%2364748b\"/><path d=\"M22 84c0-16 12-26 28-26s28 10 28 26z\" fill=\"%2364748b\"/></svg>";
export declare const RINGTONE_PRESETS: RingtoneConfig[];
export declare const DEFAULT_SPEECH_TEXT = "";
export declare const DEFAULT_CONFIG: FakeCallConfig;
export declare function nextConfigVersion(currentVersion?: number): number;
export declare function normalizeConfig(value: Partial<FakeCallConfig> | null | undefined): FakeCallConfig;
//# sourceMappingURL=defaults.d.ts.map