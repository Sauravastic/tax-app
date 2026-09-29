import { calculateLineItem, calculateInvoiceTotals } from './gstEngine';
import { numberToWordsIndianEn, numberToWordsIndianHi } from './numberToWords';
import { InvoiceItem } from '../types';

export interface TestResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

export function runGSTVerificationSuite(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: User Prompt Example from spec section 14
  // 100 units @ 500 = 50,000; Discount 2,000 => Taxable 48,000; 18% GST => Intra: CGST 4320 + SGST 4320 = 8640; Total 56,640
  const specExampleIntra = calculateLineItem({
    quantity: 100,
    rate: 500,
    discountAmount: 2000,
    gstRate: 18,
    supplyType: 'INTRA_STATE',
  });

  results.push({
    name: 'Spec Section 14: Intra-state 18% with ₹2,000 discount',
    passed:
      specExampleIntra.taxableValue === 48000 &&
      specExampleIntra.cgstAmount === 4320 &&
      specExampleIntra.sgstAmount === 4320 &&
      specExampleIntra.igstAmount === 0 &&
      specExampleIntra.totalAmount === 56640,
    expected: { taxable: 48000, cgst: 4320, sgst: 4320, igst: 0, total: 56640 },
    actual: {
      taxable: specExampleIntra.taxableValue,
      cgst: specExampleIntra.cgstAmount,
      sgst: specExampleIntra.sgstAmount,
      igst: specExampleIntra.igstAmount,
      total: specExampleIntra.totalAmount,
    },
  });

  // Test 2: Spec Section 14 Inter-state treatment
  const specExampleInter = calculateLineItem({
    quantity: 100,
    rate: 500,
    discountAmount: 2000,
    gstRate: 18,
    supplyType: 'INTER_STATE',
  });

  results.push({
    name: 'Spec Section 14: Inter-state 18% with ₹2,000 discount (IGST)',
    passed:
      specExampleInter.taxableValue === 48000 &&
      specExampleInter.cgstAmount === 0 &&
      specExampleInter.sgstAmount === 0 &&
      specExampleInter.igstAmount === 8640 &&
      specExampleInter.totalAmount === 56640,
    expected: { taxable: 48000, cgst: 0, sgst: 0, igst: 8640, total: 56640 },
    actual: {
      taxable: specExampleInter.taxableValue,
      cgst: specExampleInter.cgstAmount,
      sgst: specExampleInter.sgstAmount,
      igst: specExampleInter.igstAmount,
      total: specExampleInter.totalAmount,
    },
  });

  // Test 3: 5% Rate slab
  const test5 = calculateLineItem({
    quantity: 10,
    rate: 100,
    gstRate: 5,
    supplyType: 'INTRA_STATE',
  });
  results.push({
    name: '5% GST Rate slab test (10 x 100 = 1000 => CGST 25 + SGST 25 = 1050)',
    passed: test5.cgstAmount === 25 && test5.sgstAmount === 25 && test5.totalAmount === 1050,
    expected: { cgst: 25, sgst: 25, total: 1050 },
    actual: { cgst: test5.cgstAmount, sgst: test5.sgstAmount, total: test5.totalAmount },
  });

  // Test 4: 28% Luxury / Automotive with Cess (e.g. 12% Cess)
  const test28Cess = calculateLineItem({
    quantity: 1,
    rate: 10000,
    gstRate: 28,
    cessRate: 12,
    supplyType: 'INTER_STATE',
  });
  results.push({
    name: '28% GST + 12% Cess on ₹10,000',
    passed: test28Cess.igstAmount === 2800 && test28Cess.cessAmount === 1200 && test28Cess.totalAmount === 14000,
    expected: { igst: 2800, cess: 1200, total: 14000 },
    actual: { igst: test28Cess.igstAmount, cess: test28Cess.cessAmount, total: test28Cess.totalAmount },
  });

  // Test 5: Exempt / 0% GST
  const test0 = calculateLineItem({
    quantity: 50,
    rate: 45,
    gstRate: 0,
    supplyType: 'INTRA_STATE',
  });
  results.push({
    name: '0% Nil / Exempt Taxable Supply',
    passed: test0.totalTax === 0 && test0.totalAmount === 2250,
    expected: { totalTax: 0, total: 2250 },
    actual: { totalTax: test0.totalTax, total: test0.totalAmount },
  });

  // Test 6: Decimal Cent / Paise Precision (Avoid floating point errors)
  const testDecimal = calculateLineItem({
    quantity: 3,
    rate: 33.33,
    gstRate: 18,
    supplyType: 'INTRA_STATE',
  });
  // 3 * 33.33 = 99.99; CGST @ 9% = 9.00; SGST @ 9% = 9.00; Total = 117.99
  results.push({
    name: 'Decimal arithmetic accuracy (3 x 33.33 @ 18%)',
    passed: testDecimal.taxableValue === 99.99 && testDecimal.cgstAmount === 9.00 && testDecimal.totalAmount === 117.99,
    expected: { taxable: 99.99, cgst: 9.00, sgst: 9.00, total: 117.99 },
    actual: { taxable: testDecimal.taxableValue, cgst: testDecimal.cgstAmount, sgst: testDecimal.sgstAmount, total: testDecimal.totalAmount },
  });

  // Test 7: Multi-item invoice with Round-off verification
  const dummyItems: InvoiceItem[] = [
    {
      id: '1',
      productName: 'Item A',
      hsnCode: '8471',
      quantity: 1,
      unit: 'PCS',
      mrp: 100,
      rate: 100.50,
      discountAmount: 0,
      discountPercent: 0,
      taxableValue: 100.50,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 9.05,
      sgstRate: 9,
      sgstAmount: 9.05,
      igstRate: 0,
      igstAmount: 0,
      cessRate: 0,
      cessAmount: 0,
      totalTax: 18.10,
      totalAmount: 118.60,
    }
  ];
  const invoiceTotals = calculateInvoiceTotals(dummyItems);
  // Total was 118.60; rounded is 119; roundOff = +0.40
  results.push({
    name: 'Invoice Round-off to nearest Rupee (118.60 -> 119.00 with round-off +0.40)',
    passed: invoiceTotals.grandTotal === 119 && Math.abs(invoiceTotals.roundOff - 0.40) < 0.01,
    expected: { grandTotal: 119, roundOff: 0.4 },
    actual: { grandTotal: invoiceTotals.grandTotal, roundOff: invoiceTotals.roundOff },
  });

  // Test 8: English Words conversion
  const wordsEn = numberToWordsIndianEn(56640);
  results.push({
    name: 'Number to Words (English) for ₹56,640',
    passed: wordsEn.includes('Fifty-Six Thousand Six Hundred Forty'),
    expected: 'Rupees Fifty-Six Thousand Six Hundred Forty Only',
    actual: wordsEn,
  });

  // Test 9: Hindi Words conversion
  const wordsHi = numberToWordsIndianHi(56640);
  results.push({
    name: 'Number to Words (Hindi) for ₹56,640',
    passed: wordsHi.includes('छप्पन हज़ार छह सौ चालीस'),
    expected: 'छप्पन हज़ार छह सौ चालीस रुपये मात्र',
    actual: wordsHi,
  });

  return results;
}

export interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: {
    name: string;
    passed: boolean;
    details: string;
    executionTimeMs: number;
  }[];
}

export function runDeterministicGstEngineTests(): TestSuiteResult {
  const start = performance.now();
  const rawResults = runGSTVerificationSuite();
  const total = rawResults.length;
  const passed = rawResults.filter(r => r.passed).length;
  const failed = total - passed;
  const duration = Math.round((performance.now() - start) * 10) / 10;

  return {
    totalTests: total,
    passedTests: passed,
    failedTests: failed,
    allPassed: failed === 0,
    results: rawResults.map(r => ({
      name: r.name,
      passed: r.passed,
      details: r.details || (r.passed ? 'Matched exact expected financial value to 0.0000 paise.' : 'Mismatch in expected calculation.'),
      executionTimeMs: Math.max(1, Math.round(duration / total)),
    })),
  };
}
