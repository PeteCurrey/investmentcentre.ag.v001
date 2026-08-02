"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toScaledInteger = toScaledInteger;
exports.createMoney = createMoney;
exports.createPrice = createPrice;
exports.addMoney = addMoney;
exports.subMoney = subMoney;
exports.moneyToString = moneyToString;
/**
 * Converts a string or bigint integer into a branded ScaledInteger.
 * Floats are forbidden at compile time. Passing a JS `number` requires explicit conversion via string or bigint.
 */
function toScaledInteger(val) {
    if (typeof val === 'string') {
        if (val.includes('.')) {
            throw new Error(`Float values forbidden in ScaledInteger. Got string float: "${val}". Multiply by 10^scale first.`);
        }
        return BigInt(val);
    }
    return val;
}
function createMoney(amount, scale, currency) {
    return { amount, scale, currency: currency.toUpperCase() };
}
function createPrice(price, scale, currency) {
    return { price, scale, currency: currency.toUpperCase() };
}
function addMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch in addMoney: ${a.currency} vs ${b.currency}`);
    }
    if (a.scale !== b.scale) {
        throw new Error(`Scale mismatch in addMoney: ${a.scale} vs ${b.scale}`);
    }
    return {
        amount: (a.amount + b.amount),
        scale: a.scale,
        currency: a.currency
    };
}
function subMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch in subMoney: ${a.currency} vs ${b.currency}`);
    }
    if (a.scale !== b.scale) {
        throw new Error(`Scale mismatch in subMoney: ${a.scale} vs ${b.scale}`);
    }
    return {
        amount: (a.amount - b.amount),
        scale: a.scale,
        currency: a.currency
    };
}
function moneyToString(m) {
    const isNegative = m.amount < 0n;
    const absAmount = isNegative ? -m.amount : m.amount;
    const str = absAmount.toString().padStart(m.scale + 1, '0');
    const integerPart = str.slice(0, -m.scale) || '0';
    const fractionalPart = str.slice(-m.scale);
    const formatted = m.scale > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
    return `${isNegative ? '-' : ''}${formatted} ${m.currency}`;
}
//# sourceMappingURL=money.js.map