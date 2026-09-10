export interface AppBranding {
    appName: string;
    appIconUrl: string;
    appIcon: string;
    updatedAt: number;
}
export declare const DEFAULT_APP_BRANDING: AppBranding;
export declare function getAppBranding(): Promise<AppBranding>;
export declare function saveAppBranding(branding: Pick<AppBranding, 'appName' | 'appIconUrl' | 'appIcon'>): Promise<AppBranding>;
export declare function uploadAppIcon(dataUrl: string): Promise<string>;
//# sourceMappingURL=branding.d.ts.map