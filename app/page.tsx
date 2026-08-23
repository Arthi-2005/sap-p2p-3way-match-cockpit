"use client";

import React, { useState, useEffect } from "react";
import initialMockData from "@/data/mockData.json";
import {
  FileCheck2,
  FileX2,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Lock,
  RefreshCw,
  Building2,
  DollarSign,
  Layers,
  ShieldAlert,
  Info,
  SlidersHorizontal,
  BarChart3,
  FileSpreadsheet,
  ScanLine,
  CreditCard,
  History,
  MessageSquare,
  Send,
  Download,
  UploadCloud,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface InvoiceRecord {
  invoiceId: string;
  supplier: {
    vendorId: string;
    name: string;
    tier: string;
    country: string;
    paymentTerms: string;
    discountDaysRemaining: number;
    discountValue: number;
    rating: string;
    contractRef: string;
  };
  poNumber: string;
  grNumber: string;
  poData: { material: string; orderedQty: number; unitPrice: number; total: number; plant: string };
  grData: { receivedQty: number; receivedDate: string; status: string; dockLocation: string };
  invoiceData: {
    invoicedQty: number;
    invoicedUnitPrice: number;
    totalAmount: number;
    currency: string;
    invoiceDate: string;
    blockCode: string;
    blockReason: string;
    status: string;
  };
  edgeCaseType: string;
}

interface AIAnalysis {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidenceScore: number;
  actionRecommendation: "APPROVE_WITH_TOLERANCE" | "REQUEST_CREDIT_MEMO" | "MANUAL_OVERRIDE_REQUIRED" | "REJECT_UNRECEIVED_GOODS";
  executiveSummary: string;
  keyDiscrepancyDrivers: string[];
  sapRemediationPlan: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  invoiceId: string;
  action: string;
  user: string;
  authRef?: string;
  statusBadge: "SUCCESS" | "OVERRIDE" | "BLOCKED" | "CREDIT_MEMO";
}

export default function EnterpriseSAPSuite() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"WORKBENCH" | "OCR_INGESTION" | "ANALYTICS" | "F110_PAYMENTS" | "AUDIT_LOG">("WORKBENCH");
  
  // Data State
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialMockData);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialMockData[0].invoiceId);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [toleranceThreshold, setToleranceThreshold] = useState<number>(5.0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: "LOG-1001",
      timestamp: "2026-08-23 09:12:44",
      invoiceId: "INV-902100",
      action: "Automated 3-Way Match Passed",
      user: "SYSTEM_AUTO",
      statusBadge: "SUCCESS",
    },
  ]);

  // Modal State for Over-Limit Price / Qty Override
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [authCodeInput, setAuthCodeInput] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("Procurement VP Approved Contract Indexation");
  const [authError, setAuthError] = useState<string>("");

  // F110 Batch Payment State
  const [selectedForPayment, setSelectedForPayment] = useState<string[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessReport, setPaymentSuccessReport] = useState<string | null>(null);

  // Joule AI Copilot Drawer State
  const [isJouleOpen, setIsJouleOpen] = useState<boolean>(false);
  const [jouleMessages, setJouleMessages] = useState<Array<{ sender: "user" | "joule"; text: string }>>([
    { sender: "joule", text: "Hello! I am SAP Joule, your S/4HANA Accounts Payable Copilot. Ask me about 3-way match variances, tolerance keys, or supplier contract terms." },
  ]);
  const [jouleInput, setJouleInput] = useState<string>("");
  const [isJouleThinking, setIsJouleThinking] = useState<boolean>(false);

  // OCR Ingestion Simulator State
  const [ocrStep, setOcrStep] = useState<"UPLOAD" | "EXTRACTING" | "EXTRACTED">("UPLOAD");
  const [ocrSampleSelected, setOcrSampleSelected] = useState<string>("GLOBAL_ALLOYS");

  const currentInvoice = invoices.find((inv) => inv.invoiceId === selectedInvoiceId) || invoices[0];

  const triggerToast = (text: string, type: "success" | "error" | "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const addAuditLog = (invoiceId: string, action: string, badge: "SUCCESS" | "OVERRIDE" | "BLOCKED" | "CREDIT_MEMO", authRef?: string) => {
    const newEntry: AuditLogEntry = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      invoiceId,
      action,
      user: "AP_SENIOR_CLERK",
      authRef,
      statusBadge: badge,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Run Grounded AI Analysis when selected invoice changes
  useEffect(() => {
    async function runAnalysis() {
      if (!currentInvoice) return;
      setIsAnalyzing(true);
      setAiAnalysis(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "ANALYZE_INVOICE", ...currentInvoice }),
        });
        const data = await res.json();
        setAiAnalysis(data);
      } catch (err) {
        console.error("AI Analysis Fetch Error:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }

    runAnalysis();
  }, [selectedInvoiceId]);

  // Variance Math
  const priceVariancePct = (
    ((currentInvoice.invoiceData.invoicedUnitPrice - currentInvoice.poData.unitPrice) / currentInvoice.poData.unitPrice) *
    100
  ).toFixed(2);
  const qtyVariancePct = (
    ((currentInvoice.invoiceData.invoicedQty - currentInvoice.grData.receivedQty) / currentInvoice.grData.receivedQty) *
    100
  ).toFixed(2);
  const isSeverePriceVariance = parseFloat(priceVariancePct) > toleranceThreshold;
  const isQuantityDeficit = currentInvoice.invoiceData.invoicedQty > currentInvoice.grData.receivedQty;

  // Handler: Approve / Release Invoice with Validation Rules
  const handleApproveInvoice = (invoice: InvoiceRecord) => {
    const pVar = ((invoice.invoiceData.invoicedUnitPrice - invoice.poData.unitPrice) / invoice.poData.unitPrice) * 100;

    // Hard Rule 1: Cannot approve if goods unreceived
    if (invoice.invoiceData.invoicedQty > invoice.grData.receivedQty) {
      triggerToast(
        `SAP 3-Way Match Violation: Cannot release ${invoice.invoiceId}. Missing GR for ${
          invoice.invoiceData.invoicedQty - invoice.grData.receivedQty
        } units!`,
        "error"
      );
      addAuditLog(invoice.invoiceId, `Blocked: Missing GR for ${invoice.invoiceData.invoicedQty - invoice.grData.receivedQty} units`, "BLOCKED");
      return;
    }

    // Hard Rule 2: Price variance > tolerance threshold mandates override modal
    if (pVar > toleranceThreshold) {
      setShowOverrideModal(true);
      return;
    }

    updateInvoiceStatus(invoice.invoiceId, "POSTED_RELEASED");
    addAuditLog(invoice.invoiceId, `Approved within ${toleranceThreshold}% tolerance (MIRO Post)`, "SUCCESS");
    triggerToast(
      `Success: Invoice ${invoice.invoiceId} Released! Early discount of $${invoice.supplier.discountValue} captured for payment run (F110).`,
      "success"
    );
  };

  const handleExecuteOverride = () => {
    // Valid Demo Codes: AUTH-AP-8840 or SAP2026
    if (authCodeInput.trim().toUpperCase() !== "AUTH-AP-8840" && authCodeInput.trim().toUpperCase() !== "SAP2026") {
      setAuthError("Invalid SAP Procurement Authorization Key. Required: 'AUTH-AP-8840' (Procurement VP Level).");
      return;
    }

    const authRef = `AP-OVR-${Math.floor(1000 + Math.random() * 9000)}`;
    setAuthError("");
    setShowOverrideModal(false);
    setAuthCodeInput("");
    updateInvoiceStatus(currentInvoice.invoiceId, "POSTED_OVERRIDE");
    addAuditLog(currentInvoice.invoiceId, `Executive Override (${overrideReason})`, "OVERRIDE", authRef);
    triggerToast(
      `Executive AP Override Confirmed: ${currentInvoice.invoiceId} released under Audit Log [${authRef}].`,
      "success"
    );
  };

  const handleRequestCreditMemo = (invoiceId: string) => {
    updateInvoiceStatus(invoiceId, "CREDIT_MEMO_REQUESTED");
    addAuditLog(invoiceId, "Issued formal Credit Memo request (MR8M)", "CREDIT_MEMO");
    triggerToast(
      `Credit Memo Workflow Initiated: SAP MR8M notice dispatched to ${currentInvoice.supplier.name} for balance difference.`,
      "info"
    );
  };

  const updateInvoiceStatus = (invoiceId: string, newStatus: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.invoiceId === invoiceId
          ? { ...inv, invoiceData: { ...inv.invoiceData, status: newStatus } }
          : inv
      )
    );
  };

  // Joule AI Chat Handler
  const handleSendJouleMessage = async () => {
    if (!jouleInput.trim()) return;
    const userMsg = jouleInput.trim();
    setJouleMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setJouleInput("");
    setIsJouleThinking(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "JOULE_CHAT", chatMessage: userMsg }),
      });
      const data = await res.json();
      setJouleMessages((prev) => [...prev, { sender: "joule", text: data.reply }]);
    } catch {
      setJouleMessages((prev) => [
        ...prev,
        { sender: "joule", text: "I encountered a network issue, but you can check transaction MRBR directly in SAP S/4HANA." },
      ]);
    } finally {
      setIsJouleThinking(false);
    }
  };

  // OCR Ingestion Action Handler
  const handleSimulateOCR = () => {
    setOcrStep("EXTRACTING");
    setTimeout(() => {
      setOcrStep("EXTRACTED");
    }, 1800);
  };

  const handlePushOCRToWorkbench = () => {
    const newInvoice: InvoiceRecord = {
      invoiceId: `INV-${Math.floor(902110 + Math.random() * 890)}`,
      supplier: {
        vendorId: "VEN-99104",
        name: "Siemens Automation & Drives AG",
        tier: "Tier-1 Strategic",
        country: "Germany",
        paymentTerms: "2% 10, Net 30",
        discountDaysRemaining: 7,
        discountValue: 1420,
        rating: "A (Reliable)",
        contractRef: "CTR-DE-2026-992",
      },
      poNumber: "PO-450008899",
      grNumber: "GR-50001999",
      poData: { material: "MAT-5520 Industrial Servo Drives", orderedQty: 20, unitPrice: 3550.0, total: 71000.0, plant: "1020 (EU Central)" },
      grData: { receivedQty: 20, receivedDate: "2026-08-23", status: "CONFIRMED", dockLocation: "Bay-02" },
      invoiceData: {
        invoicedQty: 20,
        invoicedUnitPrice: 3550.0,
        totalAmount: 71000.0,
        currency: "USD",
        invoiceDate: "2026-08-23",
        blockCode: "NONE",
        blockReason: "AI OCR Auto-Extracted - Validated 3-Way Match",
        status: "BLOCKED",
      },
      edgeCaseType: "NONE_HAPPY_PATH",
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    setSelectedInvoiceId(newInvoice.invoiceId);
    setActiveTab("WORKBENCH");
    setOcrStep("UPLOAD");
    addAuditLog(newInvoice.invoiceId, "Ingested via AI OCR Document Extraction", "SUCCESS");
    triggerToast(`Document Ingested! Invoice ${newInvoice.invoiceId} pushed to 3-Way Match Workbench.`, "success");
  };

  // F110 Batch Execution Handler
  const handleExecuteBatchPayment = () => {
    if (selectedForPayment.length === 0) {
      triggerToast("Select at least one verified invoice to execute SAP F110 Payment Run.", "error");
      return;
    }

    setIsProcessingPayment(true);
    setTimeout(() => {
      setInvoices((prev) =>
        prev.map((inv) =>
          selectedForPayment.includes(inv.invoiceId)
            ? { ...inv, invoiceData: { ...inv.invoiceData, status: "PAID_CLEARED" } }
            : inv
        )
      );

      const totalPaid = invoices
        .filter((inv) => selectedForPayment.includes(inv.invoiceId))
        .reduce((sum, inv) => sum + inv.invoiceData.totalAmount, 0);

      selectedForPayment.forEach((id) => {
        addAuditLog(id, "Cleared in SAP F110 Payment Run [Batch #PAY-2026-08]", "SUCCESS");
      });

      setSelectedForPayment([]);
      setIsProcessingPayment(false);
      setPaymentSuccessReport(`Batch Run Completed! $${totalPaid.toLocaleString()} dispatched across ${selectedForPayment.length} suppliers via ISO 20022 XML.`);
      triggerToast(`SAP F110 Batch Run Completed successfully!`, "success");
    }, 2000);
  };

  // Summary Metrics
  const totalBlockedVal = invoices
    .filter((i) => i.invoiceData.status === "BLOCKED")
    .reduce((sum, i) => sum + i.invoiceData.totalAmount, 0);

  const discountsAtRisk = invoices
    .filter((i) => i.invoiceData.status === "BLOCKED" && i.supplier.discountDaysRemaining > 0)
    .reduce((sum, i) => sum + i.supplier.discountValue, 0);

  const blockedCount = invoices.filter((i) => i.invoiceData.status === "BLOCKED").length;

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "ALL") return true;
    if (filter === "BLOCKED") return inv.invoiceData.status === "BLOCKED";
    if (filter === "POSTED") return inv.invoiceData.status.includes("POSTED") || inv.invoiceData.status === "PAID_CLEARED";
    if (filter === "EXCEPTIONS") return inv.edgeCaseType !== "NONE_HAPPY_PATH";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1D2D3E] font-sans antialiased flex flex-col">
      {/* SAP Fiori Shell Header */}
      <header className="bg-[#0A6ED1] text-white px-6 py-3 shadow-md flex items-center justify-between border-b border-[#0854A0] sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-white text-[#0A6ED1] font-black px-2.5 py-1 rounded text-sm tracking-wider shadow-sm flex items-center gap-1.5">
            <span>SAP</span>
            <span className="text-xs bg-[#0A6ED1] text-white px-1 rounded">S/4HANA</span>
          </div>
          <div className="h-5 w-[1px] bg-blue-300 opacity-60"></div>
          <h1 className="text-base font-semibold tracking-wide hidden sm:block">
            Procure-to-Pay Intelligence Suite & 3-Way Match Cockpit
          </h1>
          <span className="text-xs bg-[#0854A0] px-2 py-0.5 rounded text-blue-100 font-mono">
            Fiori App MRBR / F110-AI
          </span>
        </div>

        {/* Global Toolbar & Status */}
        <div className="flex items-center space-x-4 text-xs">
          <button
            onClick={() => setIsJouleOpen(!isJouleOpen)}
            className="flex items-center gap-1.5 bg-[#0854A0] hover:bg-[#074787] text-white px-3 py-1.5 rounded-full font-semibold transition border border-blue-400/40 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-spin" style={{ animationDuration: "8s" }} />
            <span>SAP Joule Copilot</span>
          </button>
          <div className="hidden md:flex items-center gap-1.5 text-blue-100 bg-[#0854A0]/60 px-2.5 py-1 rounded-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SAP AI Core (Embedded Intelligence) Active
          </div>
          <div className="bg-[#0854A0] px-3 py-1 rounded-full font-medium">
            Plant 1010 | AP Senior Clerk
          </div>
        </div>
      </header>

      {/* Module Navigation Tabs (Fiori Launchpad Style) */}
      <nav className="bg-white border-b border-slate-200 px-6 py-2 shadow-xs sticky top-[53px] z-30 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1">
          {[
            { id: "WORKBENCH", label: "3-Way Match Resolution", icon: FileCheck2, badge: blockedCount },
            { id: "OCR_INGESTION", label: "AI Invoice OCR Ingestion", icon: ScanLine },
            { id: "ANALYTICS", label: "Executive Working Capital", icon: BarChart3 },
            { id: "F110_PAYMENTS", label: "SAP F110 Batch Payment Run", icon: CreditCard },
            { id: "AUDIT_LOG", label: "Compliance & SoD Audit Trail", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-[#0A6ED1] border-b-2 border-[#0A6ED1] shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0A6ED1]" : "text-slate-500"}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Tolerance Threshold Controller */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-600 font-semibold flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A6ED1]" /> SAP Tolerance Key (PP):
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={toleranceThreshold}
              onChange={(e) => setToleranceThreshold(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#0A6ED1]"
            />
            <span className="font-bold text-[#0A6ED1] font-mono w-10 text-right">{toleranceThreshold.toFixed(1)}%</span>
          </div>
        </div>
      </nav>

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-28 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium border flex items-center gap-2.5 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : toastMessage.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-300"
                : "bg-blue-50 text-blue-900 border-blue-300"
            }`}
          >
            {toastMessage.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {toastMessage.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600" />}
            {toastMessage.type === "info" && <Info className="w-5 h-5 text-blue-600" />}
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="max-w-[1720px] w-full mx-auto p-6 space-y-6 flex-1">
        {/* KPI Analytical Tiles Row (Always Visible) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Blocked Pipeline Value</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">${totalBlockedVal.toLocaleString()}</div>
            <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {blockedCount} Invoices In Exception State
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Early Discounts At Risk</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">${discountsAtRisk.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-medium">Expiring &lt;96 hrs</span>
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1">
              ⚡ +$770K/yr Captured with 1-Day Cycle Time
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Exception Rate %</span>
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-600">4.8%</span>
              <span className="text-xs line-through text-slate-400">25.0%</span>
            </div>
            <div className="text-xs text-purple-700 font-medium mt-1">
              ⚡ -80.8% Reduction in AP Rework
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Invoice Processing Time</span>
              <Clock className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-cyan-600">1.2 Days</span>
              <span className="text-xs line-through text-slate-400">9.4 Days</span>
            </div>
            <div className="text-xs text-cyan-700 font-medium mt-1">
              ⚡ 87.2% Faster 3-Way Match Close
            </div>
          </div>
        </section>

        {/* TAB 1: 3-WAY MATCH WORKBENCH */}
        {activeTab === "WORKBENCH" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Worklist Queue (5 Cols) */}
            <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[780px]">
              {/* Filter Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0A6ED1]" /> Blocked Invoices Queue
                  </h2>
                  <p className="text-xs text-slate-500">Select an item to run 3-Way cross-check & AI triage</p>
                </div>
                <div className="flex gap-1 bg-slate-200 p-1 rounded-lg text-xs font-medium">
                  {["ALL", "BLOCKED", "EXCEPTIONS", "POSTED"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-2.5 py-1 rounded-md transition ${
                        filter === tab ? "bg-white text-[#0A6ED1] shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Invoices */}
              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {filteredInvoices.map((inv) => {
                  const isSelected = inv.invoiceId === selectedInvoiceId;
                  const hasUnreceived = inv.invoiceData.invoicedQty > inv.grData.receivedQty;

                  return (
                    <div
                      key={inv.invoiceId}
                      onClick={() => setSelectedInvoiceId(inv.invoiceId)}
                      className={`p-4 cursor-pointer transition border-l-4 ${
                        isSelected
                          ? "bg-blue-50/60 border-l-[#0A6ED1]"
                          : "hover:bg-slate-50 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{inv.invoiceId}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                              {inv.supplier.vendorId}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate max-w-[220px]">
                            {inv.supplier.name}
                          </p>
                        </div>

                        {/* Status & Amount */}
                        <div className="text-right">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                              inv.invoiceData.status === "BLOCKED"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : inv.invoiceData.status === "POSTED_OVERRIDE"
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : inv.invoiceData.status === "POSTED_RELEASED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : inv.invoiceData.status === "PAID_CLEARED"
                                ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}
                          >
                            {inv.invoiceData.status}
                          </span>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            ${inv.invoiceData.totalAmount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* 3-Way Match Check Indicators */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            PO: {inv.poNumber.slice(-4)} <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            GR: {inv.grNumber.slice(-4)}{" "}
                            {hasUnreceived ? (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            )}
                          </span>
                        </div>

                        {inv.supplier.discountDaysRemaining > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ⚡ Save ${inv.supplier.discountValue} ({inv.supplier.discountDaysRemaining}d left)
                          </span>
                        )}
                      </div>

                      {/* Block Reason Snippet */}
                      <div className="mt-2 text-[11px] font-medium text-amber-700 truncate bg-amber-50/60 px-2 py-1 rounded">
                        ⚠️ {inv.invoiceData.blockReason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Column: 3-Way Match & Decision Workbench (7 Cols) */}
            <section className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                {/* Header Info */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{currentInvoice.invoiceId}</h2>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono">
                        Ref PO: {currentInvoice.poNumber}
                      </span>
                      <span className="text-xs bg-red-100 text-red-800 font-semibold px-2.5 py-1 rounded border border-red-200">
                        Block: {currentInvoice.invoiceData.blockCode} ({currentInvoice.invoiceData.blockReason})
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {currentInvoice.supplier.name} ({currentInvoice.supplier.vendorId}) • {currentInvoice.supplier.country} • Terms:{" "}
                      <strong>{currentInvoice.supplier.paymentTerms}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Total Invoiced Value</div>
                    <div className="text-2xl font-black text-slate-900">
                      ${currentInvoice.invoiceData.totalAmount.toLocaleString()} {currentInvoice.invoiceData.currency}
                    </div>
                  </div>
                </div>

                {/* 3-WAY MATCH RECONCILIATION MATRIX */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-[#0A6ED1]" /> SAP 3-Way Match Verification Grid
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      Material: {currentInvoice.poData.material} | Plant: {currentInvoice.poData.plant}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-semibold">Verification Stage</th>
                          <th className="py-2 font-semibold">Doc Reference</th>
                          <th className="py-2 font-semibold text-right">Quantity</th>
                          <th className="py-2 font-semibold text-right">Unit Price</th>
                          <th className="py-2 font-semibold text-right">Total Net</th>
                          <th className="py-2 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Purchase Order Row */}
                        <tr>
                          <td className="py-2.5 font-bold text-slate-700">1. Purchase Order (ME21N)</td>
                          <td className="py-2.5 font-mono text-slate-600">{currentInvoice.poNumber}</td>
                          <td className="py-2.5 text-right font-medium">{currentInvoice.poData.orderedQty}</td>
                          <td className="py-2.5 text-right font-medium">${currentInvoice.poData.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-medium">${currentInvoice.poData.total.toLocaleString()}</td>
                          <td className="py-2.5 text-center">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              BASE
                            </span>
                          </td>
                        </tr>

                        {/* Goods Receipt Row */}
                        <tr>
                          <td className="py-2.5 font-bold text-slate-700">2. Goods Receipt (MIGO)</td>
                          <td className="py-2.5 font-mono text-slate-600">{currentInvoice.grNumber} ({currentInvoice.grData.dockLocation})</td>
                          <td className={`py-2.5 text-right font-bold ${isQuantityDeficit ? "text-rose-600" : "text-slate-800"}`}>
                            {currentInvoice.grData.receivedQty}
                          </td>
                          <td className="py-2.5 text-right text-slate-400 font-mono">-</td>
                          <td className="py-2.5 text-right font-medium">
                            ${(currentInvoice.grData.receivedQty * currentInvoice.poData.unitPrice).toLocaleString()}
                          </td>
                          <td className="py-2.5 text-center">
                            {isQuantityDeficit ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                DEFICIT
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                MATCH
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Inbound Supplier Invoice Row */}
                        <tr className="bg-blue-50/40">
                          <td className="py-2.5 font-bold text-[#0A6ED1]">3. Supplier Invoice (MIRO)</td>
                          <td className="py-2.5 font-mono text-slate-600">{currentInvoice.invoiceId}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">{currentInvoice.invoiceData.invoicedQty}</td>
                          <td
                            className={`py-2.5 text-right font-bold ${
                              isSeverePriceVariance ? "text-rose-600" : "text-slate-900"
                            }`}
                          >
                            ${currentInvoice.invoiceData.invoicedUnitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-900">
                            ${currentInvoice.invoiceData.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-center">
                            {isSeverePriceVariance || isQuantityDeficit ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                VARIANCE
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                MATCHED
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Variance Summary Callout */}
                  <div className="flex items-center justify-between text-xs pt-1 text-slate-600 border-t border-slate-200">
                    <span>
                      Price Variance: <strong className={isSeverePriceVariance ? "text-rose-600 font-bold" : "text-slate-800"}>{priceVariancePct}%</strong> (Limit: {toleranceThreshold}%)
                    </span>
                    <span>
                      Quantity Variance: <strong className={isQuantityDeficit ? "text-rose-600 font-bold" : "text-slate-800"}>{qtyVariancePct}%</strong>
                    </span>
                    <span>
                      Variance Delta:{" "}
                      <strong className="text-slate-900">
                        ${(currentInvoice.invoiceData.totalAmount - currentInvoice.poData.total).toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* SAP Business AI Grounded Recommendation Box */}
                <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5 rounded-xl shadow-md relative overflow-hidden border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
                      <span className="font-bold text-sm tracking-wide text-emerald-400 uppercase">
                        SAP Business AI — 3-Way Match Resolution Engine
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        SAP Joule • S/4HANA Grounded
                      </span>
                    </div>

                    {aiAnalysis && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded ${
                            aiAnalysis.riskLevel === "LOW"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : aiAnalysis.riskLevel === "MEDIUM"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {aiAnalysis.riskLevel} RISK ({aiAnalysis.confidenceScore}% CONFIDENCE)
                        </span>
                      </div>
                    )}
                  </div>

                  {isAnalyzing ? (
                    <div className="py-6 flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                      <p className="text-xs text-slate-300">Cross-referencing PO, GR, and Invoice with SAP Business AI...</p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
                        {aiAnalysis.executiveSummary}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                          <span className="text-slate-400 font-semibold block mb-1">Key Discrepancy Drivers:</span>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            {aiAnalysis.keyDiscrepancyDrivers.map((driver, idx) => (
                              <li key={idx}>{driver}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                          <span className="text-emerald-400 font-semibold block mb-1">SAP Remediation Strategy:</span>
                          <p className="text-slate-300">{aiAnalysis.sapRemediationPlan}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Select invoice to inspect AI match analysis.</div>
                  )}
                </div>

                {/* Action Buttons Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span>Contract Ref: <strong>{currentInvoice.supplier.contractRef}</strong></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRequestCreditMemo(currentInvoice.invoiceId)}
                      disabled={currentInvoice.invoiceData.status.includes("POSTED") || currentInvoice.invoiceData.status === "PAID_CLEARED"}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FileX2 className="w-4 h-4" /> Request Credit Memo (MR8M)
                    </button>

                    <button
                      onClick={() => handleApproveInvoice(currentInvoice)}
                      disabled={currentInvoice.invoiceData.status.includes("POSTED") || currentInvoice.invoiceData.status === "PAID_CLEARED"}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-2 transition ${
                        isSeverePriceVariance
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-[#0A6ED1] hover:bg-[#0854A0]"
                      } disabled:opacity-50`}
                    >
                      {isSeverePriceVariance ? (
                        <>
                          <Lock className="w-4 h-4" /> Require VP Override Code
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Approve & Post (MIRO/MRBR)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: INVOICE OCR DOCUMENT INGESTION */}
        {activeTab === "OCR_INGESTION" && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-[#0A6ED1]" /> Automated Inbound Invoice OCR Extraction & SAP Staging
                </h2>
                <p className="text-xs text-slate-500">
                  AI-powered optical character extraction directly maps supplier PDF invoices to SAP Purchase Orders
                </p>
              </div>
              <div className="text-xs font-mono bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                SAP Document Information Extraction (DOX) Active
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Document Simulator Dropzone */}
              <div className="md:col-span-5 bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white rounded-full shadow-sm">
                  <UploadCloud className="w-8 h-8 text-[#0A6ED1]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Select Document To Ingest</h3>
                  <p className="text-xs text-slate-500 mt-1">Simulates supplier PDF invoice receipt via email/EDI</p>
                </div>

                <div className="w-full space-y-2 text-left text-xs">
                  <label className="font-semibold text-slate-700 block">Sample Inbound Document:</label>
                  <select
                    value={ocrSampleSelected}
                    onChange={(e) => setOcrSampleSelected(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                  >
                    <option value="SIEMENS_SERVO">Siemens AG - Invoice #INV-DE-9940 ($71,000.00)</option>
                    <option value="GLOBAL_ALLOYS">Global Tech Alloys - Invoice #INV-US-8820 ($48,000.00)</option>
                    <option value="APEX_BEARINGS">Apex Precision - Invoice #INV-DE-4410 ($68,500.00)</option>
                  </select>
                </div>

                <button
                  onClick={handleSimulateOCR}
                  disabled={ocrStep === "EXTRACTING"}
                  className="w-full py-2.5 bg-[#0A6ED1] hover:bg-[#0854A0] text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                  {ocrStep === "EXTRACTING" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Running OCR Extraction Engine...
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" /> Run Optical Character Extraction
                    </>
                  )}
                </button>
              </div>

              {/* Extraction Matrix Preview */}
              <div className="md:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" /> Extracted SAP Field Schema
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    Confidence: 99.4%
                  </span>
                </div>

                {ocrStep === "UPLOAD" ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Click "Run Optical Character Extraction" to extract structured invoice fields.
                  </div>
                ) : ocrStep === "EXTRACTING" ? (
                  <div className="py-12 text-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-[#0A6ED1] animate-spin mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">Extracting metadata, line items, and tax identifiers...</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-semibold uppercase block">Supplier BP</span>
                        <span className="font-bold text-slate-800 text-sm">Siemens Automation & Drives AG (VEN-99104)</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-semibold uppercase block">Target PO Ref</span>
                        <span className="font-bold text-slate-800 text-sm">PO-450008899</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-semibold uppercase block">Invoiced Amount</span>
                        <span className="font-bold text-emerald-600 text-sm">$71,000.00 USD</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-semibold uppercase block">Payment Terms</span>
                        <span className="font-bold text-slate-800 text-sm">2% 10, Net 30 ($1,420 Discount)</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 text-xs flex items-center justify-between">
                      <span className="font-medium">
                        ✓ All 20 line items matched against Goods Receipt <strong>GR-50001999</strong> at Dock Bay-02.
                      </span>
                      <button
                        onClick={handlePushOCRToWorkbench}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs text-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Stage in SAP Workbench
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: EXECUTIVE WORKING CAPITAL ANALYTICS */}
        {activeTab === "ANALYTICS" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Cash Discount Optimization
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-600">Discounts Captured (YTD):</span>
                    <span className="text-emerald-600 font-bold">$910,000 (94.2%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94.2%" }}></div>
                  </div>
                  <div className="flex justify-between text-slate-500 pt-1">
                    <span>Baseline Manual Capture:</span>
                    <span className="line-through">$140,000 (32%)</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-600" /> 3-Way Variance Pareto
                </h3>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Price Variance (&gt;5%):</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unreceived Goods / Deficit:</span>
                    <span className="font-bold">35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approved Energy Surcharges:</span>
                    <span className="font-bold">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax / Currency Delta:</span>
                    <span className="font-bold">5%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Working Capital Velocity
                </h3>
                <div className="text-2xl font-black text-slate-900">+$1.85M</div>
                <p className="text-xs text-slate-500">
                  Freed operating cash flow via elimination of blocked invoice backlogs and early payment execution.
                </p>
              </div>
            </div>

            {/* Supplier Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0A6ED1]" /> Supplier Compliance & Match Reliability Scorecard
              </h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5">Supplier Name</th>
                    <th className="py-2.5">Rating</th>
                    <th className="py-2.5 text-right">Invoices (Q3)</th>
                    <th className="py-2.5 text-right">First-Time Match %</th>
                    <th className="py-2.5 text-right">Dispute Frequency</th>
                    <th className="py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 font-bold text-slate-800">Global Tech Alloys Corp</td>
                    <td><span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">A+</span></td>
                    <td className="text-right font-medium">142</td>
                    <td className="text-right font-bold text-emerald-600">98.5%</td>
                    <td className="text-right text-slate-500">0.8%</td>
                    <td className="text-center"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Preferred</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-slate-800">Apex Precision Bearings GmbH</td>
                    <td><span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">B</span></td>
                    <td className="text-right font-medium">84</td>
                    <td className="text-right font-bold text-amber-600">82.1%</td>
                    <td className="text-right text-slate-500">14.3%</td>
                    <td className="text-center"><span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Under Review</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-slate-800">CyberLogix Microchips Pte</td>
                    <td><span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">D</span></td>
                    <td className="text-right font-medium">39</td>
                    <td className="text-right font-bold text-rose-600">54.0%</td>
                    <td className="text-right text-rose-600 font-bold">41.0%</td>
                    <td className="text-center"><span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">High Risk</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: SAP F110 BATCH PAYMENT PROGRAM */}
        {activeTab === "F110_PAYMENTS" && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0A6ED1]" /> SAP F110 Automated Batch Payment Run
                </h2>
                <p className="text-xs text-slate-500">
                  Select verified invoices to generate payment proposals and execute bank clearing (ISO 20022 XML)
                </p>
              </div>
              <button
                onClick={handleExecuteBatchPayment}
                disabled={isProcessingPayment || selectedForPayment.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Executing F110 Payment Run...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Run Payment Program ({selectedForPayment.length} Selected)
                  </>
                )}
              </button>
            </div>

            {paymentSuccessReport && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between">
                <span>{paymentSuccessReport}</span>
                <span className="font-mono bg-white px-2.5 py-1 rounded border border-emerald-200">ISO 20022 XML Generated</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 w-10">Select</th>
                    <th className="py-2.5">Invoice ID</th>
                    <th className="py-2.5">Supplier Name</th>
                    <th className="py-2.5">Payment Terms</th>
                    <th className="py-2.5 text-right">Discount Value</th>
                    <th className="py-2.5 text-right">Net Payable Amount</th>
                    <th className="py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const isChecked = selectedForPayment.includes(inv.invoiceId);
                    const isEligible = inv.invoiceData.status.includes("POSTED") || inv.invoiceData.status === "BLOCKED";

                    return (
                      <tr key={inv.invoiceId} className={isChecked ? "bg-blue-50/50" : ""}>
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedForPayment((prev) =>
                                isChecked ? prev.filter((id) => id !== inv.invoiceId) : [...prev, inv.invoiceId]
                              );
                            }}
                            className="rounded text-[#0A6ED1] focus:ring-0"
                          />
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-800">{inv.invoiceId}</td>
                        <td className="py-3 font-medium text-slate-700">{inv.supplier.name}</td>
                        <td className="py-3 text-slate-600">{inv.supplier.paymentTerms}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">
                          ${inv.supplier.discountValue.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900">
                          ${inv.invoiceData.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.invoiceData.status === "PAID_CLEARED"
                                ? "bg-cyan-100 text-cyan-800"
                                : inv.invoiceData.status.includes("POSTED")
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {inv.invoiceData.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 5: COMPLIANCE & SOD AUDIT LOG */}
        {activeTab === "AUDIT_LOG" && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#0A6ED1]" /> Immutable SAP S/4HANA Separation of Duties (SoD) Audit Trail
                </h2>
                <p className="text-xs text-slate-500">Every override, release, and credit memo action is signed and permanently logged</p>
              </div>
              <button
                onClick={() => triggerToast("Audit Report CSV Exported to Downloads folder.", "success")}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Audit Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5">Log ID</th>
                    <th className="py-2.5">Timestamp</th>
                    <th className="py-2.5">Invoice Ref</th>
                    <th className="py-2.5">Action Executed</th>
                    <th className="py-2.5">User Role</th>
                    <th className="py-2.5">Auth Code / Ref</th>
                    <th className="py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 font-bold text-slate-700">{log.id}</td>
                      <td className="py-3 text-slate-500">{log.timestamp}</td>
                      <td className="py-3 font-bold text-[#0A6ED1]">{log.invoiceId}</td>
                      <td className="py-3 font-sans font-medium text-slate-800">{log.action}</td>
                      <td className="py-3 text-slate-600">{log.user}</td>
                      <td className="py-3 text-purple-700 font-bold">{log.authRef || "-"}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${
                            log.statusBadge === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.statusBadge === "OVERRIDE"
                              ? "bg-purple-100 text-purple-800"
                              : log.statusBadge === "CREDIT_MEMO"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {log.statusBadge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Floating SAP Joule AI Copilot Drawer */}
      {isJouleOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Joule Header */}
          <div className="bg-gradient-to-r from-[#0A6ED1] to-[#0854A0] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-300 animate-spin" style={{ animationDuration: "8s" }} />
              <div>
                <h3 className="font-bold text-sm">SAP Joule AI Copilot</h3>
                <span className="text-[10px] text-blue-200">SAP Foundation Model Active</span>
              </div>
            </div>
            <button onClick={() => setIsJouleOpen(false)} className="text-white hover:text-slate-200 font-bold text-lg">
              ×
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {jouleMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[85%] ${
                  msg.sender === "user"
                    ? "bg-[#0A6ED1] text-white ml-auto rounded-tr-none"
                    : "bg-slate-100 text-slate-800 mr-auto rounded-tl-none border border-slate-200"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isJouleThinking && (
              <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl mr-auto text-xs flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0A6ED1]" />
                Joule is consulting S/4HANA rules...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about 3-way match, MRBR, MIRO..."
              value={jouleInput}
              onChange={(e) => setJouleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendJouleMessage()}
              className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A6ED1]"
            />
            <button
              onClick={handleSendJouleMessage}
              className="p-2.5 bg-[#0A6ED1] hover:bg-[#0854A0] text-white rounded-lg shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hard Validation Executive Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">SAP Procurement Override Required</h3>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                <strong>Business Rule Violation:</strong> Invoice {currentInvoice.invoiceId} exceeds the{" "}
                <strong>{toleranceThreshold.toFixed(1)}% Price Tolerance Limit (+{priceVariancePct}%)</strong> (Variance Amount: +$
                {(
                  (currentInvoice.invoiceData.invoicedUnitPrice - currentInvoice.poData.unitPrice) *
                  currentInvoice.invoiceData.invoicedQty
                ).toLocaleString()}
                ).
              </div>
              <p>
                To release this invoice for payment run (F110), provide an authorized Procurement VP Authorization Key.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authorization Key (Try: <code className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded">AUTH-AP-8840</code>)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AUTH-AP-8840"
                  value={authCodeInput}
                  onChange={(e) => setAuthCodeInput(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                {authError && <p className="text-xs text-rose-600 font-semibold mt-1">{authError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Reason Code</label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Procurement VP Approved Contract Indexation">Procurement VP Approved Contract Indexation</option>
                  <option value="Raw Material Emergency Surcharge Clause">Raw Material Emergency Surcharge Clause</option>
                  <option value="Expedited Freight Adjustment Accepted">Expedited Freight Adjustment Accepted</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOverride}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
              >
                Confirm & Release Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
