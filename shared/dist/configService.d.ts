import type { FakeCallConfig } from './types.js';
export declare class ConfigConflictError extends Error {
    readonly latest: FakeCallConfig | null;
    constructor(message: string, latest: FakeCallConfig | null);
}
/**
 * Configuration-only client. It deliberately has no localStorage or direct
 * database access: /api/config is the one authoritative read/write boundary.
 */
declare class ServerConfigService {
    private readonly listeners;
    private latest;
    private poller;
    private pollInFlight;
    private apiUrl;
    private request;
    private publish;
    getConfig(configId?: string): Promise<FakeCallConfig>;
    saveConfig(config: FakeCallConfig): Promise<FakeCallConfig>;
    subscribe(listener: (config: FakeCallConfig) => void): () => void;
    private onVisibilityChange;
    private stopPolling;
    private refreshIfNewer;
}
export declare const configService: ServerConfigService;
export {};
//# sourceMappingURL=configService.d.ts.map