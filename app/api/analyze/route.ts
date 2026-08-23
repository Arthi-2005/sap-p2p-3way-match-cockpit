import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface MatchAnalysisRequest {
  type?: "ANALYZE_INVOICE" | "JOULE_CHAT";
  chatMessage?: string;
  invoiceId?: string;
  supplier?: {
    vendorId: string;
    name: string;
    tier: string;
    paymentTerms: string;
    discountDaysRemaining: number;
    discountValue: number;
    rating: string;
  };
  poNumber?: string;
  grNumber?: string;
  poData?: { material: string; orderedQty: number; unitPrice: number; total: number };
  grData?: { receivedQty: number; receivedDate: string; status: string };
  invoiceData?: {
    invoicedQty: number;
    invoicedUnitPrice: number;
    totalAmount: number;
    currency: string;
    blockCode: string;
    blockReason: string;
  };
}

export async function POST(req: Request) {
  let payload: MatchAnalysisRequest = {};
  let priceVariancePct = "0.00";
  let qtyVariancePct = "0.00";
  let unreceivedQty = 0;

  try {
    payload = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;

    // Handle Joule Conversational Assistant
    if (payload.type === "JOULE_CHAT") {
      const systemPrompt = `You are SAP Joule, the enterprise AI Copilot for SAP S/4HANA Procure-to-Pay and Accounts Payable.
Answer the user's question concisely, grounding your response in real SAP terms (transactions MIRO, MRBR, MIGO, F110, tolerance keys PP/BD/ST, and 3-way matching rules).
Keep your answer to 2-3 structured sentences with direct business guidance.`;

      if (!apiKey) {
        return NextResponse.json({
          reply: `[Joule Response] In SAP S/4HANA, check transaction MRBR for blocked invoice release under tolerance key PP, or execute transaction MR8M to cancel/post a supplier credit memo.`,
        });
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: payload.chatMessage || "How do I resolve a 3-way match price variance?" },
            ],
            temperature: 0.2,
            max_tokens: 300,
          }),
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ reply: data.choices?.[0]?.message?.content?.trim() });
        }
      } catch {
        console.warn("Joule AI request timed out or network error. Returning grounded knowledge.");
      }

      return NextResponse.json({
        reply: `In SAP S/4HANA, invoices with price variance exceeding the 5% tolerance key PP are held in MRBR. You can resolve them by obtaining buyer authorization or requesting a supplier credit memo via MR8M.`,
      });
    }

    // Default: Structured 3-Way Match Analysis
    const poUnitPrice = payload.poData?.unitPrice || 1;
    const invUnitPrice = payload.invoiceData?.invoicedUnitPrice || 1;
    priceVariancePct = (((invUnitPrice - poUnitPrice) / poUnitPrice) * 100).toFixed(2);
    
    const grQty = payload.grData?.receivedQty || 1;
    const invQty = payload.invoiceData?.invoicedQty || 1;
    qtyVariancePct = (((invQty - grQty) / grQty) * 100).toFixed(2);
    unreceivedQty = Math.max(0, invQty - grQty);
    const totalExposure = (payload.invoiceData?.totalAmount || 0) - (payload.poData?.total || 0);

    const systemPrompt = `You are the Lead SAP S/4HANA Accounts Payable & 3-Way Match Intelligent Resolution Engine.
Your task is to analyze PO vs GR vs Supplier Invoice variances and output a grounded, zero-hallucination recommendation.

RULES:
1. Base your recommendation exclusively on the provided PO, GR, and Invoice quantities and prices.
2. Return ONLY valid JSON matching this exact structure:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidenceScore": number (between 85 and 99),
  "actionRecommendation": "APPROVE_WITH_TOLERANCE" | "REQUEST_CREDIT_MEMO" | "MANUAL_OVERRIDE_REQUIRED" | "REJECT_UNRECEIVED_GOODS",
  "executiveSummary": "2-sentence crisp summary explaining the root-cause variance and discount urgency.",
  "keyDiscrepancyDrivers": ["driver 1", "driver 2"],
  "sapRemediationPlan": "Specific SAP action (e.g., Release in MRBR tolerance key PP, post credit memo in MR8M, or require buyer override code)."
}
Do not output markdown codeblocks, preamble, or trailing commentary.`;

    const userPrompt = `Analyze the following SAP S/4HANA 3-Way Match Exception:
- Invoice ID: ${payload.invoiceId} (Total: ${payload.invoiceData?.currency} ${payload.invoiceData?.totalAmount?.toLocaleString()})
- Supplier: ${payload.supplier?.vendorId} - ${payload.supplier?.name} (${payload.supplier?.tier})
- Payment Terms: ${payload.supplier?.paymentTerms} (${payload.supplier?.discountDaysRemaining} days remaining for $${payload.supplier?.discountValue} cash discount)
- Purchase Order (${payload.poNumber}): ${payload.poData?.orderedQty} units @ $${payload.poData?.unitPrice}/unit (Total: $${payload.poData?.total?.toLocaleString()})
- Goods Receipt (${payload.grNumber}): ${payload.grData?.receivedQty} units received (Status: ${payload.grData?.status})
- Invoiced (${payload.invoiceId}): ${payload.invoiceData?.invoicedQty} units @ $${payload.invoiceData?.invoicedUnitPrice}/unit
- Quantitative Variances:
  * Price Variance: ${priceVariancePct}% ($${(invUnitPrice - poUnitPrice).toFixed(2)}/unit difference)
  * Quantity Variance: ${qtyVariancePct}% (${unreceivedQty} unreceived units invoiced)
  * Net Balance Difference: $${totalExposure.toLocaleString()}`;

    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: "json_object" },
          }),
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          const parsed = JSON.parse(content);
          return NextResponse.json(parsed);
        }
      } catch {
        console.warn("NVIDIA NIM API timed out. Falling back to grounded rule matrix.");
      }
    }

    return NextResponse.json(
      generateGroundedRuleFallback(payload, parseFloat(priceVariancePct), parseFloat(qtyVariancePct), unreceivedQty)
    );
  } catch (error) {
    console.error("Error in AI analysis route:", error);
    return NextResponse.json(
      generateGroundedRuleFallback(payload, parseFloat(priceVariancePct), parseFloat(qtyVariancePct), unreceivedQty),
      { status: 200 }
    );
  }
}

