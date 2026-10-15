# SAP ContextStore AI 🌐

> Enterprise SAP Configuration & Knowledge Graph Context Store powered by **Lyzr Agent API** (`agent-prod.studio.lyzr.ai/v3`).

---

## 🎯 Overview

**SAP ContextStore AI** is a purpose-built, high-performance web interface designed for SAP functional consultants, solution architects, and ABAP developers. It connects directly to the Lyzr Agent Engine to provide deep contextual guidance on:

- **SPRO IMG Paths & Navigation**: Step-by-step guidance for configuring enterprise structures, modules, and cross-component integration.
- **Account Determination Blueprints**: Deep dives into `OBYC` (MM-FI), `VKOA` (SD-FI), and posting keys (`BSX`, `WRX`, `PRD`, `ERL`).
- **S/4HANA Modern Architecture**: Universal Journal (`ACDOCA`), Document Splitting in New GL, Business Partner (`BP`/CVI), and mandatory Material Ledger (`OMX1`).
- **Dynamic Context Inspector**: Live tracking of identified SAP Transaction Codes, SPRO hierarchy nodes, and real-time Lyzr API telemetry (latency, raw JSON payloads).

---

## 🚀 Quick Start

### 1. Launch Local Server
From this project directory:
```bash
npm start
# or
node server.js
```
The server runs on `http://localhost:3000`.

### 2. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in any modern web browser.

---

## 🔑 Lyzr Agent Configuration

The application is pre-configured with the credentials provided:

| Parameter | Default Value | Description |
|:---|:---|:---|
| **Endpoint** | `https://agent-prod.studio.lyzr.ai/v3/inference/chat/` | Lyzr Inference API v3 |
| **x-api-key** | `sk-default-7WzS61EOVRaEMdhImU96hHAgdoUFxDdF` | Lyzr authentication key |
| **user_id** | `avikash@kaartech.com` | User identification |
| **agent_id** | `6ad09364bb3cc892445a6a34` | SAP Configuration Agent ID |
| **session_id** | `6ad09364bb3cc892445a6a34-wmpp27k0` | Multi-turn conversation session |

> ⚙️ **Note:** You can inspect or update any of these settings at runtime by clicking the **Settings Gear** icon in the top-right corner of the UI.

---

## 💎 Features

- ⚡ **Direct Lyzr API Integration**: Preflight CORS-compliant direct browser calls with an automatic local proxy fallback (`/api/chat-proxy`) for enterprise firewall environments.
- 🎨 **Executive UI / Fiori Horizon Aesthetics**: Obsidian dark mode with vibrant neon accents and responsive light theme toggle.
- 🏷️ **Smart T-Code Recognition**: Automatic detection of SAP T-Codes (e.g. `SPRO`, `OBYC`, `OX02`, `VKOA`, `FB50`) with interactive chips that can be clicked for instant contextual deep dives.
- 🧭 **Module Blueprint Catalog**: Pre-populated starter queries across ORG, FI, CO, MM, SD, PP, S/4HANA, and Basis.
- 📡 **Context Inspector & Telemetry Drawer**:
  - **Knowledge Nodes Tab**: Active context graph hierarchy and detected T-Codes.
  - **Lyzr Telemetry Tab**: Real-time HTTP response status, millisecond latency metrics, and raw JSON payload viewer with one-click copy.
  - **T-Code Hub Tab**: Searchable library of common SAP transactions.
- 🔊 **Voice & Export Tools**: Built-in Text-to-Speech (reads configuration steps aloud) and one-click Markdown export.
