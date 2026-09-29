/**
 * Indian Numbering System Converter to English and Hindi Words
 * Handles units, thousands, lakhs, and crores with paise support.
 */

const EN_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const EN_TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const HI_ONES = [
  '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'
];

const HI_TENS = [
  '', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'
];

function convertBelowThousandEn(n: number): string {
  let str = '';
  if (n >= 100) {
    str += EN_ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += EN_TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += EN_ONES[n] + ' ';
  }
  return str.trim();
}

function convertBelowThousandHi(n: number): string {
  let str = '';
  if (n >= 100) {
    str += HI_ONES[Math.floor(n / 100)] + ' सौ ';
    n %= 100;
  }
  if (n >= 20) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) {
      str += HI_TENS[tens] + ' ';
    } else {
      str += HI_ONES[ones] + ' ' + HI_TENS[tens] + ' ';
    }
  } else if (n > 0) {
    str += HI_ONES[n] + ' ';
  }
  return str.trim();
}

export function numberToWordsIndianEn(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only';

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  let thousand = Math.floor(rem / 1000);
  let belowThousand = rem % 1000;

  let result = '';

  if (crore > 0) {
    result += convertBelowThousandEn(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertBelowThousandEn(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertBelowThousandEn(thousand) + ' Thousand ';
  }
  if (belowThousand > 0) {
    result += convertBelowThousandEn(belowThousand) + ' ';
  }

  result = result.trim();
  if (result.length === 0) {
    result = 'Zero';
  }

  let finalStr = 'Rupees ' + result;
  if (paise > 0) {
    finalStr += ' and ' + convertBelowThousandEn(paise) + ' Paise';
  }
  finalStr += ' Only';

  return finalStr;
}

export function numberToWordsIndianHi(amount: number): string {
  if (amount === 0) return 'शून्य रुपये मात्र';

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  let thousand = Math.floor(rem / 1000);
  let belowThousand = rem % 1000;

  let result = '';

  if (crore > 0) {
    result += convertBelowThousandHi(crore) + ' करोड़ ';
  }
  if (lakh > 0) {
    result += convertBelowThousandHi(lakh) + ' लाख ';
  }
  if (thousand > 0) {
    result += convertBelowThousandHi(thousand) + ' हज़ार ';
  }
  if (belowThousand > 0) {
    result += convertBelowThousandHi(belowThousand) + ' ';
  }

  result = result.trim();
  if (result.length === 0) {
    result = 'शून्य';
  }

  let finalStr = result + ' रुपये';
  if (paise > 0) {
    finalStr += ' और ' + convertBelowThousandHi(paise) + ' पैसे';
  }
  finalStr += ' मात्र';

  return finalStr;
}