function generateGroundedRuleFallback(
  payload: MatchAnalysisRequest,
  priceVarPct: number,
  qtyVarPct: number,
  unreceivedQty: number
) {
  if (unreceivedQty > 0 || qtyVarPct > 10) {
    return {
      riskLevel: "CRITICAL",
      confidenceScore: 99,
      actionRecommendation: "REJECT_UNRECEIVED_GOODS",
      executiveSummary: `Invoice ${payload.invoiceId || "INV"} bills for ${unreceivedQty} unreceived units ($${(unreceivedQty * (payload.invoiceData?.invoicedUnitPrice || 0)).toLocaleString()}). Releasing will cause duplicate payment and inventory distortion.`,
      keyDiscrepancyDrivers: [
        `${unreceivedQty} units invoiced without MIGO Goods Receipt confirmation`,
        `Quantity variance of ${qtyVarPct}% exceeds 10% tolerance limit`,
      ],
      sapRemediationPlan: "Block invoice in MRBR with code 'BD'. Issue formal Request for Supplier Credit Memo via SAP MR8M.",
    };
  }

  if (priceVarPct > 5.0) {
    return {
      riskLevel: "HIGH",
      confidenceScore: 95,
      actionRecommendation: "MANUAL_OVERRIDE_REQUIRED",
      executiveSummary: `Unit price increased by +${priceVarPct}% ($${payload.invoiceData?.invoicedUnitPrice} vs PO $${payload.poData?.unitPrice}), exceeding standard 5% SAP tolerance. Requires Procurement VP approval.`,
      keyDiscrepancyDrivers: [
        `Net price deviation of $${((payload.invoiceData?.invoicedUnitPrice || 0) - (payload.poData?.unitPrice || 0)).toFixed(2)}/unit`,
        `Exceeds contractual tolerance ceiling (Max 5.0%)`,
      ],
      sapRemediationPlan: "Require Procurement VP Authorization Code (AUTH-AP-8840) to absorb variance or request updated invoice.",
    };
  }

  if (priceVarPct > 0 && priceVarPct <= 5.0) {
    return {
      riskLevel: "LOW",
      confidenceScore: 97,
      actionRecommendation: "APPROVE_WITH_TOLERANCE",
      executiveSummary: `Price variance of +${priceVarPct}% is fully within the approved 5% contract tolerance window. Releasing immediately captures $${payload.supplier?.discountValue || 0} early-payment cash discount.`,
      keyDiscrepancyDrivers: [
        `Price variance within acceptable SAP tolerance key PP (<5%)`,
        `Early discount of $${payload.supplier?.discountValue || 0} expires in ${payload.supplier?.discountDaysRemaining || 0} days`,
      ],
      sapRemediationPlan: "Release payment block in SAP MRBR under tolerance key PP to schedule automated payment run (F110).",
    };
  }

  return {
    riskLevel: "LOW",
    confidenceScore: 99,
    actionRecommendation: "APPROVE_WITH_TOLERANCE",
    executiveSummary: `Perfect 3-way match across PO, GR, and Invoice. Clear for immediate payment posting to secure early discount.`,
    keyDiscrepancyDrivers: [
      `100% quantity and unit price alignment across all 3 documents`,
      `Zero variance detected in FI-AP`,
    ],
    sapRemediationPlan: "Post directly in SAP MIRO for automated payment clearing via F110.",
  };
}
