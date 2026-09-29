import { InvoiceItem, InvoiceTotals, SupplyType, TaxBreakdown } from '../types';

/**
 * Fixed precision helper for monetary operations.
 * Avoids JavaScript IEEE-754 floating point artifacts.
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export interface CalculateItemInput {
  quantity: number;
  rate: number;
  discountAmount?: number;
  discountPercent?: number;
  gstRate: number;
  cessRate?: number;
  supplyType: SupplyType;
}

export interface CalculatedItemValues {
  discountAmount: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
  totalAmount: number;
}

/**
 * Deterministically computes taxes for a single line item
 */
export function calculateLineItem(input: CalculateItemInput): CalculatedItemValues {
  const quantity = Math.max(0, input.quantity);
  const rate = Math.max(0, input.rate);
  const gross = round2(quantity * rate);

  let discount = 0;
  if (input.discountAmount && input.discountAmount > 0) {
    discount = Math.min(gross, round2(input.discountAmount));
  } else if (input.discountPercent && input.discountPercent > 0) {
    const pct = Math.min(100, Math.max(0, input.discountPercent));
    discount = round2((gross * pct) / 100);
  }

  const taxableValue = round2(gross - discount);
  const gstRate = Math.max(0, input.gstRate || 0);
  const cessRate = Math.max(0, input.cessRate || 0);

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (input.supplyType === 'INTRA_STATE') {
    // Split equally between CGST and SGST/UTGST
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = round2((taxableValue * cgstRate) / 100);
    sgstAmount = round2((taxableValue * sgstRate) / 100);
  } else {
    // Inter-State supply carries IGST
    igstRate = gstRate;
    igstAmount = round2((taxableValue * igstRate) / 100);
  }

  const cessAmount = cessRate > 0 ? round2((taxableValue * cessRate) / 100) : 0;
  const totalTax = round2(cgstAmount + sgstAmount + igstAmount + cessAmount);
  const totalAmount = round2(taxableValue + totalTax);

  return {
    discountAmount: discount,
    taxableValue,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalTax,
    totalAmount,
  };
}

/**
 * Calculates entire invoice totals and rate-wise tax breakdown
 */
export function calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  let grossAmount = 0;
  let totalDiscount = 0;
  let taxableValue = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let cessTotal = 0;
  let totalQuantity = 0;

  const breakdownMap = new Map<number, TaxBreakdown>();

  for (const item of items) {
    totalQuantity += item.quantity;
    grossAmount = round2(grossAmount + (item.quantity * item.rate));
    totalDiscount = round2(totalDiscount + (item.discountAmount || 0));
    taxableValue = round2(taxableValue + item.taxableValue);
    cgstTotal = round2(cgstTotal + item.cgstAmount);
    sgstTotal = round2(sgstTotal + item.sgstAmount);
    igstTotal = round2(igstTotal + item.igstAmount);
    cessTotal = round2(cessTotal + (item.cessAmount || 0));

    const currentRate = item.gstRate;
    const existing = breakdownMap.get(currentRate) || {
      gstRate: currentRate,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessAmount: 0,
      totalTax: 0,
    };

    existing.taxableValue = round2(existing.taxableValue + item.taxableValue);
    existing.cgstAmount = round2(existing.cgstAmount + item.cgstAmount);
    existing.sgstAmount = round2(existing.sgstAmount + item.sgstAmount);
    existing.igstAmount = round2(existing.igstAmount + item.igstAmount);
    existing.cessAmount = round2(existing.cessAmount + (item.cessAmount || 0));
    existing.totalTax = round2(existing.cgstAmount + existing.sgstAmount + existing.igstAmount + existing.cessAmount);

    breakdownMap.set(currentRate, existing);
  }

  const totalTax = round2(cgstTotal + sgstTotal + igstTotal + cessTotal);
  const rawGrandTotal = round2(taxableValue + totalTax);

  // Indian GST Round off to nearest whole rupee
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = round2(roundedGrandTotal - rawGrandTotal);

  return {
    itemCount: items.length,
    totalQuantity,
    grossAmount,
    totalDiscount,
    taxableValue,
    cgstTotal,
    sgstTotal,
    igstTotal,
    cessTotal,
    totalTax,
    roundOff,
    grandTotal: roundedGrandTotal,
    taxBreakdowns: Array.from(breakdownMap.values()).sort((a, b) => a.gstRate - b.gstRate),
  };
}

/**
 * Determines supply type based on Seller state and Place of Supply
 */
export function determineSupplyType(sellerStateCode: string, placeOfSupplyStateCode: string): SupplyType {
  if (!sellerStateCode || !placeOfSupplyStateCode) {
    return 'INTRA_STATE';
  }
  return sellerStateCode.trim() === placeOfSupplyStateCode.trim()
    ? 'INTRA_STATE'
    : 'INTER_STATE';
}
