export declare type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";
export interface RateIdent {
    key: string;
    unit: TimeUnit;
}
export interface RateLimit {
    key: string;
    unit: TimeUnit;
    limit: number;
}
export declare class Quota {
    readonly redis: any;
    readonly prefix: string;
    readonly rates: RateLimit[];
    constructor({redis, prefix, rates}: {
        redis: any;
        prefix?: string;
        rates?: RateLimit[];
    });
    buildIdentifier(ident: RateIdent): string;
    parseIdentifier(identifier: string): {
        prefix: string;
        timestamp: number;
        key: string;
    };
    flush(idents?: (RateIdent[] | RateIdent)): Promise<void>;
    grant(rates?: (RateLimit[] | RateLimit)): Promise<void>;
    schedule(rates?: (RateLimit[] | RateLimit)): Promise<Date>;
}
