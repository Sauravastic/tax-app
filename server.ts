import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { supabase } from './src/services/supabaseServer';
dotenv.config();

const app = express();
const PORT = 3000;
const DEFAULT_DATABASE_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Lazy GenAI client with required telemetry header
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

function readCookie(req: express.Request, name: string): string | null {
  const header = req.headers.cookie || '';
  const match = header.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function setSessionCookie(res: express.Response, accessToken: string, refreshToken?: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookies = [
    `smartbill_session=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`,
  ];
  if (refreshToken) {
    cookies.push(`smartbill_refresh=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`);
  }
  res.setHeader('Set-Cookie', cookies);
}

function clearSessionCookie(res: express.Response) {
  res.setHeader('Set-Cookie', [
    'smartbill_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
    'smartbill_refresh=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
  ]);
}

function toUserSession(user: { id: string; email?: string; user_metadata?: Record<string, any> }) {
  return {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Owner',
    email: user.email || '',
    role: user.user_metadata?.role || 'Owner',
    businessId: DEFAULT_DATABASE_BUSINESS_ID,
  };
}

async function getAuthenticatedUser(req: express.Request, res?: express.Response) {
  const token = readCookie(req, 'smartbill_session');
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) return data.user;
  }

  const refreshToken = readCookie(req, 'smartbill_refresh');
  if (!refreshToken) return null;
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.user || !data.session) return null;
  if (res) setSessionCookie(res, data.session.access_token, data.session.refresh_token);
  return data.user;
}

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  setSessionCookie(res, data.session.access_token, data.session.refresh_token);
  return res.json({ user: toUserSession(data.user) });
});

app.get('/api/auth/session', async (req, res) => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return res.status(401).json({ user: null });
  return res.json({ user: toUserSession(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.status(204).send();
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const origin = `${req.protocol}://${req.get('host')}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/?reset=1`,
  });
  if (error) {
    console.error('Password reset request error:', error.message);
  }

  // Avoid revealing whether an email exists in the account database.
  return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const accessToken = String(req.body?.accessToken || '');
  const password = String(req.body?.password || '');
  if (!accessToken || password.length < 8) {
    return res.status(400).json({ error: 'A recovery token and a password of at least 8 characters are required' });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return res.status(401).json({ error: 'Recovery link is invalid or expired' });

  const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password });
  if (updateError) return res.status(400).json({ error: updateError.message });

  setSessionCookie(res, accessToken);
  return res.json({ user: toUserSession(data.user) });
});

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  res.locals.authUser = user;
  return next();
}

// All application APIs below this point require a valid Supabase Auth session.
app.use('/api', requireAuth);

