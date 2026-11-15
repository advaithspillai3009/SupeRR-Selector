# SupeRR-ClutchML: T20 Pressure & Clutch Analytics Engine

**SupeRR-ClutchML** is an end-to-end, machine-learning-driven sports analytics framework built to quantify, evaluate, and rank cricket players who consistently deliver under **high-pressure match situations** relative to their normal performance baselines.

Engineered specifically for the **Rajasthan Royals – SupeRR Selector Season 2** competition.

---

## 1. Project Architecture

```
SupeRR_ClutchML/
│
├── README.md                          # Comprehensive project documentation & math formulation
├── run_pipeline.py                    # End-to-end CLI execution runner
│
├── src/
│   ├── __init__.py
│   ├── config.py                      # Model hyperparameters, thresholds, and weights
│   ├── data_loader.py                 # Data ingestion, schema validation, and nationality filtering
│   ├── ml_models.py                   # Expectancy ML model & Win Probability Leverage Engine
│   ├── feature_engineering.py         # State-space dynamic pressure index (PI) generator
│   └── scoring_engine.py              # Dual Benchmarking, Bayesian shrinkage & role selector
│
└── outputs/
    ├── top_10_batters.csv             # Official ranked Top 10 Batters (IPL-eligible)
    └── top_10_bowlers.csv             # Official ranked Top 10 Bowlers (IPL-eligible)
```

---

## 2. Mathematical Methodology & ML Models

### A. Dynamic Ball-Level Pressure Index ($PI \in [0, 100]$)

#### 1. Second Innings (Chasing) — Win Probability Leverage Index (WPLI)
We deploy a logistic regression Win Probability engine:
$$WP(s) = \frac{1}{1 + e^{-z(s)}}$$
where $z(s) = \beta_0 + \beta_1 \cdot \text{BallsRemaining} + \beta_2 \cdot \text{WicketsRemaining} - \beta_3 \cdot \text{RunsNeeded} - \beta_4 \cdot \text{RRR}$.

The Leverage Index ($LI$) measures the potential win-probability swing between a boundary and a wicket:
$$LI(s) = \frac{|WP(s_{\text{boundary}}) - WP(s_{\text{wicket}})|}{\overline{\Delta WP}}$$
The chase pressure combines:
$$PI_{\text{chase}} = \min\left(100, \; 15 + \text{Stress}_{\text{RRR}} + \text{Stress}_{\text{Wickets}} + \text{Closeness} + 12 \cdot LI\right)$$

#### 2. First Innings (Setting) — Collapse & Death Phase Index
Without a chase target, pressure stems from:
- **Top-Order Collapse Strain**:
  $$\text{Strain}_{\text{collapse}} = \max\left(0, \; \frac{W_{\text{lost}} - \text{Overs Elapsed}/2}{3}\right) \times 100$$
- **Death-Over Margin (Overs 16–20)**: Deliveries where boundary hitting is demanded while conserving remaining wickets.

#### 3. Match Stakes Multipliers
$$PI_{\text{final}} = \min(100, \; PI \times M_{\text{stakes}})$$
- **Knockout Match** (`knock_out == 1`, Finals, Qualifiers, Eliminators): **$1.25\times$**
- **Tier-1 Competitions** (IPL 2022–2026 & Asia Cups): **$1.15\times$**

Deliveries with $PI_{\text{final}} \ge 65.0$ (top ~30% of all deliveries) are classified as **High Pressure**, while the remainder form the player's **Baseline**.

---

### B. Dual-Benchmark Scoring Metric

#### 1. Batting Clutch Score
- **Personal Lift**: $\Delta \text{SR} = \text{SR}_{\text{pressure}} - \text{SR}_{\text{baseline}}$
- **Situational Value Added (Runs Above Expected - RAE)**:
  $$\text{RAE} = \sum_{b \in \text{pressure}} (\text{runs}_b - \mathbb{E}[\text{runs} \mid \text{state}_b])$$
- **Dismissal Survival Penalty**: High penalty for losing wickets under pressure via logarithmic survival scaling.
- **Bayesian Sample Shrinkage**: Regresses low-sample outliers toward the league mean:
  $$w_{\text{sample}} = \frac{N_{\text{balls}}}{N_{\text{balls}} + 40}$$
- **Cross-Match Consistency**: Penalizes high match-to-match variance.

#### 2. Bowling Clutch Score
- **Personal Lift**: $\Delta \text{Econ} = \text{Econ}_{\text{baseline}} - \text{Econ}_{\text{pressure}}$
- **Situational Value Added**:
  - **Runs Saved Above Expected (RSAE)**: $\sum (\mathbb{E}[\text{runs}_b] - \text{runs}_b)$
  - **Wickets Above Expected (WAE)**: $\text{Wickets}_{\text{pressure}} - \sum \mathbb{P}[\text{wkt}_b]$
- **Balanced Run Choke & Strike Rate**: 50% Run Prevention & Dot Ball Choke + 50% Breakthrough Wickets.

---

## 3. How to Run

From the root project directory:
```bash
python SupeRR_ClutchML/run_pipeline.py
```

The pipeline automatically:
1. Ingests all 200,999 deliveries across 867 matches.
2. Filters out IPL-ineligible nationalities (Pakistan and Bangladesh).
3. Executes the ML Expectancy Engine and computes the Leverage Index.
4. Generates the Role-Balanced Top 10 Batters and Top 10 Bowlers.
5. Saves CSV ranking artifacts to `SupeRR_ClutchML/outputs/`.
