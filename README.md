# MediTrack PHC — Medicine Stock Management & Redistribution System

An intelligent inventory management and peer-to-peer lateral redistribution platform designed for **Primary Health Centres (PHCs)** in Namakkal District, Tamil Nadu.

---

## 🚨 Problem Context (The Human Reality Behind the Design)

A mother walks 6 km under the hot sun to a Primary Health Centre with a feverish child. When she arrives at the dispensing counter, the pharmacist delivers heartbreaking news: *paracetamol syrup ran out a week ago*. 

The pharmacist noticed stock dwindling, but the rigid bureaucratic system only allows submitting an indent form to the District Drug Warehouse on the 1st of the month. Meanwhile, three neighbouring PHCs in the exact same administrative block—just 9 to 15 km away—held hundreds of surplus bottles expiring unused on their shelves.

### The Two Critical Root Causes:
1. **Watching the Stock Number instead of the Speed (Burn Rate):** 200 bottles when burning at 50 bottles/day will deplete in 4 days (Emergency!), whereas 40 bottles burning at 2 bottles/day will safely last 20 days. Traditional registers only watch static minimum quantities, ignoring velocity.
2. **Top-Down Only Supply Chain:** PHCs could only request supplies vertically from the district warehouse once a month, never sideways from neighbouring PHCs with excess stock.

**MediTrack PHC solves both root causes.**

---

## 🛠 Tech Stack
- **Backend:** Python Flask + SQLite (`sqlite3` with foreign keys & transaction atomicity)
- **Frontend:** Responsive HTML5, Custom Healthcare CSS System, Vanilla JavaScript (ES6+)
- **Visualizations:** Chart.js (CDN) for consumption trends & 7-day moving-average forecasting
- **No external heavy dependencies or database servers required.** Runs out of the box with standard Python!

---

## ⚡ Quick Start & Run

### 1. Installation
```bash
pip install -r requirements.txt
```

### 2. Start Application
```bash
python app.py
```

Open your browser at: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### 3. Pre-Seeded Authentication Credentials

#### 🏥 A. Hospital Staff Logins (`/login` - Default Password: `phc123`)

| Health Centre (PHC) | Username | Password | Role / Scenario in Demo |
| :--- | :--- | :--- | :--- |
| **Pallipalayam PHC** | `pallipalayam` | `phc123` | Active Centre (Surplus Donor) |
| **Komarapalayam PHC** | `komarapalayam` | `phc123` | Shortage Centre (Outbreak & Burn Spike) |
| **Tiruchengode PHC** | `tiruchengode` | `phc123` | Surplus Donor (8.4 km away) |
| **Namakkal Town PHC** | `namakkal` | `phc123` | High Outpatient Volume |
| **Rasipuram PHC** | `rasipuram` | `phc123` | ORS Shortage Centre |
| **Paramathi Velur PHC** | `pvelur` | `phc123` | Surplus Metformin |

#### 👨‍👩‍👧 B. Public / Citizen Logins (`/citizen/login` - Dedicated Mother Portal)

| Citizen / Patient Role | Mobile / Phone | Password | Access & Features |
| :--- | :--- | :--- | :--- |
| **Mother (Anjali)** | `9876543210` | `citizen123` | Live stock checker across block, alternative PHC discovery |
| **New Citizen Signup** | Custom Mobile | Custom Pass | Self-service registration via **[/citizen/register](/citizen/register)** |

> 💡 **Portal Switching:** Seamless toggle tabs on both login pages let you easily switch between **🏥 Hospital Staff** and **👨‍👩‍👧 Public / Citizen** workspaces!
> 💡 **New Hospital Registration:** Health centres can self-register anytime via **[/register](/register)**!
> 🌡️ **Block Epidemic Surveillance Radar:** Real-time outbreak detector linking medicine burn velocity spikes to infectious disease clusters (Dengue, Viral Fever, Diarrhea).

*Note: Database schema and Namakkal District seed data are automatically initialized on the first run!*

---

## ⏱ 2-Minute Demo Script (The Mother & Child Walkthrough)

Follow this exact sequence to demonstrate how MediTrack PHC prevents medicine stockouts in real time:

### Step 1: Open Dashboard — Catching the Speed, Not Just the Number
1. Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.
2. Notice the prominent **Red Critical Alert Banner**:
   > *"Komarapalayam PHC — Paracetamol syrup: 2.0 days left at current burn rate (+122% this week) (Stock: 48, Min: 50)"*
3. Look at the **Stock Health Heatmap**:
   - Locate the row for **Komarapalayam PHC** and column for **Paracetamol syrup**.
   - Notice the bright red cell: `2.0d ↑`.
   - Hover over the cell to see the velocity: Dispensing accelerated from 12/day to 38/day due to an outpatient fever outbreak.

