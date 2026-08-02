declare const ScaledIntegerBrand: unique symbol;
export type ScaledInteger = bigint & {
    readonly [ScaledIntegerBrand]: typeof ScaledIntegerBrand;
};
export interface Money {
    amount: ScaledInteger;
    scale: number;
    currency: string;
}
export interface Price {
    price: ScaledInteger;
    scale: number;
    currency: string;
}
/**
 * Converts a string or bigint integer into a branded ScaledInteger.
 * Floats are forbidden at compile time. Passing a JS `number` requires explicit conversion via string or bigint.
 */
export declare function toScaledInteger(val: bigint | string): ScaledInteger;
export declare function createMoney(amount: ScaledInteger, scale: number, currency: string): Money;
export declare function createPrice(price: ScaledInteger, scale: number, currency: string): Price;
export declare function addMoney(a: Money, b: Money): Money;
export declare function subMoney(a: Money, b: Money): Money;
export declare function moneyToString(m: Money): string;
export declare function normalizeScale(amount: ScaledInteger, fromScale: number, toScale: number, roundingMode?: 'trunc' | 'ceil'): ScaledInteger;
export {};
//# sourceMappingURL=money.d.ts.map