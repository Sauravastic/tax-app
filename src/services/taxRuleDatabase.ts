import { TaxRule } from '../types';

export const CURRENT_TAX_RULE_VERSION = 'v2026.1';
export const TAX_RULE_LAST_VERIFIED = '2026-04-01';
export const TAX_RULE_SOURCE = 'CBIC / GST Council Notifications (Standard Schedule)';

export const CURRENT_TAX_RULE: TaxRule = {
  version: CURRENT_TAX_RULE_VERSION,
  effectiveFrom: '2026-04-01',
  rates: [0, 0.25, 3, 5, 12, 18, 28],
  standardHsnCategories: [
    {
      category: 'Electronics & Hardware',
      hsn: '8471',
      description: 'Automatic data processing machines, computers, servers & units',
      defaultGstRate: 18,
    },
    {
      category: 'Electronics & Accessories',
      hsn: '8504',
      description: 'Electrical transformers, static converters (e.g. UPS), power adapters',
      defaultGstRate: 18,
    },
    {
      category: 'Telecommunications',
      hsn: '8517',
      description: 'Telephone sets, smartphones, transmission and reception apparatus',
      defaultGstRate: 18,
    },
    {
      category: 'Textiles & Garments',
      hsn: '6203',
      description: "Men's or boys' suits, jackets, blazers, trousers (value above ₹1,000)",
      defaultGstRate: 12,
    },
    {
      category: 'Textiles & Garments',
      hsn: '6204',
      description: "Women's or girls' suits, dresses, skirts, trousers",
      defaultGstRate: 12,
    },
    {
      category: 'Footwear',
      hsn: '6403',
      description: 'Footwear with outer soles of rubber, plastics, leather',
      defaultGstRate: 18,
    },
    {
      category: 'Stationery & Paper',
      hsn: '4820',
      description: 'Registers, account books, notebooks, order books, receipt pads',
      defaultGstRate: 18,
    },
    {
      category: 'FMCG & Groceries',
      hsn: '0405',
      description: 'Butter and other fats and oils derived from milk; dairy spreads',
      defaultGstRate: 12,
    },
    {
      category: 'FMCG & Groceries',
      hsn: '1905',
      description: 'Bread, pastry, cakes, biscuits and other bakers wares (Packaged)',
      defaultGstRate: 18,
    },
    {
      category: 'Pharmaceuticals',
      hsn: '3004',
      description: 'Medicaments consisting of mixed or unmixed products for therapeutic uses',
      defaultGstRate: 12,
    },
    {
      category: 'Construction & Electricals',
      hsn: '7308',
      description: 'Structures and parts of structures of iron or steel',
      defaultGstRate: 18,
    },
    {
      category: 'Automotive & Parts',
      hsn: '8708',
      description: 'Parts and accessories of motor vehicles',
      defaultGstRate: 28,
    },
    {
      category: 'Automotive & Tyres',
      hsn: '4011',
      description: 'New pneumatic tyres, of rubber',
      defaultGstRate: 28,
    },
    {
      category: 'Professional Services',
      hsn: '9983',
      description: 'Other professional, technical and business services (IT, Consulting)',
      defaultGstRate: 18,
    },
    {
      category: 'Legal & Accounting Services',
      hsn: '9982',
      description: 'Legal and accounting services, auditing, bookkeeping',
      defaultGstRate: 18,
    },
    {
      category: 'Transport & Logistics',
      hsn: '9965',
      description: 'Goods transport services (GTA)',
      defaultGstRate: 5,
    },
    {
      category: 'Essential Commodities',
      hsn: '1006',
      description: 'Rice (unbranded or exempted loose grains)',
      defaultGstRate: 0,
    }
  ]
};

export function getHsnSuggestions(query: string) {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  return CURRENT_TAX_RULE.standardHsnCategories.filter(
    item =>
      item.hsn.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}
