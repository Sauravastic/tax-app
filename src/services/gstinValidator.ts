import { GSTState } from '../types';

export const INDIAN_STATES: GSTState[] = [
  { code: '01', name: 'Jammu and Kashmir', tin: '01' },
  { code: '02', name: 'Himachal Pradesh', tin: '02' },
  { code: '03', name: 'Punjab', tin: '03' },
  { code: '04', name: 'Chandigarh', tin: '04' },
  { code: '05', name: 'Uttarakhand', tin: '05' },
  { code: '06', name: 'Haryana', tin: '06' },
  { code: '07', name: 'Delhi', tin: '07' },
  { code: '08', name: 'Rajasthan', tin: '08' },
  { code: '09', name: 'Uttar Pradesh', tin: '09' },
  { code: '10', name: 'Bihar', tin: '10' },
  { code: '11', name: 'Sikkim', tin: '11' },
  { code: '12', name: 'Arunachal Pradesh', tin: '12' },
  { code: '13', name: 'Nagaland', tin: '13' },
  { code: '14', name: 'Manipur', tin: '14' },
  { code: '15', name: 'Mizoram', tin: '15' },
  { code: '16', name: 'Tripura', tin: '16' },
  { code: '17', name: 'Meghalaya', tin: '17' },
  { code: '18', name: 'Assam', tin: '18' },
  { code: '19', name: 'West Bengal', tin: '19' },
  { code: '20', name: 'Jharkhand', tin: '20' },
  { code: '21', name: 'Odisha', tin: '21' },
  { code: '22', name: 'Chhattisgarh', tin: '22' },
  { code: '23', name: 'Madhya Pradesh', tin: '23' },
  { code: '24', name: 'Gujarat', tin: '24' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', tin: '26' },
  { code: '27', name: 'Maharashtra', tin: '27' },
  { code: '29', name: 'Karnataka', tin: '29' },
  { code: '30', name: 'Goa', tin: '30' },
  { code: '31', name: 'Lakshadweep', tin: '31' },
  { code: '32', name: 'Kerala', tin: '32' },
  { code: '33', name: 'Tamil Nadu', tin: '33' },
  { code: '34', name: 'Puducherry', tin: '34' },
  { code: '35', name: 'Andaman and Nicobar Islands', tin: '35' },
  { code: '36', name: 'Telangana', tin: '36' },
  { code: '37', name: 'Andhra Pradesh', tin: '37' },
  { code: '38', name: 'Ladakh', tin: '38' },
  { code: '97', name: 'Other Territory', tin: '97' },
];

export interface GSTINValidationResult {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityNumber?: string;
  checksum?: string;
  status: 'VERIFIED' | 'NEEDS_VERIFICATION' | 'INVALID';
  message: string;
}

export function validateGSTIN(gstin: string): GSTINValidationResult {
  if (!gstin || typeof gstin !== 'string') {
    return {
      isValid: false,
      status: 'INVALID',
      message: 'GSTIN is empty or missing.',
    };
  }

  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return {
      isValid: false,
      status: 'INVALID',
      message: `GSTIN must be exactly 15 characters long (currently ${clean.length}).`,
    };
  }

  // Regex format check
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return {
      isValid: false,
      status: 'INVALID',
      message: 'Invalid GSTIN structure. Expected: 2 digits (state) + 10 chars (PAN) + 1 char (entity) + Z + 1 check digit.',
    };
  }

  const stateCode = clean.substring(0, 2);
  const pan = clean.substring(2, 12);
  const entityNumber = clean.substring(12, 13);
  const checksum = clean.substring(14, 15);

  const matchedState = INDIAN_STATES.find(s => s.code === stateCode);
  if (!matchedState) {
    return {
      isValid: false,
      status: 'INVALID',
      stateCode,
      pan,
      message: `Invalid state code "${stateCode}" in GSTIN. Must match valid Indian GST state code (01-38, 97).`,
    };
  }

  // Checksum mathematical verification algorithm (ISO/IEC 7064 Mod 36, 36)
  const isChecksumValid = verifyGSTINChecksum(clean);

  return {
    isValid: true,
    stateCode,
    stateName: matchedState.name,
    pan,
    entityNumber,
    checksum,
    status: isChecksumValid ? 'VERIFIED' : 'NEEDS_VERIFICATION',
    message: isChecksumValid 
      ? `Valid GSTIN registered in ${matchedState.name}. PAN: ${pan}`
      : `Format valid for ${matchedState.name}, checksum may require confirmation.`,
  };
}

export function getStateByCode(code: string): GSTState | undefined {
  return INDIAN_STATES.find(s => s.code === code);
}

export function getStateByName(name: string): GSTState | undefined {
  return INDIAN_STATES.find(s => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * ISO 7064 Mod 36, 36 checksum implementation for GSTIN
 */
function verifyGSTINChecksum(gstin: string): boolean {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 1;
  let sum = 0;
  const checkChar = gstin[14];

  for (let i = 0; i < 14; i++) {
    const codePoint = chars.indexOf(gstin[i]);
    if (codePoint === -1) return false;
    let digit = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / 36) + (digit % 36);
    sum += digit;
  }

  const remainder = sum % 36;
  let checkCodePoint = (36 - remainder) % 36;
  return chars[checkCodePoint] === checkChar;
}
