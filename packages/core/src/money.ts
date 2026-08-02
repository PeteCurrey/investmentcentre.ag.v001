declare const ScaledIntegerBrand: unique symbol;

export type ScaledInteger = bigint & { readonly [ScaledIntegerBrand]: typeof ScaledIntegerBrand };

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
export function toScaledInteger(val: bigint | string): ScaledInteger {
  if (typeof val === 'string') {
    if (val.includes('.')) {
      throw new Error(`Float values forbidden in ScaledInteger. Got string float: "${val}". Multiply by 10^scale first.`);
    }
    return BigInt(val) as ScaledInteger;
  }
  return val as ScaledInteger;
}

export function createMoney(amount: ScaledInteger, scale: number, currency: string): Money {
  return { amount, scale, currency: currency.toUpperCase() };
}

export function createPrice(price: ScaledInteger, scale: number, currency: string): Price {
  return { price, scale, currency: currency.toUpperCase() };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch in addMoney: ${a.currency} vs ${b.currency}`);
  }
  if (a.scale !== b.scale) {
    throw new Error(`Scale mismatch in addMoney: ${a.scale} vs ${b.scale}`);
  }
  return {
    amount: (a.amount + b.amount) as ScaledInteger,
    scale: a.scale,
    currency: a.currency
  };
}

export function subMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch in subMoney: ${a.currency} vs ${b.currency}`);
  }
  if (a.scale !== b.scale) {
    throw new Error(`Scale mismatch in subMoney: ${a.scale} vs ${b.scale}`);
  }
  return {
    amount: (a.amount - b.amount) as ScaledInteger,
    scale: a.scale,
    currency: a.currency
  };
}

export function moneyToString(m: Money): string {
  const isNegative = m.amount < 0n;
  const absAmount = isNegative ? -m.amount : m.amount;
  const str = absAmount.toString().padStart(m.scale + 1, '0');
  const integerPart = str.slice(0, -m.scale) || '0';
  const fractionalPart = str.slice(-m.scale);
  const formatted = m.scale > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
  return `${isNegative ? '-' : ''}${formatted} ${m.currency}`;
}

export function normalizeScale(
  amount: ScaledInteger,
  fromScale: number,
  toScale: number,
  roundingMode: 'trunc' | 'ceil' = 'trunc'
): ScaledInteger {
  if (fromScale === toScale) return amount;
  if (fromScale > toScale) {
    const factor = 10n ** BigInt(fromScale - toScale);
    if (roundingMode === 'ceil' && amount > 0n) {
      return ((amount + factor - 1n) / factor) as ScaledInteger;
    }
    return (amount / factor) as ScaledInteger;
  } else {
    const factor = 10n ** BigInt(toScale - fromScale);
    return (amount * factor) as ScaledInteger;
  }
}
