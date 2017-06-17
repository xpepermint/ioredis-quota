export declare class QuotaError extends Error {
    readonly nextDate: Date;
    readonly code: number;
    constructor(nextDate: Date, message?: string);
}