### Step 2: Open Shortage Alerts — Finding the Nearest Lateral Donor
1. Click **Shortage Alerts** in the top navigation (or tap **View Alerts & Donors** on the banner).
2. Inspect the **CRITICAL** alert card for **Komarapalayam PHC — Paracetamol syrup**:
   - Reason badge: `🔥 FAST BURN RATE`.
   - Velocity indicator: `↑ Burning faster (+122%)`.
   - Look inside the **Suggested Donor Card**:
     > *"Suggested Donor: Pallipalayam PHC • Distance: 10.3 km • Current Stock: 420 • Can supply: 340 100ml Bottles"*
3. Click the **[Request Transfer (EMERGENCY)]** button.
   - A success toast confirms the creation of a high-priority emergency request bypassing monthly district indent cycles!

### Step 3: Approve Lateral Transfer — Moving Stock Sideways
1. Click **Peer Transfers** in the navigation (`/requests`).
2. Notice the top request:
   - Priority: `EMERGENCY` (pulsing red tag).
   - Medicine: `Paracetamol syrup`.
   - Requester: `Komarapalayam PHC`.
   - Donor: `Pallipalayam PHC`.
   - Quantity: `340 units`.
3. Click **[Approve]** on behalf of Pallipalayam PHC:
   - The transfer is atomically processed in SQLite.
   - Pallipalayam's stock reduces safely (never below their 2x minimum buffer floor of 80 bottles).
   - Komarapalayam's stock increases from 48 to 388 bottles!
   - MediTrack automatically re-evaluates inventory velocity and resolves the active shortage alert.

### Step 4: Verification & District Indent
1. Return to the **Dashboard** (`/`):
   - The Red Alert Banner has disappeared!
   - In the Heatmap, Komarapalayam's Paracetamol syrup cell is now healthy **GREEN** (`17.2d →`).
2. Go to **Peer Transfers** (`/requests`) and scroll to **Auto-Generated District Indent**:
   - The system computes the net deficit after peer rebalancing.
   - Click **[Download District Indent CSV]** to see the clean procurement sheet ready for the District Collector and Drug Warehouse.

---

## 📐 Key Algorithmic Mechanics

### 1. Burn Rate, Days of Supply & Trend Arrow
- **7-Day Average Daily Usage:**
  $$\text{avg\_daily\_usage} = \frac{\sum_{t=0}^{6} \text{usage}(t)}{7}$$
- **Days of Supply Remaining:**
  $$\text{days\_left} = \frac{\text{current\_quantity}}{\text{avg\_daily\_usage}}$$
  - **RED:** $\text{days\_left} < 3$
  - **YELLOW:** $3 \le \text{days\_left} \le 7$
  - **GREEN:** $\text{days\_left} > 7$
- **Trend Calculation (Last 3 Days vs. Baseline Prior 7 Days):**
  $$\Delta \% = \frac{\overline{\text{usage}}_{3\text{d}} - \overline{\text{usage}}_{\text{prev } 7\text{d}}}{\overline{\text{usage}}_{\text{prev } 7\text{d}}} \times 100$$
  - If $\Delta \% \ge +25\%$: $\uparrow$ **"Burning faster"** (Red).
  - If $\Delta \% \le -25\%$: $\downarrow$ **"Slowing down"** (Green).
  - Otherwise: $\rightarrow$ **"Stable"**.

### 2. Haversine Distance & Surplus Rebalancing
- Calculates direct geodesic distances between PHCs without relying on paid or external mapping APIs:
  $$d = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos \phi_1 \cos \phi_2 \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  *(with Earth radius $R = 6371.0\text{ km}$)*
- **Surplus Rule:** A PHC is a donor candidate when $\text{days\_left} > 30$ **AND** $\text{quantity} > 3 \times \text{min\_level}$.
- **Donor Protection:** Donors can never be depleted below their safety buffer floor ($2 \times \text{min\_level}$).

---

## 🌐 Bilingual Support (English & தமிழ்)
- Click the language toggle button in the navbar (**தமிழ்** / **English**) to translate navigation labels, metrics, status badges, and action buttons in real time without refreshing the page. Preference persists in `localStorage`.

---

## 📧 Optional Gmail SMTP Notifications
MediTrack can optionally dispatch alert emails to PHC medical officers. Set the following environment variables (or in a `.env` file):
```env
SMTP_EMAIL=your-phc-admin@gmail.com
SMTP_PASSWORD=your-app-password
```
*(If unset, email alerts skip silently without interrupting system operations).*

## 💡 Innovative Features Added (Zero-Shortage & Zero-Wastage Architecture)

