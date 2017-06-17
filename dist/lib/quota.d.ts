export declare type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";
export interface RateLimit {
    key: string;
    unit: TimeUnit;
    limit?: number;
}
export declare class Quota {
    protected redis: any;
    protected prefix: string;
    constructor({redis, prefix}: {
        redis: any;
        prefix?: string;
    });
    buildIdentifier({key, unit}: {
        key: string;
        unit: TimeUnit;
    }): string;
    parseIdentifier(identifier: string): {
        prefix: string;
        timestamp: number;
        key: string;
    };
    flush(options?: (RateLimit[] | RateLimit)): Promise<void>;
    grant(options?: (RateLimit[] | RateLimit)): Promise<void>;
    schedule(options?: (RateLimit[] | RateLimit)): Promise<Date>;
}