async function ensureDefaultBusiness() {
  const { error } = await supabase
    .from('businesses')
    .upsert({
      id: DEFAULT_DATABASE_BUSINESS_ID,
      business_name: 'Sharma Electricals & Hardware',
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Default business setup failed: ${error.message}`);
  }
}

// Advisory HSN Suggestion API (Clearly marked as advisory, never authoritative)
// Standard fallback HSN generator for offline/quota exceeded scenarios
function generateLocalFallbackHsn(query: string) {
  const q = (query || "").toLowerCase();
  const candidates = [
    { match: ["laptop", "computer", "pc", "server", "cpu", "it", "hardware"], hsn: "8471", desc: "Automatic data processing machines & units", rate: 18 },
    { match: ["monitor", "display", "screen", "tv", "led"], hsn: "8528", desc: "Monitors, projectors and television reception apparatus", rate: 18 },
    { match: ["software", "cloud", "saas", "app", "license", "consulting", "service", "development"], hsn: "9983", desc: "Information technology & professional consulting services", rate: 18 },
    { match: ["mobile", "phone", "smartphone", "cellular"], hsn: "8517", desc: "Telephone sets, smartphones and other transmission apparatus", rate: 18 },
    { match: ["cloth", "shirt", "pant", "garment", "apparel", "dress", "textile", "cotton"], hsn: "6203", desc: "Men's or boys' suits, jackets, trousers and apparel", rate: 12 },
    { match: ["rice", "grain", "wheat", "flour", "cereal"], hsn: "1006", desc: "Rice, grains and cereals", rate: 5 },
    { match: ["milk", "dairy", "butter", "cheese", "paneer"], hsn: "0401", desc: "Milk and dairy products", rate: 5 },
    { match: ["medicine", "pharma", "tablet", "drug", "syrup"], hsn: "3004", desc: "Medicaments consisting of mixed or unmixed products", rate: 12 },
    { match: ["freight", "transport", "logistics", "courier"], hsn: "9965", desc: "Goods transport agency (GTA) services", rate: 5 },
    { match: ["furniture", "chair", "table", "desk"], hsn: "9403", desc: "Other furniture and parts thereof", rate: 18 },
    { match: ["car", "motor", "vehicle", "automobile"], hsn: "8703", desc: "Motor cars and vehicles", rate: 28 },
    { match: ["book", "stationery", "notebook", "pen"], hsn: "4901", desc: "Printed books, brochures and stationery", rate: 0 },
  ];

  const matched = candidates.find(c => c.match.some(m => q.includes(m)));
  if (matched) {
    return [
      {
        hsn: matched.hsn,
        description: matched.desc,
        suggestedRate: matched.rate,
        confidence: "High",
        notes: "Standard statutory GST classification under CBIC tariff schedule.",
      }
    ];
  }

  return [
    {
      hsn: "8471",
      description: "Automatic data processing machines / general goods",
      suggestedRate: 18,
      confidence: "Medium",
      notes: "Standard standard rate (18%) under general GST schedule.",
    },
    {
      hsn: "9983",
      description: "Other professional, technical and business services",
      suggestedRate: 18,
      confidence: "Medium",
      notes: "Standard services classification under SAC heading 9983.",
    }
  ];
}

// Deterministic, rich contextual assistant engine using live accounting data
function generateLocalContextReply(messages: any[], systemContext: any, prefixNotice: string = ""): string {
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.text || "";
  const lower = lastUserMsg.toLowerCase();
  const profile = systemContext?.businessProfile || {};
  const metrics = systemContext?.metrics || {};
  const lowStock = systemContext?.lowStockItems || [];
  const recentInvoices = systemContext?.recentInvoices || [];
  const unpaidInvoices = systemContext?.unpaidInvoices || [];
  const productCount = systemContext?.productCount || 0;
  const customerCount = systemContext?.customerCount || 0;

  let body = "";

  if (lower.includes("sale") || lower.includes("revenue") || lower.includes("turnover") || lower.includes("metric") || lower.includes("total") || lower.includes("earning") || lower.includes("billi") || lower.includes("कमाई") || lower.includes("बिक्री")) {
    body = `### 📊 Live Financial Metrics & Revenue Summary\n\n` +
      `- **Total Invoiced Revenue**: ₹${Number(metrics.totalRevenue || 0).toLocaleString('en-IN')}\n` +
      `- **Total GST Collected**: ₹${Number(metrics.totalGst || 0).toLocaleString('en-IN')}\n` +
      `  - **CGST**: ₹${Number(metrics.totalCgst || 0).toLocaleString('en-IN')}\n` +
      `  - **SGST**: ₹${Number(metrics.totalSgst || 0).toLocaleString('en-IN')}\n` +
      `  - **IGST**: ₹${Number(metrics.totalIgst || 0).toLocaleString('en-IN')}\n` +
      `- **Total Invoices Issued**: ${metrics.totalInvoices || 0} (${metrics.paidCount || 0} Paid, ${metrics.partialCount || 0} Partially Paid, ${unpaidInvoices.length} Unpaid)\n` +
      `- **Outstanding Receivables (Dues)**: ₹${Number(metrics.outstandingDues || 0).toLocaleString('en-IN')}\n\n` +
      `*All figures are deterministically computed in real-time from your active accounting ledger.*`;
  } else if (lower.includes("unpaid") || lower.includes("pending") || lower.includes("due") || lower.includes("debt") || lower.includes("owe") || lower.includes("बकाया") || lower.includes("उधार")) {
    if (unpaidInvoices.length === 0) {
      body = `### ✅ Outstanding Dues & Debtors\n\n` +
        `**Zero outstanding balances!** All issued invoices in the system have been settled in full. There are no overdue accounts receivable at this time.`;
    } else {
      body = `### ⚠️ Outstanding Invoices (${unpaidInvoices.length} pending)\n\n` +
        `Total Outstanding Receivables: **₹${Number(metrics.outstandingDues || 0).toLocaleString('en-IN')}**\n\n` +
        unpaidInvoices.slice(0, 8).map((inv: any) => `- **${inv.invoiceNumber}** — **${inv.customerName}**: ₹${Number(inv.balanceAmount || inv.amount || inv.totalAmount || 0).toLocaleString('en-IN')} pending (${inv.date || 'Active'})`).join('\n') +
        `\n\n*To settle these invoices, navigate to the **Payments** tab or open the invoice directly.*`;
    }
  } else if (lower.includes("stock") || lower.includes("inventory") || lower.includes("product") || lower.includes("item") || lower.includes("माल") || lower.includes("स्टॉक")) {
    if (lowStock.length === 0) {
      body = `### 📦 Inventory Status\n\n` +
        `- **Total Catalog Items**: ${productCount} active products/services.\n` +
        `- **Low Stock Alerts**: **0** items. All tracked products are currently above their statutory reorder safety thresholds.\n\n` +
        `You can manage inventory quantities, record inward consignments, or adjust stock in the **Products & Inventory** module.`;
    } else {
      body = `### ⚠️ Low Stock Alert (${lowStock.length} items need replenishment)\n\n` +
        `The following items have dropped below their minimum safety reorder threshold:\n\n` +
        lowStock.map((p: any) => `- **${p.name}** (SKU: \`${p.sku || 'N/A'}\`): Current Stock **${p.stock}** ${p.unit || 'units'} *(Safety Threshold: ${p.minStock || 5} ${p.unit || 'units'})*`).join('\n') +
        `\n\n*You can record incoming supplier stock via the **Stock Inward** button in the Products section.*`;
    }
  } else if (lower.includes("eway") || lower.includes("e-way") || lower.includes("threshold") || lower.includes("way bill")) {
    body = `### 🚚 Statutory E-Way Bill Rules (Rule 138 of CGST Rules)\n\n` +
      `- **Statutory Consignment Threshold**: Generation of an E-Way Bill is mandatory for **inter-state movement of goods** where the consignment value exceeds **₹50,000** (some states have higher thresholds for intra-state movement).\n` +
      `- **Components**: \n` +
      `  - **Part A**: GSTIN of supplier & recipient, Place of delivery, Invoice number & date, HSN code, Reason for transportation.\n` +
      `  - **Part B**: Vehicle number (transporter details).\n` +
      `- **Validity Period**: 1 day for every 200 km (or part thereof) for regular cargo; 1 day for every 20 km for Over Dimensional Cargo (ODC).\n` +
      `- **Exemptions**: Non-motorized conveyance, exempt goods (unbranded grains, fruits, vegetables), customs port transit under customs supervision.`;
  } else if (lower.includes("credit note") || lower.includes("debit note") || lower.includes("return") || lower.includes("refund")) {
    body = `### 📝 GST Credit Notes & Debit Notes (Section 34 of CGST Act)\n\n` +
      `- **When to Issue a Credit Note**: \n` +
      `  1. The taxable value or tax charged in original tax invoice exceeds the actual value.\n` +
      `  2. Goods supplied are returned by the recipient (sales return / damaged goods).\n` +
      `  3. Goods or services are found deficient.\n` +
      `- **Statutory Time Limit**: Must be declared in the monthly return on or before **30th November** following the end of the financial year, or the date of furnishing the annual return (GSTR-9), whichever is earlier.\n` +
      `- **Invoice Reference**: A credit note must contain original invoice number, original invoice date, and reason for issuance.`;
  } else if (lower.includes("place of supply") || lower.includes("pos") || lower.includes("interstate") || lower.includes("intrastate") || lower.includes("igst") || lower.includes("cgst")) {
    body = `### 🏛️ Place of Supply & GST Tax Classification\n\n` +
      `- **Intra-State Supply**:\n` +
      `  - Occurs when the **Location of Supplier** and the **Place of Supply (Buyer State)** are in the **same State / Union Territory**.\n` +
      `  - **Taxes Applied**: **CGST (50%) + SGST (50%)** (or UTGST for Union Territories).\n` +
      `- **Inter-State Supply**:\n` +
      `  - Occurs when the **Location of Supplier** and the **Place of Supply** are in **different States**.\n` +
      `  - **Taxes Applied**: **IGST (100%)**.\n` +
      `- **Current Business State**: ${profile.state || 'Configured in Business Profile'} (State Code: \`${profile.stateCode || 'N/A'}\`).`;
  } else if (lower.includes("profile") || lower.includes("gstin") || lower.includes("bank") || lower.includes("company") || lower.includes("business") || lower.includes("ifsc") || lower.includes("upi")) {
    body = `### 🏢 Registered Business Profile\n\n` +
      `- **Business Name**: ${profile.businessName || 'Not configured'} ${profile.tradeName ? `(${profile.tradeName})` : ''}\n` +
      `- **GSTIN**: \`${profile.gstin || 'Not registered'}\`\n` +
      `- **State**: ${profile.state || 'Not set'} (State Code: \`${profile.stateCode || 'N/A'}\`)\n` +
      `- **Address**: ${profile.address || 'N/A'}, ${profile.city || ''} ${profile.pincode || ''}\n` +
      `- **Bank Details**: ${profile.bankDetails?.bankName || 'N/A'} | A/C: \`${profile.bankDetails?.accountNumber || 'N/A'}\` | IFSC: \`${profile.bankDetails?.ifsc || 'N/A'}\`\n` +
      `- **UPI ID**: \`${profile.bankDetails?.upiId || 'Not set'}\`\n\n` +
      `*You can update your business profile, signature, and bank information in the **Business Profile** tab.*`;
  } else if (lower.includes("invoice") || lower.includes("bill") || lower.includes("रसीद") || lower.includes("बिल")) {
    body = `### 📄 Invoice Overview\n\n` +
      `- **Total Invoices in Database**: ${metrics.totalInvoices || 0}\n` +
      `- **Total Invoiced Value**: ₹${Number(metrics.totalRevenue || 0).toLocaleString('en-IN')}\n\n` +
      `**Recent Invoices**:\n` +
      (recentInvoices.length > 0 
        ? recentInvoices.map((inv: any) => `- **${inv.invoiceNumber}** — ${inv.customerName}: ₹${Number(inv.amount || 0).toLocaleString('en-IN')} (${inv.status}, ${inv.date})`).join('\n')
        : 'No invoices recorded yet.') +
      `\n\n*Click **Create Invoice** for B2B tax invoices or **Quick Bill** for rapid retail checkouts.*`;
  } else if (lower.includes("customer") || lower.includes("client") || lower.includes("buyer") || lower.includes("ग्राहक")) {
    body = `### 👥 Customer Ledger Summary\n\n` +
      `- **Registered Customers**: ${customerCount}\n` +
      `- **Total Outstanding Receivables**: ₹${Number(metrics.outstandingDues || 0).toLocaleString('en-IN')}\n` +
      `- **Customers with Pending Dues**: ${unpaidInvoices.length}\n\n` +
      `*You can add new clients, view ledger histories, and track balances under the **Customers** tab.*`;
  } else {
    body = `### 💡 SmartBill Copilot Support\n\n` +
      `I am actively connected to your live system data. Here is your current business pulse:\n\n` +
      `- **Gross Invoiced**: ₹${Number(metrics.totalRevenue || 0).toLocaleString('en-IN')}\n` +
      `- **GST Collected**: ₹${Number(metrics.totalGst || 0).toLocaleString('en-IN')}\n` +
      `- **Pending Dues**: ₹${Number(metrics.outstandingDues || 0).toLocaleString('en-IN')}\n` +
      `- **Tracked Products**: ${productCount} items (${lowStock.length} needing reorder)\n\n` +
      `**Quick Questions You Can Ask**:\n` +
      `- *"What are my total sales and GST collected?"*\n` +
      `- *"Which clients have pending unpaid invoices?"*\n` +
      `- *"Which inventory items are running low on stock?"*\n` +
      `- *"What are the statutory E-Way bill threshold rules?"*\n` +
      `- *"How does Place of Supply work for inter-state deliveries?"*`;
  }

  return prefixNotice ? `${prefixNotice}\n\n${body}` : body;
}

// Advisory HSN Suggestion API (Clearly marked as advisory, never authoritative)
app.post("/api/ai/suggest-hsn", async (req, res) => {
  const { query, category } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Product description query is required" });
  }

  const aiClient = getGenAI();
  if (!aiClient) {
    // Graceful offline fallback with common HSN items
    return res.json({
      source: "local-fallback",
      suggestions: generateLocalFallbackHsn(query),
      disclaimer: "AI service key not configured. Using standard rule recommendations. Please verify before issuing invoice."
    });
  }

  try {
    const prompt = `You are a GST assistant for India. The user wants HSN/SAC candidates for the product: "${query}" (category: "${category || "General"}").
Return a JSON array of up to 3 candidate HSN/SAC codes in strictly this format:
[
  {
    "hsn": "4-digit or 6-digit code",
    "description": "Short description of goods/services under GST",
    "suggestedRate": 5 or 12 or 18 or 28 or 0,
    "confidence": "High" | "Medium" | "Low",
    "notes": "Brief explanation"
  }
]
Do not fabricate codes. Only provide well-known standard GST classifications. Return JSON only.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    let suggestions = [];
    try {
      suggestions = JSON.parse(text);
    } catch {
      suggestions = generateLocalFallbackHsn(query);
    }

    return res.json({
      source: "gemini-3.8-flash",
      suggestions: Array.isArray(suggestions) && suggestions.length > 0 ? suggestions : generateLocalFallbackHsn(query),
      disclaimer: "These are advisory suggestions only. GST classification and rate must be confirmed by the user before issuing the invoice."
    });
  } catch (err: any) {
    console.warn("Gemini HSN suggestion error (falling back to standard tariff schedule):", err?.message || err);
    return res.json({
      source: "fallback",
      suggestions: generateLocalFallbackHsn(query),
      disclaimer: "Advisory suggestion service using standard GST tariff schedule. Please verify before issuing invoice."
    });
  }
});

// Context-Aware Gemini Chatbot with Conversational Memory, Google Search Grounding, and Seamless Offline Fallback
app.post("/api/ai/chat", async (req, res) => {
  const { messages, systemContext, enableSearch = true } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "A non-empty messages array is required" });
  }

  const aiClient = getGenAI();

  // If no API key configured, provide a rich context-aware offline assistant
  if (!aiClient) {
    const offlineReply = generateLocalContextReply(messages, systemContext);
    return res.json({
      reply: offlineReply,
      sources: [],
      searchQueries: [],
      usedSearch: false,
      isOffline: true,
      disclaimer: "Local system query response. All accounting numbers are deterministically computed."
    });
  }

  try {
    // Format conversation history for Gemini API
    const formattedContents = messages.map((m: any) => {
      const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: m.text || m.content || "" }],
      };
    });

    // Build rich, structured system instruction with full business context
    const profile = systemContext?.businessProfile || {};
    const metrics = systemContext?.metrics || {};
    const recentInvoices = systemContext?.recentInvoices || [];
    const unpaidInvoices = systemContext?.unpaidInvoices || [];
    const lowStockItems = systemContext?.lowStockItems || [];
    const productCount = systemContext?.productCount || 0;
    const customerCount = systemContext?.customerCount || 0;

    const systemInstruction = `You are "SmartBill Copilot", an elite, context-aware AI Support Agent and Indian GST advisor embedded in Inventory and SmartBill Generator.
Current Date/Time: ${new Date().toISOString()}

=== LIVE SYSTEM BUSINESS CONTEXT ===
- Registered Business Name: ${profile.businessName || "Not set"} (Trade Name: ${profile.tradeName || "N/A"})
- GSTIN: ${profile.gstin || "Unregistered"} | State: ${profile.state || "N/A"} (Code: ${profile.stateCode || "N/A"})
- Address: ${profile.address || "N/A"}, ${profile.city || ""}, ${profile.pincode || ""}
- Bank Details: ${profile.bankDetails?.bankName || "N/A"} | A/C: ${profile.bankDetails?.accountNumber || "N/A"} | IFSC: ${profile.bankDetails?.ifsc || "N/A"} | UPI: ${profile.bankDetails?.upiId || "N/A"}

=== CURRENT FINANCIAL METRICS ===
- Total Issued Invoices: ${metrics.totalInvoices || 0}
- Total Gross Sales (Invoiced): ₹${Number(metrics.totalRevenue || 0).toLocaleString('en-IN')}
- Total GST Collected: ₹${Number(metrics.totalGst || 0).toLocaleString('en-IN')} (CGST: ₹${Number(metrics.totalCgst || 0).toLocaleString('en-IN')}, SGST: ₹${Number(metrics.totalSgst || 0).toLocaleString('en-IN')}, IGST: ₹${Number(metrics.totalIgst || 0).toLocaleString('en-IN')})
- Total Outstanding Balance (Receivables): ₹${Number(metrics.outstandingDues || 0).toLocaleString('en-IN')}
- Paid Invoices: ${metrics.paidCount || 0} | Partially Paid: ${metrics.partialCount || 0} | Unpaid: ${unpaidInvoices.length}

=== INVENTORY & CLIENTS SUMMARY ===
- Registered Customers: ${customerCount}
- Tracked Products in Catalog: ${productCount}
- Low Stock Items (${lowStockItems.length}): ${JSON.stringify(lowStockItems.slice(0, 5))}
- Top Debtors/Unpaid Invoices: ${JSON.stringify(unpaidInvoices.slice(0, 5))}
- Recent Invoices: ${JSON.stringify(recentInvoices.slice(0, 5))}

=== YOUR CAPABILITIES & INSTRUCTIONS ===
1. CONTEXT-AWARE SYSTEM SUPPORT:
   - You know the user's business metrics, invoices, customers, and inventory down to the exact rupee.
   - When asked about their numbers, quote the exact figures from the context above in Indian numbering format (₹, Lakhs, Crores).
   - If they ask to troubleshoot or execute multi-step workflows (e.g., creating an invoice, generating a credit note, filing GSTR-1, or re-stocking items), guide them step-by-step, remembering the conversation thread.

2. GOOGLE SEARCH & REAL-TIME KNOWLEDGE:
   - You have Google Search grounding enabled!
   - Use Google Search to fetch up-to-date real-time information: recent GST Council meetings, latest rate notifications from CBIC, E-way bill portal rules, budget announcements, Indian economic news, market commodity rates, HSN classification changes, or general current events.
   - When citing real-world events, recent news, or tax circulars, clearly state the facts and cite the context accurately.

3. STATUTORY GST RULES:
   - Intra-State Supply (Seller State == Place of Supply): CGST (50%) + SGST (50%).
   - Inter-State Supply (Seller State != Place of Supply): IGST (100%).
   - Union Territory: UTGST replaces SGST.
   - GST Slabs: 0%, 5%, 12%, 18%, 28%.
   - E-Way Bill requirement: Inter-state movement of goods exceeding ₹50,000 consignment value.
   - Remind the user that AI answers are advisory and formal legal filings should be coordinated with their CA/tax professional.

4. FORMATTING:
   - Write clean, well-structured Markdown with bullet points and bold highlights.
   - Be concise, friendly, and practical. Avoid overly long corporate fluff.`;

    const config: any = {
      systemInstruction,
    };

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-3.8-flash",
      contents: formattedContents,
      config,
    });

    const reply = response.text || "I processed your request, but received an empty response. Please feel free to ask again.";

    // Extract Google Search grounding metadata and source citations
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const searchQueries: string[] = groundingMetadata?.webSearchQueries || [];
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const sources: Array<{ title: string; url: string }> = [];

    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    // Deduplicate sources by URL
    const uniqueSources = sources.filter(
      (src, index, self) => index === self.findIndex(s => s.url === src.url)
    );

    return res.json({
      reply,
      sources: uniqueSources,
      searchQueries,
      usedSearch: uniqueSources.length > 0 || searchQueries.length > 0,
      disclaimer: "Advisory AI response grounded with live web search and current system context."
    });
  } catch (err: any) {
    console.warn("Gemini Chatbot error (switching to offline context engine):", err?.message || err);

    // Detect quota exhaustion (429 / RESOURCE_EXHAUSTED)
    const isQuotaExceeded = 
      err?.status === 429 || 
      err?.code === 429 || 
      err?.message?.includes("429") || 
      err?.message?.includes("quota") || 
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("rate-limits");

    const fallbackNotice = isQuotaExceeded
      ? "> ⚡ **Gemini Quota Notice (429 Rate Limit)**: API quota limit reached. SmartBill Copilot has seamlessly switched to offline intelligence mode using your live system database."
      : "> ℹ️ **Offline Intelligence Mode**: SmartBill Copilot has answered using your live system accounting records.";

    const fallbackReply = generateLocalContextReply(messages, systemContext, fallbackNotice);

    // Return 200 with fallback reply so user never sees 500 error or broken chat
    return res.json({
      reply: fallbackReply,
      sources: [],
      searchQueries: [],
      usedSearch: false,
      isQuotaExceeded,
      fallbackMode: true,
      disclaimer: "Offline context response computed deterministically from your live system records."
    });
  }
});

// Advisory Business Assistant API (Legacy bridge)
app.post("/api/ai/assistant", async (req, res) => {
  const { question, prompt, context } = req.body;
  const userQuery = question || prompt;
  if (!userQuery) {
    return res.status(400).json({ error: "Question or prompt is required" });
  }

  const aiClient = getGenAI();
  if (!aiClient) {
    return res.json({
      answer: "SmartBill AI Assistant is running in offline mode. Please review your Dashboard and GST Summary screens for live sales and tax analytics.",
      reply: "SmartBill AI Assistant is running in offline mode. Please review your Dashboard and GST Summary screens for live sales and tax analytics.",
      disclaimer: "Advisory answer. Financial metrics are deterministically tracked in your dashboard."
    });
  }

  try {
    const systemPrompt = `You are SmartBill Assistant, a helpful assistant for Indian GST billing and small business accounting.
Business summary context:
${JSON.stringify(context || {})}

User question: "${userQuery}"

Guidelines:
1. Answer clearly, concisely, and helpfully.
2. If citing numbers from context, be accurate to the provided data.
3. NEVER invent or fabricate tax rates, IRNs, government approvals, or e-way bill numbers.
4. If asked legal or tax advice, remind the user to consult their Chartered Accountant (CA) or tax professional.
Keep response under 150 words.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.8-flash",
      contents: systemPrompt,
    });

    const text = response.text || "No response generated.";
    return res.json({
      answer: text,
      reply: text,
      disclaimer: "This information is advisory. All financial reports and calculations are deterministically computed."
    });
  } catch (err: any) {
    console.error("Gemini assistant error:", err);
    return res.json({
      answer: "Unable to process query with AI assistant at this moment. You can review all your figures directly in the Dashboard and Reports tabs.",
      reply: "Unable to process query with AI assistant at this moment. You can review all your figures directly in the Dashboard and Reports tabs.",
      disclaimer: "Advisory note."
    });
  }
});

