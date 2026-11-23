/**
 * Number to Words converter for Bangladeshi Currency (Taka and Paisa)
 * Supports both Bengali (বাংলা কথায়) and English words.
 */

const banglaOnesToNinetyNine: { [key: number]: string } = {
  0: 'শূন্য',
  1: 'এক',
  2: 'দুই',
  3: 'তিন',
  4: 'চার',
  5: 'পাঁচ',
  6: 'ছয়',
  7: 'সাত',
  8: 'আট',
  9: 'নয়',
  10: 'দশ',
  11: 'এগারো',
  12: 'বারো',
  13: 'তেরো',
  14: 'চৌদ্দ',
  15: 'পনেরো',
  16: 'ষোলো',
  17: 'সতেরো',
  18: 'আঠারো',
  19: 'উনিশ',
  20: 'বিশ',
  21: 'একুশ',
  22: 'বাইশ',
  23: 'তেইশ',
  24: 'চব্বিশ',
  25: 'পঁচিশ',
  26: 'ছাব্বিশ',
  27: 'সাতাশ',
  28: 'আটাশ',
  29: 'উনত্রিশ',
  30: 'ত্রিশ',
  31: 'একত্রিশ',
  32: 'বত্রিশ',
  33: 'তেত্রিশ',
  34: 'চৌত্রিশ',
  35: 'পঁয়ত্রিশ',
  36: 'ছত্রিশ',
  37: 'সাঁইত্রিশ',
  38: 'আটত্রিশ',
  39: 'উনচল্লিশ',
  40: 'চল্লিশ',
  41: 'একচল্লিশ',
  42: 'বিয়াল্লিশ',
  43: 'তেতাল্লিশ',
  44: 'চুয়াল্লিশ',
  45: 'পঁয়তাল্লিশ',
  46: 'ছেচল্লিশ',
  47: 'সাতচল্লিশ',
  48: 'আটচল্লিশ',
  49: 'উনপঞ্চাশ',
  50: 'পঞ্চাশ',
  51: 'একান্ন',
  52: 'বায়ান্ন',
  53: 'তিপ্পান্ন',
  54: 'চুয়ান্ন',
  55: 'পঞ্চান্ন',
  56: 'ছাপ্পান্ন',
  57: 'সাতান্ন',
  58: 'আটান্ন',
  59: 'উনষাট',
  60: 'ষাট',
  61: 'একষট্টি',
  62: 'বাষট্টি',
  63: 'তেষট্টি',
  64: 'চৌষট্টি',
  65: 'পঁয়ষট্টি',
  66: 'ছেষট্টি',
  67: 'সাতষট্টি',
  68: 'আটষট্টি',
  69: 'উনসত্তর',
  70: 'সত্তর',
  71: 'একাত্তর',
  72: 'বাহাত্তর',
  73: 'তিয়াত্তর',
  74: 'চুয়াত্তর',
  75: 'পঁচাত্তর',
  76: 'ছিয়াত্তর',
  77: 'সাতাত্তর',
  78: 'আটাত্তর',
  79: 'উনআশি',
  80: 'আশি',
  81: 'একাশি',
  82: 'বিরাশি',
  83: 'তিরাশি',
  84: 'চুরাশি',
  85: 'পঁচাশি',
  86: 'ছিয়াশি',
  87: 'সাতাশি',
  88: 'অষ্টআশি',
  89: 'উননব্বই',
  90: 'নব্বই',
  91: 'একানব্বই',
  92: 'বানব্বই',
  93: 'তিরানব্বই',
  94: 'চুরানব্বই',
  95: 'পঁচানব্বই',
  96: 'ছিয়ানব্বই',
  97: 'সাতানব্বই',
  98: 'আটানব্বই',
  99: 'নিরানব্বই',
};

function convertIntegerToBanglaWords(num: number): string {
  if (num === 0) return '';

  let words = '';

  // Crores (১ কোটি = ১,০০,০০,০০০)
  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  if (crore > 0) {
    words += `${convertIntegerToBanglaWords(crore)} কোটি `;
  }

  // Lakhs (১ লক্ষ = ১,০০,০০০)
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  if (lakh > 0) {
    words += `${banglaOnesToNinetyNine[lakh] || convertIntegerToBanglaWords(lakh)} লক্ষ `;
  }

  // Thousands (১ হাজার = ১,০০০)
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  if (thousand > 0) {
    words += `${banglaOnesToNinetyNine[thousand] || convertIntegerToBanglaWords(thousand)} হাজার `;
  }

  // Hundreds (১ শত / একশ)
  const hundred = Math.floor(remainder / 100);
  remainder = remainder % 100;
  if (hundred > 0) {
    if (hundred === 1) {
      words += 'একশ ';
    } else {
      words += `${banglaOnesToNinetyNine[hundred]} শত `;
    }
  }

  // Remainder (১-৯৯)
  if (remainder > 0) {
    words += `${banglaOnesToNinetyNine[remainder]} `;
  }

  return words.trim();
}

/**
 * Converts a numeric amount to Bangla words
 * e.g. 12500 -> "বারো হাজার পাঁচশ টাকা মাত্র"
 * e.g. 125750.50 -> "এক লক্ষ পঁচিশ হাজার সাতশ পঞ্চাশ টাকা পঞ্চাশ পয়সা মাত্র"
 */
export function numberToBanglaWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'শূন্য টাকা মাত্র';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let result = '';
  if (integerPart === 0) {
    result = 'শূন্য টাকা';
  } else {
    result = `${convertIntegerToBanglaWords(integerPart)} টাকা`;
  }

  if (decimalPart > 0) {
    const paisaWord = banglaOnesToNinetyNine[decimalPart] || String(decimalPart);
    result += ` ${paisaWord} পয়সা`;
  }

  result += ' মাত্র';

  return isNegative ? `মাইনাস ${result}` : result;
}

// English words helper
const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertIntegerToEnglishWords(num: number): string {
  if (num === 0) return '';

  let words = '';

  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  if (crore > 0) {
    words += `${convertIntegerToEnglishWords(crore)} Crore `;
  }

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  if (lakh > 0) {
    words += `${convertTwoDigitsEnglish(lakh)} Lakh `;
  }

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  if (thousand > 0) {
    words += `${convertTwoDigitsEnglish(thousand)} Thousand `;
  }

  const hundred = Math.floor(remainder / 100);
  remainder = remainder % 100;
  if (hundred > 0) {
    words += `${ones[hundred]} Hundred `;
  }

  if (remainder > 0) {
    words += `${convertTwoDigitsEnglish(remainder)} `;
  }

  return words.trim();
}

function convertTwoDigitsEnglish(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens[t]}${o > 0 ? ' ' + ones[o] : ''}`;
}

export function numberToEnglishWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Taka only';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let result = '';
  if (integerPart === 0) {
    result = 'Zero Taka';
  } else {
    result = `${convertIntegerToEnglishWords(integerPart)} Taka`;
  }

  if (decimalPart > 0) {
    result += ` and ${convertTwoDigitsEnglish(decimalPart)} Paisa`;
  }

  result += ' only';

  return isNegative ? `Minus ${result}` : result;
}

/**
 * Universal formatter that returns words according to language ('bn' or 'en')
 */
export function formatAmountInWords(amount: number, lang: 'bn' | 'en' = 'bn'): string {
  if (lang === 'bn') {
    return numberToBanglaWords(amount);
  }
  return numberToEnglishWords(amount);
}
