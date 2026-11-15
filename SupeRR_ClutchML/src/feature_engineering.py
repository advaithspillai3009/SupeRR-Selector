"""
Feature Engineering Module for SupeRR-ClutchML
Constructs match state variables, computes the Hybrid Pressure Index,
and applies stakes multipliers for Knockout & Tier-1 matches.
"""

from .config import PRESSURE_THRESHOLD, KNOCKOUT_MULTIPLIER, TIER1_COMPETITION_MULTIPLIER
from .ml_models import WinProbabilityLeverageEngine

wp_engine = WinProbabilityLeverageEngine()

def compute_ball_pressure(b, inn, inn_score, inn_wickets, inn_legal_balls, target, match_info, comp_info):
    """
    Computes delivery-level state and the final Hybrid Pressure Index (PI).
    Returns (pi_final, is_high_pressure, leverage_idx)
    """
    # Stakes multipliers
    is_knockout = match_info.get('knock_out', '0') == '1' or any(
        s in match_info.get('stage', '').lower() for s in ['final', 'eliminator', 'qualifier', 'semi']
    )
    comp_name = comp_info.get('comp_name', '').lower()
    is_tier1 = ('ipl' in comp_name) or ('asia cup' in comp_name)

    stake_mult = 1.0
    if is_knockout:
        stake_mult *= KNOCKOUT_MULTIPLIER
    if is_tier1:
        stake_mult *= TIER1_COMPETITION_MULTIPLIER

    pi = 0.0
    leverage = 1.0

    if inn in ('3', '4'):
        # Super Overs: Extreme pressure
        pi = 100.0
        leverage = 3.5

    elif inn == '1':
        # First Innings Context: Collapse Stress & Death Phase
        overs_elapsed = inn_legal_balls / 6.0
        
        # Collapse stress
        strain_collapse = 0.0
        if overs_elapsed <= 6.0 and inn_wickets >= 2:
            strain_collapse = min(100.0, ((inn_wickets - (overs_elapsed / 3.0)) / 2.5) * 80.0)
        elif overs_elapsed <= 10.0 and inn_wickets >= 4:
            strain_collapse = min(100.0, ((inn_wickets - (overs_elapsed / 3.0)) / 2.5) * 85.0)

        # Death overs margin (overs 16 to 20)
        death_scale = 0.0
        if overs_elapsed >= 15.0:
            death_scale = 50.0 + (overs_elapsed - 15.0) * 8.0
            if inn_wickets >= 6:
                death_scale += 10.0
        elif overs_elapsed >= 10.0 and inn_wickets >= 5:
            death_scale = 40.0

        pi = max(strain_collapse, death_scale, 20.0)
        leverage = 1.0 + (pi / 100.0)

    elif inn == '2':
        # Second Innings: Win Probability Leverage & Required Run Rate Stress
        legal_balls_bowled = min(120, inn_legal_balls)
        balls_remaining = max(1, 120 - legal_balls_bowled)
        runs_needed = max(0, target - inn_score)
        wickets_in_hand = max(0, 10 - min(10, inn_wickets))

        rrr = (runs_needed * 6.0) / balls_remaining
        leverage = wp_engine.compute_leverage_index(runs_needed, balls_remaining, wickets_in_hand)

        rrr_stress = max(0.0, (rrr - 7.5) * 7.5)
        wkt_stress = max(0.0, (6 - wickets_in_hand) * 10.0) if wickets_in_hand <= 5 else 0.0
        
        closeness = 0.0
        if balls_remaining <= 36 and runs_needed <= 70:
            closeness = 30.0 + (36 - balls_remaining) * 0.8
        elif balls_remaining <= 60 and runs_needed <= 110:
            closeness = 20.0

        # WPLI formula combining leverage, RRR, and resource exhaustion
        pi = min(100.0, 15.0 + rrr_stress + wkt_stress + closeness + (leverage * 12.0))

    pi_final = min(100.0, pi * stake_mult)
    is_high_pressure = (pi_final >= PRESSURE_THRESHOLD)

    return pi_final, is_high_pressure, leverage
