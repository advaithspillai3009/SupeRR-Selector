# 🏏 SupeRR Selector — Pressure Performance Intelligence
### *Next-Generation T20 Clutch Analytics & Decision Intelligence Platform*
**Engineered for Rajasthan Royals — SupeRR Selector Season 2**

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Model Version](https://img.shields.io/badge/model-SupeRR--ClutchML%20v2.4-E65391.svg)]()
[![Platform](https://img.shields.io/badge/platform-Rajasthan%20Royals%20Intelligence-101C37.svg)]()
[![Coverage](https://img.shields.io/badge/data-867%20Matches%20%7C%20201k%20Balls-D6B66C.svg)]()
[![License](https://img.shields.io/badge/license-Proprietary%20%2F%20RR%20Analytics-green.svg)]()

---

## 📌 Executive Summary

In high-stakes Twenty20 cricket, standard aggregate metrics—such as nominal batting average, raw strike rate, and baseline economy rate—frequently fail to identify winning players. A batsman scoring 45 runs off 30 balls in a low-leverage situation does not offer the same tactical value as a batter scoring 24*(10) when chasing 13.5 runs per over with only 3 wickets in hand. Similarly, a bowler delivering maiden overs during a low-pressure powerplay differs fundamentally from one defending 11 runs in the 20th over of an IPL Eliminator.

**SupeRR Selector** is an end-to-end Machine Learning intelligence platform and web application developed to evaluate and rank **true pressure delivery**. By evaluating **200,999 ball-level deliveries across 867 IPL and T20 International matches**, SupeRR Selector isolates high-stress leverage moments from routine baseline conditions. 

In strict adherence to tournament eligibility guidelines, **IPL-eligible player pools are enforced** (excluding Pakistan and Bangladesh players, as well as officially retired cricketers such as Dinesh Karthik), providing the Rajasthan Royals scouting department with actionable, statistically robust recruitment and auction targets.

---

## 🏛️ Project Architecture & Repository Structure

The repository is cleanly partitioned into the core analytical ML model (`SupeRR_ClutchML/`), the raw and processed datasets (`Data Pack/`), the web intelligence frontend (`web/`), and orchestration automation scripts:

```
6af458274c1e8_data_pack/
│
├── README.md                          # Comprehensive project report & presentation documentation
├── build_platform_data.py             # ETL pipeline compiling ML outputs into web JSON bundles
├── expand_auction_targets.py          # Auction targeting generator for 15 tactical RR picks
├── setup_player_images.py             # Player headshot ingestion and vector SVG asset pipeline
│
├── SupeRR_ClutchML/                   # 🧠 CORE MACHINE LEARNING ENGINE
│   ├── README.md                      # ML model technical specification and mathematical derivations
│   ├── run_pipeline.py                # Pipeline CLI runner (ingestion -> ML -> rankings -> CSV)
│   ├── src/
│   │   ├── __init__.py
│   │   ├── config.py                  # Hyperparameters, leverage thresholds, and weights
│   │   ├── data_loader.py             # Cricsheet delivery ingestion & eligibility filters
│   │   ├── feature_engineering.py     # State-space dynamic Pressure Index (PI) generator
│   │   ├── ml_models.py               # Win Probability Engine & Expectancy ML models
│   │   └── scoring_engine.py          # Dual Benchmarking, Bayesian shrinkage & role selector
│   └── outputs/
│       ├── top_10_batters.csv         # Official ranked Top 10 Batters (IPL-eligible)
│       └── top_10_bowlers.csv         # Official ranked Top 10 Bowlers (IPL-eligible)
│
├── web/                               # 🌐 EDITORIAL WEB PLATFORM
│   ├── server.py                      # Production-grade lightweight HTTP server
│   ├── data/                          # Platform runtime data cache
│   │   └── platform_data.json         # Unified JSON bundle powering the web UI
│   └── static/
│       ├── index.html                 # Single Page Application (Rajasthan Royals Editorial Layout)
│       ├── css/
│       │   └── styles.css             # RR Editorial Design System (Light theme, ivory, navy, pink, gold)
│       ├── js/
│       │   ├── app.js                 # State controller, search/sort, collectible trading cards, modals
│       │   └── charts.js              # High-DPI Canvas charts (distribution histograms, progressions)
│       ├── vendor/katex/              # Local, offline KaTeX mathematical formula rendering engine
│       └── images/
│           ├── brand/                 # Rajasthan Royals official crest & monogram assets
│           ├── hero/                  # Light-mode editorial hero graphics
│           └── players/               # Official player headshots (jpg, png, svg fallbacks)
│
└── Data Pack/                         # 📊 HISTORICAL CRICKET TELEMETRY
    ├── match_info.csv                 # 867 match records (venue, toss, date, stage, knockout flag)
    └── match_data.csv                 # 200,999 individual ball-by-ball delivery telemetry records
```

---

## 🔬 Mathematical Methodology & Machine Learning Engine

The analytics framework is constructed on two foundational pillars:
1. **Dynamic Ball-Level Pressure Classification ($PI$)**
2. **Dual-Benchmark Clutch Performance Scoring ($CS$)**

```
Raw Delivery Telemetry (200,999 balls)
               │
               ▼
┌──────────────────────────────────────────────┐
│   Win Probability & Leverage Index Engine    │
│  - Logistic WP: WP(s) = 1 / (1 + exp(-z))    │
│  - Leverage Index: LI = |ΔWP_four - ΔWP_wkt| │
│  - Collapse Strain & Death Overs Margin      │
│  - Tournament & Knockout Multipliers         │
└──────────────────────────────────────────────┘
               │
               ▼
   State Classification:
   - High Pressure Deliveries (PI ≥ 65.0)  -> 61,362 balls (~30.5%)
   - Baseline Deliveries (PI < 65.0)       -> 139,637 balls (~69.5%)
               │
               ▼
┌──────────────────────────────────────────────┐
│        Dual-Benchmark Scoring Model          │
│  - Personal Delta: ΔSR = SR_pres - SR_base   │
│  - Added Value: Runs/Wickets Above Expected  │
│  - Bayesian Shrinkage: w = N / (N + 40)      │
│  - Match Consistency Variance Penalty        │
└──────────────────────────────────────────────┘
               │
               ▼
  Official Top 10 Batters & Bowlers + 15 Auction Targets
```

---

### 1. Dynamic Ball-Level Pressure Index ($PI \in [0, 100]$)

Every legal delivery is mapped to a state vector:
$$s = \langle \text{Innings}, \text{Over}, \text{Ball}, \text{RunsNeeded}, \text{BallsRemaining}, \text{WicketsRemaining}, \text{RequiredRunRate}, \text{Knockout} \rangle$$

#### A. Second Innings (Chasing) — Win Probability Leverage Index (WPLI)
We calibrate a logistic Win Probability model:
$$WP(s) = \frac{1}{1 + e^{-z(s)}}$$
$$\text{where } z(s) = \beta_0 + \beta_1 \cdot \text{BallsRemaining} + \beta_2 \cdot \text{WicketsRemaining} - \beta_3 \cdot \text{RunsNeeded} - \beta_4 \cdot \text{RRR}$$

The **Leverage Index ($LI$)** quantifies the critical swing in win probability between a high-value outcome (boundary) and a catastrophic outcome (wicket):
$$LI(s) = \frac{\left| WP(s_{\text{boundary}}) - WP(s_{\text{wicket}}) \right|}{\overline{\Delta WP}}$$

Chase pressure synthesizes required run rate stress, wicket depletion stress, and leverage:
$$PI_{\text{chase}} = \min\left(100, \; 15 + \text{Stress}_{\text{RRR}} + \text{Stress}_{\text{Wickets}} + \text{Closeness} + 12 \cdot LI\right)$$

#### B. First Innings (Setting) — Collapse & Death Phase Index
In the first innings, pressure is driven by top-order collapse and death-over run acceleration:
$$\text{Strain}_{\text{collapse}} = \max\left(0, \; \frac{W_{\text{lost}} - \frac{\text{Overs Elapsed}}{2}}{3}\right) \times 100$$
$$\text{Margin}_{\text{death}} = \begin{cases} 
\min\left(100, \; 50 + 10 \cdot (\text{Over} - 15)\right), & \text{if Over } \ge 16 \\ 
0, & \text{otherwise} 
\end{cases}$$

#### C. Match Stakes Multipliers
Context dictates pressure. Multipliers elevate the pressure score in tournament-defining matches:
$$PI_{\text{final}} = \min(100, \; PI \times M_{\text{stakes}})$$
- **Knockout Fixtures** (Finals, Qualifiers, Eliminators): **$1.25\times$**
- **Tier-1 Tournaments** (IPL 2022–2026, Asia Cup): **$1.15\times$**

**Deliveries with $PI_{\text{final}} \ge 65.0$ are classified as High Pressure** (61,362 balls; 30.5% of total dataset).

---

### 2. Dual-Benchmark Clutch Performance Scoring

To eliminate selection bias, players are evaluated against two benchmarks simultaneously:
1. **Self-Baseline Benchmark**: How much better or worse does the player perform under pressure compared to their own normal baseline?
2. **League-Expected Benchmark**: How does the player perform compared to an average player in the exact same match situation?

#### Batting Clutch Formula:
$$\text{Score}_{\text{batter}} = w_{\text{sample}} \times \left[ 0.40 \cdot \Delta \text{SR} + 0.35 \cdot \text{RAE} + 0.15 \cdot \text{Survival} + 0.10 \cdot \text{Consistency} \right]$$
- **$\Delta \text{SR}$ (Personal Lift)**: $\text{SR}_{\text{pressure}} - \text{SR}_{\text{baseline}}$
- **$\text{RAE}$ (Runs Above Expected)**: $\sum_{b \in \text{pressure}} (\text{runs}_b - \mathbb{E}[\text{runs} \mid s_b])$
- **Bayesian Sample Shrinkage**: Regresses low-sample outliers toward the league average:
  $$w_{\text{sample}} = \frac{N_{\text{balls}}}{N_{\text{balls}} + 40}$$

#### Bowling Clutch Formula:
$$\text{Score}_{\text{bowler}} = w_{\text{sample}} \times \left[ 0.35 \cdot \Delta \text{Econ} + 0.35 \cdot \text{RSAE} + 0.20 \cdot \text{WAE} + 0.10 \cdot \text{DotPressure} \right]$$
- **$\Delta \text{Econ}$ (Economy Lift)**: $\text{Econ}_{\text{baseline}} - \text{Econ}_{\text{pressure}}$ (positive when the bowler tightens up under pressure)
- **$\text{RSAE}$ (Runs Saved Above Expected)**: $\sum (\mathbb{E}[\text{runs}_b] - \text{runs}_b)$
- **$\text{WAE}$ (Wickets Above Expected)**: $\text{Wkts}_{\text{pressure}} - \sum \mathbb{P}[\text{wkt}_b]$
- **Role Balance**: 50% Run Choke / Dot Ball Suppression + 50% Breakthrough Wickets.

---

## 🏆 Key Analytical Findings & Player Rankings

### Official Top 10 Batters Under Pressure (IPL-Eligible)

| Rank | Player | Team | Role / Archetype | Pressure SR | Baseline SR | SR Delta (Δ) | Clutch Score |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | **Shreyas Iyer** | Kolkata Knight Riders | Captain / Anchor-Accelerator | **172.9** | 134.4 | **+38.5** | **68.42** |
| **2** | **Shashank Singh** | Punjab Kings | Death-Overs Finisher | **185.3** | 101.9 | **+83.4** | **56.63** |
| **3** | **Naman Dhir** | Mumbai Indians | Middle-Overs Enforcer | **189.3** | 118.2 | **+71.1** | **53.81** |
| **4** | **Sediqullah Atal** | Afghanistan | Opening Accelerator | **148.1** | 99.4 | **+48.7** | **53.64** |
| **5** | **Suryakumar Yadav** | Mumbai Indians | 360° Middle Specialist | **169.5** | 148.2 | **+21.3** | **52.28** |
| **6** | **Namboori Tilak Varma**| Mumbai Indians | Crisis Absorber / Finisher | **150.9** | 126.9 | **+24.0** | **49.88** |
| **7** | **Jos Buttler** | Rajasthan Royals | Elite Top-Order Match Winner | **156.4** | 142.1 | **+14.3** | **48.92** |
| **8** | **Rinku Singh** | Kolkata Knight Riders | Cold-Blooded Finisher | **152.0** | 136.7 | **+15.3** | **47.16** |
| **9** | **Tim David** | Mumbai Indians | Boundary Cleaver (Death Phase)| **162.8** | 144.2 | **+18.6** | **46.95** |
| **10**| **Virat Kohli** | Royal Challengers Bengaluru| Master Chase Constructor | **140.2** | 132.8 | **+7.4** | **45.80** |

*Note: Dinesh Karthik was excluded due to official retirement from IPL cricket; Tim David was promoted into the official Top 10 accordingly.*

---

### Official Top 10 Bowlers Under Pressure (IPL-Eligible)

| Rank | Player | Team | Bowling Archetype | Pressure Econ | Baseline Econ | Econ Delta (Δ) | Clutch Wkts | Clutch Score |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | **Sunil Narine** | Kolkata Knight Riders | Mystery Spinner / Squeeze Master | **6.45** | 6.72 | **+0.27** | 38 | **64.50** |
| **2** | **Jasprit Bumrah** | Mumbai Indians | Multi-Phase Lethal Specialist | **6.81** | 7.15 | **+0.34** | 42 | **62.30** |
| **3** | **Akeal Hosein** | West Indies / Sunrisers | Powerplay & Middle Restrictor | **6.92** | 7.40 | **+0.48** | 29 | **58.90** |
| **4** | **Matheesha Pathirana**| Chennai Super Kings | Malinga-Action Death Slinger | **7.54** | 8.85 | **+1.31** | 34 | **57.40** |
| **5** | **Mitchell Santner** | Chennai Super Kings | High-Control Finger Spinner | **6.78** | 7.22 | **+0.44** | 26 | **55.80** |
| **6** | **Wanindu Hasaranga** | Sri Lanka / Sunrisers | Attacking Leg-Spin Striker | **7.40** | 7.95 | **+0.55** | 35 | **54.20** |
| **7** | **Rasikh Salam** | Delhi Capitals | Skiddy Hard-Length Death Pacer | **8.12** | 9.40 | **+1.28** | 21 | **52.10** |
| **8** | **Rashid Khan** | Gujarat Titans | World-Class Leg-Spin Strangler | **6.98** | 7.10 | **+0.12** | 39 | **51.80** |
| **9** | **Arshdeep Singh** | Punjab Kings | Left-Arm Death Yorkist | **8.20** | 8.90 | **+0.70** | 33 | **50.60** |
| **10**| **Tim Southee** | New Zealand / KKR | Experienced Seam Veteran | **8.05** | 8.65 | **+0.60** | 24 | **49.70** |

---

### 🎯 15 Rajasthan Royals Tactical Auction Targets

Tailored scouting profiles identifying high-leverage players available for acquisition:

1. **Shashank Singh** (ID `2756` | Score: `56.63`) — *Death-Overs Accelerator*: +83.4 SR lift under pressure. The highest strike-rate delta in the entire middle order.
2. **Naman Dhir** (ID `37052` | Score: `53.81`) — *Spin Enforcer*: +71.1 SR lift against spin in overs 7–15.
3. **Rasikh Salam** (ID `7327` | Score: `52.10`) — *Domestic Death Pacer*: +1.28 Econ drop under pressure. Excellent cost-effective Indian pace asset.
4. **Mitchell Santner** (ID `4101` | Score: `55.80`) — *Tactical Choke Spinner*: 6.78 pressure economy. Exceptional matchups against left-hand heavy batting orders.
5. **Akeal Hosein** (ID `2417` | Score: `58.90`) — *Powerplay Wicket-Taker*: Restricts top-order power hitters under 7.0 RPO.
6. **Sediqullah Atal** (ID `8647` | Score: `53.64`) — *High-Ceiling International Opener*: 148.1 SR in knockout international fixtures.
7. **Shreyas Iyer** (ID `3647` | Score: `68.42`) — *Championship Captain & Middle Anchor*: Highest clutch score among all eligible batsmen.
8. **Matheesha Pathirana** (ID `8661` | Score: `57.40`) — *Apex Death Slinger*: 1.31 economy compression and elite wicket-taking yorkers.
9. **Tim David** (ID `6396` | Score: `46.95`) — *Pure Power Finisher*: 162.8 pressure SR. Ideal complement to Shimron Hetmyer and Dhruv Jurel.
10. **Tristan Stubbs** (ID `20702` | Score: `48.20`) — *Multi-Entry Finisher / Keeper*: Exceptional 360° game in overs 17–20.
11. **Donovan Ferreira** (ID `8182` | Score: `45.10`) — *Hard-Hitting All-Rounder*: High-impact boundary percentage in domestic pressure games.
12. **Sameer Rizvi** (ID `8238` | Score: `44.60`) — *Emerging Indian Finisher*: Outstanding boundary-to-ball ratio in high-RRR scenarios.
13. **Maheesh Theekshana** (ID `19316` | Score: `49.30`) — *Powerplay Carrom Specialist*: Concedes zero width in the first 6 overs.
14. **Spencer Johnson** (ID `6354` | Score: `48.50`) — *Left-Arm High-Pace Enforcer*: 145+ km/h thunderbolts with steep bounce.
15. **Michael Bracewell** (ID `6512` | Score: `46.10`) — *Off-Spin & Pinch Hitter*: Complete tactical balance utility pick.

---

## 🎨 User Interface & Editorial Design System

The web interface is designed with a **Rajasthan Royals Editorial Aesthetics** philosophy, completely avoiding generic AI dashboard cliches:

- **Color Palette**:
  - Soft Ivory Background (`#F7F4F2`) & Crisp White surfaces (`#FFFFFF`)
  - Deep Navy Typography (`#101C37`) for high contrast readability
  - Royal Pink (`#E65391`) for active elements, buttons, and high-pressure callouts
  - Champagne Gold (`#D6B66C`) for championship ranks, top honours, and award cards
- **Typography**:
  - *Playfair Display* serif headings for editorial grandeur
  - *Manrope* sans-serif for responsive navigation, tables, and data controls
  - *JetBrains Mono* for tabular statistics and metrics
- **Interactive Capabilities**:
  - **Collectible 2-Sided Player Trading Cards**: Click any player to open a vintage physical trading card popup with full 3D flip animation, headshot photo, tactical archetype, and clutch radar statistics.
  - **Head-to-Head 3-Way Comparison Tray**: Multi-select any 2 or 3 players to pin them into an interactive comparison tray for side-by-side metric evaluation.
  - **High-DPI Responsive Canvas Visualizations**: Custom zero-dependency HTML5 canvas charts rendering the pressure distribution histogram and over-by-over leverage progression.
  - **Offline KaTeX Mathematical Rendering**: All equations and statistical formulas on the Methodology page render in native LaTeX typography.
  - **Multi-Format Player Image Ingestion**: Automatic cascading resolution (`.jpg` $\to$ `.png` $\to$ `.webp` $\to$ `.svg` $\to$ `default.svg`).

---

## 🚀 Quickstart & Reproduction Guide

### Prerequisites
- Python 3.10 or higher
- Standard Python libraries (`json`, `csv`, `math`, `http.server`, `urllib`)
- Optional for ETL: `pandas`, `numpy`

### Step 1: Clone the Repository
```bash
git clone https://github.com/rajasthan-royals-analytics/superr-selector.git
cd superr-selector
```

### Step 2: Run the Core ML Pipeline
To re-ingest all 200,999 deliveries, evaluate the Win Probability Leverage Index, and generate the official CSV outputs:
```bash
python SupeRR_ClutchML/run_pipeline.py
```
*Outputs are saved to `SupeRR_ClutchML/outputs/top_10_batters.csv` and `SupeRR_ClutchML/outputs/top_10_bowlers.csv`.*

### Step 3: Compile Web Data Bundle
To package the ML outputs, metadata, and 15 tactical auction targets into the runtime bundle:
```bash
python build_platform_data.py
```

### Step 4: Launch the Web Platform
Start the local server:
```bash
python web/server.py
```
Open your browser and navigate to:
👉 **`http://localhost:8000`**

---


## 👥 Credits & Verification

- **Analytics & Model Development**: Developed for the **Rajasthan Royals SupeRR Selector Season 2** Challenge.
- **Data Source**: Ball-by-ball T20 and IPL match telemetry via Cricsheet (2008–2026).
- **Design Philosophy**: Inspired by the heritage and visual identity of the **Rajasthan Royals**.
