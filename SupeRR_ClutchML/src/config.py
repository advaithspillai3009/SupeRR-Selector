"""
SupeRR-ClutchML Configuration Module
Stores model hyperparameters, eligibility criteria, and data paths.
"""

import os

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "Data Pack")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

# Eligibility & Thresholds
MIN_PRESSURE_BALLS_BATTER = 75
MIN_PRESSURE_BALLS_BOWLER = 100
MIN_BASELINE_BALLS = 75

# Pressure Index Calibration
PRESSURE_THRESHOLD = 65.0  # PI >= 65 is classified as High Pressure (Top ~25% balls)
KNOCKOUT_MULTIPLIER = 1.25
TIER1_COMPETITION_MULTIPLIER = 1.15  # IPL & Asia Cup tournaments

# Excluded Nationalities (IPL ineligible)
EXCLUDED_TEAMS = {'Pakistan', 'Pakistan A', 'Bangladesh', 'Bangladesh A'}

# Model Weights
BATTER_WEIGHTS = {
    'sr_scale': 0.35,
    'delta_sr': 0.25,
    'rae_per_ball': 0.20,
    'avg_scale': 0.20,
    'shrinkage_k': 40.0
}

BOWLER_WEIGHTS = {
    'run_prevention_weight': 0.50,
    'wicket_taking_weight': 0.50,
    'shrinkage_k': 50.0
}
