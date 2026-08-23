# SAP S/4HANA Procure-to-Pay (P2P) Intelligent 3-Way Match & Invoice Exception Cockpit

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![SAP Fiori](https://img.shields.io/badge/SAP%20Fiori-Horizon-0A6ED1?style=flat&logo=sap)](https://www.sap.com/)
[![SAP Business AI](https://img.shields.io/badge/SAP%20Business%20AI-Joule%20Core-emerald?style=flat)](https://www.sap.com/products/artificial-intelligence.html)

An enterprise-grade **Procure-to-Pay (P2P) Decision Support Suite** that modernizes SAP transactions **MRBR, MIRO, MIGO, and F110**. Built with Next.js 14, Tailwind CSS, and SAP Business AI, this application empowers Accounts Payable clerks and Procurement Managers to resolve 3-way match variances in seconds, capture early-payment discounts, and eliminate unreceived goods leakage.

---

## 📌 Executive Summary & Business Impact

In global manufacturing enterprises, **over 25% of inbound supplier invoices** are blocked due to discrepancies between the Purchase Order (PO), Goods Receipt (GR), and Supplier Invoice. Manual cross-referencing in legacy SAP GUI creates a **9.4-day processing delay** and leads to hundreds of thousands of dollars in lost early-payment cash discounts.

| Business KPI | Baseline (Legacy Manual Process) | Target with AI Cockpit | Quantified Business Value |
| :--- | :--- | :--- | :--- |
| **Invoice Processing Cycle Time** | **9.4 Days** | **1.2 Days** | **-87.2%** faster invoice-to-payment turnaround |
| **3-Way Match Exception Rate** | **25.0%** (1 in 4 invoices held) | **4.8%** | **-80.8%** reduction in manual AP rework backlog |
| **Early Payment Discount Capture** | **$140,000 / year** (32% capture rate) | **$910,000 / year** (94% capture rate) | **+$770,000 / year** in direct bottom-line cash savings |
| **Working Capital Unlocked** | Baseline | **+$1.85 Million** | Freed cash flow via timely clearing and zero leakage |

---

## 🏛️ SAP S/4HANA Process & Architecture Mapping

```
 [Purchase Requisition] ──> [Purchase Order] ──> [Goods Receipt] ──> [Inbound Supplier Invoice]
       (ME51N)                   (ME21N)              (MIGO)                    (MIRO)
                                    │                    │                         │
                                    └──────────┬─────────┴─────────────────────────┘
                                               ▼
                              ┌───────────────────────────────────┐
                              │  SAP 3-Way Match Verification     │
                              │  (Tolerance Keys: PP, BD, ST)     │
                              └────────────────┬──────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
   [Tolerance Check: PASS]                                         [Tolerance Check: BREACH]
               │                                                               │
     [Automated MIRO Post]                                           [SAP Business AI Triage]
               │                                                               │
     [SAP F110 Batch Payment]                          ┌───────────────────────┴───────────────────────┐
   (ISO 20022 XML Bank Medium)                         ▼                                               ▼
                                            [Minor Variance <5%]                            [Severe Breach >5% or Missing GR]
                                                       │                                               │
                                            [Approve with Tolerance]                        [Procurement VP Override Required]
                                                                                            (Auth Key: AUTH-AP-8840 / MR8M Memo)
```

### Core SAP Objects & Tables Referenced:
* **Business Partner (`LFA1` / `BUT000`):** Supplier master, payment terms (`Z010` - 2% 10, Net 30), risk rating.
* **Purchase Order (`EKKO` / `EKPO`):** Contractual line items, net unit price, ordered quantities, plant codes.
* **Goods Receipt (`MKPF` / `MSEG`):** Physical warehouse dock receipts via MIGO.
* **Supplier Invoice (`RBKP` / `RSEG`):** Inbound billing verification and tolerance holds (`PP` Price Variance, `BD` Quantity Deficit).
* **Payment Run (`REGUH` / `REGUP`):** SAP F110 automated outgoing payment clearing.

---

## 🚀 Key Enterprise Modules

### 1. 📋 3-Way Match Resolution Workbench
* **Dynamic Tolerance Slider (1% – 10%):** Live adjustment of SAP tolerance key `PP` with real-time recalculation of exception statuses.
* **Granular 3-Way Reconciliation Grid:** Line-item comparison of PO, Goods Receipt, and Invoice.
* **Grounded AI Decision Engine:** Real-time risk scoring, confidence rating, root-cause discrepancy breakdown, and recommended SAP remediation plan.
* **Hard Rule Validation:** Enforces mandatory Procurement VP Authorization (`AUTH-AP-8840`) for price breaches exceeding policy limits.

### 2. 📑 AI Invoice OCR & Document Ingestion Simulator
* Simulates receipt of PDF invoices from global suppliers (Siemens, Global Alloys, Apex Bearings).
* Optical character extraction with **99.4% confidence score** and automated PO reference mapping.
* 1-click **"Stage in SAP Workbench"** button to inject newly extracted invoices directly into the live worklist.

### 3. 📊 Executive Working Capital & AP Analytics Dashboard
* Real-time visual tracking of **Early Cash Discounts Captured ($910,000 / 94.2%)**.
* Root-Cause Discrepancy Pareto Breakdown (Price Spikes, Unreceived Goods, Energy Tariffs).
* Supplier Compliance Scorecard with first-time match rates and dispute frequency history.

### 4. ⚡ SAP F110 Automated Batch Payment Run Simulator
* Multi-select verified invoices for bulk payment execution.
* Generates simulated **ISO 20022 XML / MT103 bank payment files** and updates status to `PAID_CLEARED`.

### 5. 🛡️ Immutable Compliance & SoD Audit Trail
* Full chronological timeline of every user approval, VP override key, credit memo dispatch (`MR8M`), and timestamp.
* Export to CSV feature for internal audit readiness.

### 6. 💬 Floating SAP Joule AI Copilot Drawer
* Interactive S/4HANA assistant ready to answer live questions about variance policies, transaction codes, and vendor contract terms.

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 14+ (App Router), React 18, Tailwind CSS, Lucide React Icons.
* **Design System:** SAP Fiori 3 / Horizon Theme (Status Badges, KPI Tiles, Master-Detail Workbenches).
* **Backend:** Next.js Route Handlers (`/api/analyze`) with low-temperature grounded prompt orchestration.
* **Intelligence Layer:** OpenAI-compatible LLM inference engine with automated deterministic fallback matrix.
* **Deployment:** Vercel (Edge Network).

---

## 📦 Getting Started (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/Arthi-2005/sap-p2p-3way-match-cockpit.git
cd sap-p2p-3way-match-cockpit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create `.env.local` in the project root:
```env
NVIDIA_API_KEY=your_api_key_here
```
*(Note: If no API key is provided, the built-in deterministic SAP rule matrix will execute offline evaluations with zero latency).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel

1. Push your repository to GitHub.
2. Import the project on [Vercel](https://vercel.com/new).
3. Add `NVIDIA_API_KEY` in **Project Settings > Environment Variables**.
4. Click **Deploy**!

---

## 👥 Authors & Acknowledgments
Built for the **SAP Campus Hiring Assessment** as an enterprise-grade demonstration of full-stack engineering, SAP domain depth, and grounded AI decision support.