// Vite middleware for dev or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GST SmartBill server running on port ${PORT}`);
  });
}


function toCustomerModel(row: any) {
  return {
    ...row,
    customerType: row.customerType || row.customer_type || 'CONSUMER',
    businessId: row.business_id,
    businessName: row.business_name,
    stateCode: row.state_code,
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || 'Delhi',
    pinCode: row.pin_code || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    totalInvoiced: Number(row.total_invoiced || 0),
    totalPaid: Number(row.total_paid || 0),
    outstandingBalance: Number(row.outstanding_balance || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active ?? true,
  };
}

app.get('/api/customers', async (_req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load customers' });
  }

  return res.json((data || []).map(toCustomerModel));
});

app.post('/api/customers', async (req, res) => {
  const customer = req.body;
  if (!customer || typeof customer.name !== 'string' || !customer.name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  try {
    await ensureDefaultBusiness();
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({
      error: 'Failed to prepare business record',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }

  const record = {
    ...(customer.id && uuidPattern.test(customer.id) ? { id: customer.id } : {}),
    business_id: DEFAULT_DATABASE_BUSINESS_ID,
    name: customer.name.trim(),
    business_name: customer.businessName || null,
    gstin: customer.gstin || null,
    phone: customer.phone || null,
    email: customer.email || null,
    address: customer.address || null,
    state: customer.state || null,
    state_code: customer.stateCode || null,
    outstanding_balance: Number(customer.outstandingBalance || 0),
  };

  const { data, error } = await supabase
    .from('customers')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Customer save error:', error.message);
    return res.status(500).json({
      error: 'Failed to save customer',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }

  return res.status(201).json(toCustomerModel(data));
});

app.post('/api/customers/migrate', async (req, res) => {
  const customers = req.body?.customers;
  if (!Array.isArray(customers)) {
    return res.status(400).json({ error: 'customers must be an array' });
  }

  try {
    await ensureDefaultBusiness();
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({ error: 'Failed to prepare business record' });
  }

  const records = customers
    .filter(customer => customer && typeof customer.name === 'string' && customer.name.trim())
    .map(customer => ({
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      name: customer.name.trim(),
      business_name: customer.businessName || null,
      gstin: customer.gstin || null,
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      state: customer.state || null,
      state_code: customer.stateCode || null,
      outstanding_balance: Number(customer.outstandingBalance || 0),
    }));

  if (records.length === 0) return res.json({ migrated: 0, customers: [] });

  const { data: existingCustomers, error: lookupError } = await supabase
    .from('customers')
    .select('id,name')
    .eq('business_id', DEFAULT_DATABASE_BUSINESS_ID);

  if (lookupError) {
    console.error('Customer migration lookup error:', lookupError.message);
    return res.status(500).json({ error: 'Failed to inspect existing customers' });
  }

  const migratedCustomers = [];
  for (const record of records) {
    const existing = existingCustomers?.find(item => item.name === record.name);
    const request = existing
      ? supabase.from('customers').update(record).eq('id', existing.id).select().single()
      : supabase.from('customers').insert(record).select().single();
    const { data, error } = await request;
    if (error) {
      console.error('Customer migration error:', error.message);
      return res.status(500).json({
        error: 'Failed to migrate customers',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message,
      });
    }
    migratedCustomers.push(data);
  }

  return res.json({ migrated: migratedCustomers.length, customers: migratedCustomers.map(toCustomerModel) });
});

app.delete('/api/customers/:id', async (req, res) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    console.error('Customer delete error:', error.message);
    return res.status(500).json({ error: 'Failed to delete customer' });
  }

  return res.status(204).send();
});

app.post('/api/products', async (req, res) => {
  const product = req.body;
  if (!product?.id || !product?.name) {
    return res.status(400).json({ error: 'Product id and name are required' });
  }

  const { data, error } = await supabase
    .from('smartbill_products')
    .upsert({
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      legacy_id: String(product.id),
      payload: product,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,legacy_id' })
    .select()
    .single();

  if (error) {
    console.error('Product database sync error:', error.message);
    return res.status(500).json({ error: 'Failed to save product', details: process.env.NODE_ENV === 'production' ? undefined : error.message });
  }

  return res.status(201).json(data);
});

app.delete('/api/products/:id', async (req, res) => {
  const { error } = await supabase
    .from('smartbill_products')
    .delete()
    .eq('business_id', DEFAULT_DATABASE_BUSINESS_ID)
    .eq('legacy_id', req.params.id);

  if (error) {
    console.error('Product delete database error:', error.message);
    return res.status(500).json({ error: 'Failed to delete product' });
  }

  return res.status(204).send();
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;
  if (!invoice?.id || !invoice?.invoiceNumber) {
    return res.status(400).json({ error: 'Invoice id and invoice number are required' });
  }

  const { data, error } = await supabase
    .from('smartbill_invoices')
    .upsert({
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      legacy_id: String(invoice.id),
      payload: invoice,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,legacy_id' })
    .select()
    .single();

  if (error) {
    console.error('Invoice database sync error:', error.message);
    return res.status(500).json({ error: 'Failed to save invoice', details: process.env.NODE_ENV === 'production' ? undefined : error.message });
  }

  return res.status(201).json(data);
});

app.post('/api/payments', async (req, res) => {
  const payment = req.body;
  if (!payment?.id || !payment?.invoiceId) {
    return res.status(400).json({ error: 'Payment id and invoice id are required' });
  }

  const { data, error } = await supabase
    .from('smartbill_payments')
    .upsert({
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      legacy_id: String(payment.id),
      payload: payment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,legacy_id' })
    .select()
    .single();

  if (error) {
    console.error('Payment database sync error:', error.message);
    return res.status(500).json({ error: 'Failed to save payment', details: process.env.NODE_ENV === 'production' ? undefined : error.message });
  }

  return res.status(201).json(data);
});

app.post('/api/migrate-local-data', async (req, res) => {
  const source = req.body || {};
  try {
    await ensureDefaultBusiness();
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({ error: 'Failed to prepare business record' });
  }

  const profile = source.profile;
  if (profile) {
    const { error } = await supabase.from('smartbill_business_profiles').upsert({
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      payload: profile,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id' });
    if (error) return res.status(500).json({ error: 'Failed to migrate business profile', details: error.message });
  }

  const customers = (Array.isArray(source.customers) ? source.customers : [])
    .filter((customer: any) => customer?.name);
  for (const customer of customers) {
    const customerRecord = {
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      name: customer.name,
      business_name: customer.businessName || null,
      gstin: customer.gstin || null,
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      state: customer.state || null,
      state_code: customer.stateCode || null,
      outstanding_balance: Number(customer.outstandingBalance || 0),
    };
    const { data: existingCustomer, error: lookupError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', DEFAULT_DATABASE_BUSINESS_ID)
      .eq('name', customer.name)
      .maybeSingle();
    if (lookupError) return res.status(500).json({ error: 'Failed to inspect customers', details: lookupError.message });

    const { error } = existingCustomer
      ? await supabase.from('customers').update(customerRecord).eq('id', existingCustomer.id)
      : await supabase.from('customers').insert(customerRecord);
    if (error) return res.status(500).json({ error: 'Failed to migrate customers', details: error.message });
  }

  const collections = [
    { table: 'smartbill_products', values: source.products, id: (value: any) => value.id || `${value.name}-${value.sku || ''}` },
    { table: 'smartbill_invoices', values: source.invoices, id: (value: any) => value.id || value.invoiceNumber },
    { table: 'smartbill_payments', values: source.payments, id: (value: any) => value.id || `${value.invoiceId}-${value.paymentDate}-${value.amount}` },
    { table: 'smartbill_inventory_logs', values: source.inventoryLogs, id: (value: any) => value.id || `${value.productId}-${value.timestamp}` },
    { table: 'smartbill_audit_logs', values: source.auditLogs, id: (value: any) => value.id || `${value.recordType}-${value.recordId}-${value.timestamp}` },
  ];
  const recordTypes: Record<string, number> = { profile: profile ? 1 : 0, customer: customers.length };

  for (const collection of collections) {
    const records = (Array.isArray(collection.values) ? collection.values : []).map((value: any) => ({
      business_id: DEFAULT_DATABASE_BUSINESS_ID,
      legacy_id: String(collection.id(value)),
      payload: value,
      updated_at: new Date().toISOString(),
    }));
    recordTypes[collection.table] = records.length;
    if (records.length === 0) continue;
    const { error } = await supabase.from(collection.table).upsert(records, { onConflict: 'business_id,legacy_id' });
    if (error) return res.status(500).json({ error: `Failed to migrate ${collection.table}`, details: error.message });
  }

  return res.json({ migrated: Object.values(recordTypes).reduce((sum, count) => sum + count, 0), recordTypes });
});
startServer();
