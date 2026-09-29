import { Invoice, ValidationResult, ValidationError } from '../types';
import { validateGSTIN } from './gstinValidator';
import { calculateInvoiceTotals, calculateLineItem, round2 } from './gstEngine';

export function validateInvoice(
  invoice: Partial<Invoice>,
  existingInvoices: Invoice[] = []
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Business Profile Check
  if (!invoice.sellerDetails?.businessName?.trim()) {
    errors.push({
      field: 'sellerDetails.businessName',
      messageEn: 'Seller business name is required.',
      messageHi: 'विक्रेता के व्यवसाय का नाम अनिवार्य है।',
      severity: 'ERROR',
    });
  }

  if (!invoice.sellerDetails?.stateCode?.trim()) {
    errors.push({
      field: 'sellerDetails.stateCode',
      messageEn: 'Seller state & state code are required for tax determination.',
      messageHi: 'कर निर्धारण के लिए विक्रेता राज्य और राज्य कोड अनिवार्य है।',
      severity: 'ERROR',
    });
  }

  if (invoice.sellerDetails?.gstin) {
    const sellerGstinCheck = validateGSTIN(invoice.sellerDetails.gstin);
    if (!sellerGstinCheck.isValid) {
      errors.push({
        field: 'sellerDetails.gstin',
        messageEn: `Seller GSTIN format error: ${sellerGstinCheck.message}`,
        messageHi: `विक्रेता जीएसटी त्रुटि: अमान्य प्रारूप।`,
        severity: 'ERROR',
      });
    } else if (invoice.sellerDetails.stateCode && sellerGstinCheck.stateCode !== invoice.sellerDetails.stateCode) {
      warnings.push({
        field: 'sellerDetails.gstin',
        messageEn: `Seller GSTIN state code (${sellerGstinCheck.stateCode}) does not match registered state code (${invoice.sellerDetails.stateCode}).`,
        messageHi: `विक्रेता जीएसटी राज्य कोड चयनित राज्य से मेल नहीं खाता।`,
        severity: 'WARNING',
      });
    }
  }

  // 2. Buyer / Customer Validation
  if (!invoice.buyerDetails?.name?.trim()) {
    errors.push({
      field: 'buyerDetails.name',
      messageEn: 'Customer / Buyer name is required.',
      messageHi: 'ग्राहक / खरीदार का नाम अनिवार्य है।',
      severity: 'ERROR',
    });
  }

  if (!invoice.buyerDetails?.stateCode?.trim()) {
    errors.push({
      field: 'buyerDetails.stateCode',
      messageEn: 'Place of supply / Buyer state is required to calculate CGST/SGST vs IGST.',
      messageHi: 'कर गणना के लिए आपूर्ति का स्थान (राज्य) अनिवार्य है।',
      severity: 'ERROR',
    });
  }

  // Customer GSTIN validation
  if (invoice.buyerDetails?.customerType === 'B2B_REGISTERED') {
    if (!invoice.buyerDetails.gstin?.trim()) {
      errors.push({
        field: 'buyerDetails.gstin',
        messageEn: 'GSTIN is mandatory for B2B Registered customers.',
        messageHi: 'पंजीकृत (B2B) ग्राहक के लिए जीएसटी नंबर अनिवार्य है।',
        severity: 'ERROR',
      });
    } else {
      const buyerGstinCheck = validateGSTIN(invoice.buyerDetails.gstin);
      if (!buyerGstinCheck.isValid) {
        errors.push({
          field: 'buyerDetails.gstin',
          messageEn: `Customer GSTIN is invalid: ${buyerGstinCheck.message}`,
          messageHi: 'ग्राहक का जीएसटी नंबर अमान्य प्रारूप में है।',
          severity: 'ERROR',
        });
      }
    }
  } else if (invoice.buyerDetails?.gstin?.trim()) {
    // If entered even for B2C, check format
    const buyerGstinCheck = validateGSTIN(invoice.buyerDetails.gstin);
    if (!buyerGstinCheck.isValid) {
      warnings.push({
        field: 'buyerDetails.gstin',
        messageEn: `Customer GSTIN format looks invalid. Verify before issuing.`,
        messageHi: 'ग्राहक का जीएसटी प्रारूप संदेहास्पद लग रहा है।',
        severity: 'WARNING',
      });
    }
  }

  // 3. Invoice Number & Date
  if (!invoice.invoiceNumber?.trim()) {
    errors.push({
      field: 'invoiceNumber',
      messageEn: 'Invoice number is required.',
      messageHi: 'बीजक संख्या (Invoice Number) अनिवार्य है।',
      severity: 'ERROR',
    });
  } else {
    // Duplicate check for issued invoices
    const isDuplicate = existingInvoices.some(
      inv => inv.id !== invoice.id &&
             inv.invoiceNumber.trim().toLowerCase() === invoice.invoiceNumber?.trim().toLowerCase() &&
             inv.status !== 'CANCELLED'
    );
    if (isDuplicate) {
      errors.push({
        field: 'invoiceNumber',
        messageEn: `Invoice number "${invoice.invoiceNumber}" already exists. Sequential numbers must be unique.`,
        messageHi: `बीजक संख्या "${invoice.invoiceNumber}" पहले से मौजूद है। कृपया अद्वितीय संख्या दें।`,
        severity: 'ERROR',
      });
    }
  }

  if (!invoice.invoiceDate) {
    errors.push({
      field: 'invoiceDate',
      messageEn: 'Invoice date is required.',
      messageHi: 'बीजक तिथि अनिवार्य है।',
      severity: 'ERROR',
    });
  }

  // 4. Line Items Validation
  if (!invoice.items || invoice.items.length === 0) {
    errors.push({
      field: 'items',
      messageEn: 'Invoice must contain at least one line item.',
      messageHi: 'बीजक में कम से कम एक उत्पाद/वस्तु होना चाहिए।',
      severity: 'ERROR',
    });
  } else {
    invoice.items.forEach((item, index) => {
      const idx = index + 1;
      if (!item.productName?.trim()) {
        errors.push({
          field: `items[${index}].productName`,
          messageEn: `Item #${idx}: Product name cannot be blank.`,
          messageHi: `वस्तु #${idx}: उत्पाद का नाम रिक्त नहीं हो सकता।`,
          severity: 'ERROR',
        });
      }

      if (item.quantity <= 0) {
        errors.push({
          field: `items[${index}].quantity`,
          messageEn: `Item #${idx}: Quantity must be greater than zero.`,
          messageHi: `वस्तु #${idx}: मात्रा शून्य से अधिक होनी चाहिए।`,
          severity: 'ERROR',
        });
      }

      if (item.rate < 0) {
        errors.push({
          field: `items[${index}].rate`,
          messageEn: `Item #${idx}: Unit price cannot be negative.`,
          messageHi: `वस्तु #${idx}: मूल्य नकारात्मक नहीं हो सकता।`,
          severity: 'ERROR',
        });
      }

      if (!item.hsnCode?.trim()) {
        warnings.push({
          field: `items[${index}].hsnCode`,
          messageEn: `Item #${idx} (${item.productName || 'Unnamed'}): HSN/SAC code is recommended for GST compliance.`,
          messageHi: `वस्तु #${idx}: जीएसटी नियमों के अनुसार एचएसएन कोड अनुशंसित है।`,
          severity: 'WARNING',
        });
      }

      // Mathematical consistency check for each line item
      const recalc = calculateLineItem({
        quantity: item.quantity,
        rate: item.rate,
        discountAmount: item.discountAmount,
        discountPercent: item.discountPercent,
        gstRate: item.gstRate,
        cessRate: item.cessRate,
        supplyType: invoice.supplyType || 'INTRA_STATE',
      });

      if (Math.abs(recalc.taxableValue - item.taxableValue) > 0.05) {
        errors.push({
          field: `items[${index}].taxableValue`,
          messageEn: `Item #${idx}: Taxable value calculation mismatch (expected ₹${recalc.taxableValue}, found ₹${item.taxableValue}).`,
          messageHi: `वस्तु #${idx}: कर योग्य मूल्य गणना बेमेल।`,
          severity: 'ERROR',
        });
      }
    });

    // Totals verification
    if (invoice.totals) {
      const expectedTotals = calculateInvoiceTotals(invoice.items);
      if (Math.abs(expectedTotals.taxableValue - invoice.totals.taxableValue) > 0.1) {
        errors.push({
          field: 'totals.taxableValue',
          messageEn: `Total taxable value mismatch (expected ₹${expectedTotals.taxableValue}, found ₹${invoice.totals.taxableValue}).`,
          messageHi: `कुल कर योग्य मूल्य बेमेल।`,
          severity: 'ERROR',
        });
      }

      if (Math.abs(expectedTotals.grandTotal - invoice.totals.grandTotal) > 1) {
        errors.push({
          field: 'totals.grandTotal',
          messageEn: `Grand total mismatch (expected ₹${expectedTotals.grandTotal}, found ₹${invoice.totals.grandTotal}).`,
          messageHi: `कुल देय राशि गणना बेमेल।`,
          severity: 'ERROR',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