### 1. 💡 Near-Expiry Smart Rescue Swap (மருந்து வீணாவதை 0% ஆக்கும் தலைகீழ் மறுபகிர்வு)
* **Problem Solved:** Millions worth of medicines expire unused in rural clinics while busy taluk/district hospitals run out.
* **Algorithm:** Projects actual consumption before expiry: `Wastage Risk = Current Qty - (Daily Burn Rate × Days to Expiry)`.
* **Action:** When wastage risk is detected within 90 days, the AI automatically discovers high-volume sister hospitals and pairs them for an immediate 1-click **Rescue Swap**, preventing total expiry loss.

### 2. ⚡ Autonomous Lateral Rebalance (தானியங்கி மறுபகிர்வு)
* **Problem Solved:** Bureaucratic transfer paperwork takes days while emergency patients suffer.
* **Mechanism:** When stock drops below 3 days buffer, the autonomous trigger scans nearby surplus centres within 15 km, enforces the **Donor Safety Rail** ($\ge 2\times$ min buffer), generates a **Digital Transit Waybill** (`TN-AUTO-WB-2026-XXXX`), and initiates dispatch in real time with 0s human delay.

### 3. 📜 Digital Batch Passport & Birth-to-Dispense Traceability (டிஜிட்டல் மருந்து பாஸ்போர்ட்)
* **Problem Solved:** Counterfeit drugs entering the supply chain and black market medicine leakage.
* **Traceability:** Provides a complete 6-stage cryptographic audit trail:
  1. 🏭 **Manufacture:** Pharma Plant (Apex Pharma Labs, Chennai), QC chemical purity assay, batch certificate SHA-256 hash.
  2. 🏢 **TNMSC Central Depot:** Namakkal Depot inward check, 2D DataMatrix minting, cold-chain temp log.
  3. 🏥 **Initial PHC Storage:** Hospital dispensary inward scan.
  4. ⚡ **Autonomous Trigger:** MediTrack AI imbalance detection & automated transit waybill.
  5. 🚚 **Live Health Courier:** GPS route, distance, ETA, IoT cold-chain temperature telemetry.
  6. 🏥 **Target Dispensing Counter:** Verified receipt and Citizen OTP Proof-of-Consumption.
* Accessible to both hospital pharmacists and citizens on the public portal!

---

## 📁 File Structure
```
meditrack-phc/
├── app.py                     # Flask server, page routes, REST API & CSV exports
├── database.py                # SQLite schema, migrations & audit logging helper
├── seed_data.py               # Namakkal District 6-PHC seed scenario
├── services/
│   ├── stock_service.py       # Velocity, burn rate, days_left, trend & atomic usage
│   ├── alert_service.py       # Smart alert creation, deduplication & resolution
│   ├── transfer_service.py    # Haversine distance, surplus logic & autonomous rebalance
│   ├── forecast_service.py    # 7-day Simple Moving Average demand forecasting
│   ├── epidemic_service.py    # Block-level outbreak cluster detection radar
│   ├── expiry_rescue_service.py # Near-Expiry Smart Rescue Swap (Zero-Wastage)
│   └── passport_service.py    # Digital Batch Passport (Birth-to-Dispense Provenance)
├── templates/
│   ├── base.html              # Layout, navbar, Digital Batch Passport modal & language toggle
│   ├── dashboard.html         # Metrics, red banner, rescue swap radar & inventory snapshot
│   ├── stock.html             # Stock table with Batch No & Digital Passport launcher
│   ├── usage.html             # Daily outpatient multi-item dispensing form
│   ├── analytics.html         # Chart.js weekly/monthly demand & forecast line chart
│   ├── requests.html          # Peer transfer approvals, live transit tracking & waybills
│   ├── alerts.html            # Shortage alerts & nearest donor suggestion cards
│   ├── activity.html          # Full system audit trail
│   └── citizen.html           # Public medicine availability & drug origin verification
├── static/
│   ├── css/style.css          # Healthcare UI design system, transit stepper & passport timeline
│   └── js/
│       ├── common.js          # 100% Pure Bilingual engine, toasts & global passport viewer
│       ├── dashboard.js       # Dashboard cards, rescue swap triggers & auto-rebalance
│       ├── stock.js           # Inventory filtering, batch passport inspection & edit modals
│       ├── usage.js           # Dynamic dispensing rows & stock validation
│       ├── analytics.js       # Bar charts & moving-average forecast lines
│       ├── requests.js        # Transfer approvals, rejections & waybill badges
│       └── alerts.js          # Velocity alert cards & one-click transfer requests
├── requirements.txt
└── README.md
```

---

## 📜 License & Acknowledgements
Built for rural public health systems. Dedicated to primary healthcare workers and families served by Tamil Nadu Primary Health Centres.
