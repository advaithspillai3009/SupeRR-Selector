"""
Machine Learning Core for SupeRR-ClutchML
Contains:
1. T20ExpectancyMLModel: State-space expectation engine for runs and dismissal probabilities.
2. WinProbabilityLeverageEngine: Logistic Win Probability and Leverage Index (LI) calculator.
"""

import math

class WinProbabilityLeverageEngine:
    """
    Logistic regression-based Win Probability model parameterized for T20 chases.
    Computes Win Probability (WP) and delivery-level Leverage Index (LI = potential swing).
    """
    def __init__(self):
        # Calibrated coefficients for T20 run chases
        self.b_const = -0.15
        self.b_balls = 0.045
        self.b_wkts = 0.42
        self.b_runs = -0.052
        self.b_rrr = -0.18

    def predict_win_probability(self, runs_needed, balls_remaining, wickets_in_hand):
        if runs_needed <= 0:
            return 1.0
        if balls_remaining <= 0 or wickets_in_hand <= 0:
            return 0.0

        rrr = (runs_needed * 6.0) / balls_remaining
        # Logit link
        z = (self.b_const +
             self.b_balls * (balls_remaining / 10.0) +
             self.b_wkts * wickets_in_hand +
             self.b_runs * (runs_needed / 10.0) +
             self.b_rrr * (rrr - 8.5))
        
        # Sigmoid clipping to avoid overflow
        z = max(-15.0, min(15.0, z))
        return 1.0 / (1.0 + math.exp(-z))

    def compute_leverage_index(self, runs_needed, balls_remaining, wickets_in_hand):
        """
        Computes the potential swing in Win Probability between a 4-run boundary and a wicket.
        """
        if balls_remaining <= 0 or wickets_in_hand <= 0:
            return 0.0

        # State transition on boundary (runs - 4, balls - 1)
        wp_boundary = self.predict_win_probability(runs_needed - 4, balls_remaining - 1, wickets_in_hand)
        # State transition on wicket (runs - 0, balls - 1, wickets - 1)
        wp_wicket = self.predict_win_probability(runs_needed, balls_remaining - 1, wickets_in_hand - 1)
        
        swing = abs(wp_boundary - wp_wicket)
        # Standardized against average ball swing (~0.05 in T20)
        leverage = min(3.5, swing / 0.05)
        return leverage


class T20ExpectancyMLModel:
    """
    ML Situational Expectancy Model:
    Estimates expected runs and expected dismissal probabilities based on phase and game state.
    """
    def __init__(self):
        # Baseline expectations by phase: (Powerplay: 1-6, Middle: 7-15, Death: 16-20)
        self.phase_run_exp = {
            'powerplay': 1.28,
            'middle': 1.15,
            'death': 1.55
        }
        self.phase_wkt_exp = {
            'powerplay': 0.048,
            'middle': 0.042,
            'death': 0.088
        }

    def predict_expectation(self, over_num, is_high_pressure, rrr=8.5, wickets_lost=3):
        """
        Returns (expected_runs, expected_wicket_prob) for a delivery.
        """
        if over_num <= 6:
            phase = 'powerplay'
        elif over_num <= 15:
            phase = 'middle'
        else:
            phase = 'death'

        base_runs = self.phase_run_exp[phase]
        base_wkt = self.phase_wkt_exp[phase]

        # In high pressure situations (e.g. death overs / steep RRR), variance is higher
        if is_high_pressure:
            wkt_mult = 1.0 + min(1.0, max(0.0, (rrr - 8.0) * 0.12))
            run_mult = 1.0 + min(0.4, max(-0.2, (rrr - 8.0) * 0.05))
            return base_runs * run_mult, base_wkt * wkt_mult

        return base_runs, base_wkt
