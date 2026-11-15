"""
Scoring and Ranking Engine for SupeRR-ClutchML
Applies Dual Benchmarking, Bayesian Shrinkage, Consistency Penalties,
and Role-Balanced Selection for IPL-eligible players.
"""

import math
from collections import defaultdict
from .config import (
    MIN_PRESSURE_BALLS_BATTER, MIN_PRESSURE_BALLS_BOWLER, MIN_BASELINE_BALLS,
    BATTER_WEIGHTS, BOWLER_WEIGHTS
)

def evaluate_batters(batter_stats, player_avg_pos, excluded_player_ids, ipl_only_ids=None):
    candidates = []

    for pid, s in batter_stats.items():
        if pid in excluded_player_ids:
            continue
        if ipl_only_ids is not None and pid not in ipl_only_ids:
            continue

        p_balls = s['p_balls']
        b_balls = s['b_balls']

        if p_balls < MIN_PRESSURE_BALLS_BATTER or b_balls < MIN_BASELINE_BALLS:
            continue

        name = s['name']
        avg_pos, role = player_avg_pos.get(pid, (4.0, "Middle Order (4-5)"))

        p_runs = s['p_runs']
        p_outs = s['p_outs']
        b_runs = s['b_runs']
        b_outs = s['b_outs']

        # Batting Metrics under Pressure
        p_sr = (p_runs / p_balls) * 100.0
        p_avg = p_runs / max(1, p_outs)
        p_bound_pct = ((s['p_4s'] + s['p_6s']) / p_balls) * 100.0
        p_dot_pct = (s['p_dots'] / p_balls) * 100.0

        # Baseline Metrics
        b_sr = (b_runs / b_balls) * 100.0
        b_avg = b_runs / max(1, b_outs)

        # Personal Delta
        delta_sr = p_sr - b_sr

        # Situational Value Added: Runs Above Expected (RAE)
        rae = p_runs - s['expected_runs_p']
        rae_per_ball = rae / p_balls

        # High Penalty for dismissals (Survival weighting)
        survival_factor = math.log(max(1.0, p_avg) + 5.0) / math.log(35.0)

        # Consistency across matches
        match_scores = []
        for mid, m_balls in s['match_p_balls'].items():
            if m_balls >= 6:
                m_runs = s['match_p_runs'][mid]
                match_scores.append((m_runs / m_balls) * 100.0)

        if len(match_scores) >= 5:
            mean_m = sum(match_scores) / len(match_scores)
            var_m = sum((x - mean_m) ** 2 for x in match_scores) / len(match_scores)
            std_m = math.sqrt(var_m)
            consistency = max(0.6, min(1.0, 1.0 - (std_m / (mean_m + 50.0))))
        else:
            consistency = 0.8

        # Bayesian shrinkage factor
        k_b = BATTER_WEIGHTS['shrinkage_k']
        sample_weight = p_balls / (p_balls + k_b)

        base_score = (
            BATTER_WEIGHTS['sr_scale'] * (p_sr / 1.5) +
            BATTER_WEIGHTS['delta_sr'] * delta_sr +
            BATTER_WEIGHTS['rae_per_ball'] * (rae_per_ball * 100.0) +
            BATTER_WEIGHTS['avg_scale'] * (p_avg * 1.5)
        ) * survival_factor

        final_clutch_score = base_score * consistency * sample_weight

        candidates.append({
            'player_id': pid, 'player_name': name, 'role': role, 'avg_pos': avg_pos,
            'p_balls': p_balls, 'p_runs': p_runs, 'p_outs': p_outs,
            'p_sr': p_sr, 'b_sr': b_sr, 'delta_sr': delta_sr,
            'p_avg': p_avg, 'b_avg': b_avg,
            'p_bound_pct': p_bound_pct, 'p_dot_pct': p_dot_pct,
            'rae': rae, 'consistency': consistency,
            'clutch_score': final_clutch_score
        })

    candidates.sort(key=lambda x: x['clutch_score'], reverse=True)
    return candidates


def evaluate_bowlers(bowler_stats, excluded_player_ids, ipl_only_ids=None):
    candidates = []

    for pid, bw in bowler_stats.items():
        if pid in excluded_player_ids:
            continue
        if ipl_only_ids is not None and pid not in ipl_only_ids:
            continue

        p_balls = bw['p_balls']
        b_balls = bw['b_balls']

        if p_balls < MIN_PRESSURE_BALLS_BOWLER or b_balls < MIN_BASELINE_BALLS:
            continue

        name = bw['name']
        p_runs = bw['p_runs']
        p_wkts = bw['p_wkts']
        b_runs = bw['b_runs']
        b_wkts = bw['b_wkts']

        # Bowling Metrics under Pressure
        p_econ = (p_runs / (p_balls / 6.0))
        p_sr = p_balls / max(1, p_wkts)
        p_dot_pct = (bw['p_dots'] / p_balls) * 100.0
        p_bound_pct = (bw['p_bounds'] / p_balls) * 100.0

        # Baseline Metrics
        b_econ = (b_runs / (b_balls / 6.0))
        b_sr = b_balls / max(1, b_wkts)

        # Personal Delta (positive indicates tighter bowling under pressure)
        delta_econ = b_econ - p_econ

        # Situational Value Added: Runs Saved & Wickets Above Expected
        rsae = bw['expected_runs_p'] - p_runs
        rsae_per_over = (rsae / p_balls) * 6.0
        wae = p_wkts - bw['expected_wkts_p']

        # Consistency across matches
        match_econs = []
        for mid, m_balls in bw['match_p_balls'].items():
            if m_balls >= 6:
                m_r = bw['match_p_runs'][mid]
                match_econs.append(m_r / (m_balls / 6.0))

        if len(match_econs) >= 5:
            mean_e = sum(match_econs) / len(match_econs)
            var_e = sum((x - mean_e) ** 2 for x in match_econs) / len(match_econs)
            std_e = math.sqrt(var_e)
            consistency = max(0.6, min(1.0, 1.0 - (std_e / (mean_e + 8.0))))
        else:
            consistency = 0.8

        # Bayesian shrinkage factor
        k_bw = BOWLER_WEIGHTS['shrinkage_k']
        sample_weight = p_balls / (p_balls + k_bw)

        # Balanced 50% Run Prevention & 50% Breakthrough Wickets:
        # Run Prevention: Economy containment + Runs Saved Above Expected + Dot Ball %
        run_prevention_score = (
            0.35 * max(0.0, 11.5 - p_econ) * 8.0 +
            0.35 * (rsae_per_over * 10.0) +
            0.30 * p_dot_pct
        )

        # Breakthrough Wickets: Wicket Strike Rate + WAE + Raw Wickets volume
        wkt_strike_val = (100.0 / max(6.0, p_sr)) * 3.5
        wkt_score = (
            0.50 * wkt_strike_val +
            0.30 * max(0.0, 25.0 - p_sr) * 2.0 +
            0.20 * min(20.0, p_wkts * 0.4)
        )

        base_score = 0.50 * run_prevention_score + 0.50 * wkt_score
        final_clutch_score = base_score * consistency * sample_weight

        candidates.append({
            'player_id': pid, 'player_name': name,
            'p_balls': p_balls, 'p_runs': p_runs, 'p_wkts': p_wkts,
            'p_econ': p_econ, 'b_econ': b_econ, 'delta_econ': delta_econ,
            'p_sr': p_sr, 'b_sr': b_sr,
            'p_dot_pct': p_dot_pct, 'p_bound_pct': p_bound_pct,
            'rsae': rsae, 'wae': wae, 'consistency': consistency,
            'clutch_score': final_clutch_score
        })

    candidates.sort(key=lambda x: x['clutch_score'], reverse=True)
    return candidates


def select_role_balanced_batters(candidates, top_n=10):
    """
    Selects a balanced team composition across batting phases:
    3 Top Order (1-3), 4 Middle Order (4-5), 3 Lower Order / Finishers (6+),
    then orders all 10 by Clutch Score.
    """
    by_role = defaultdict(list)
    for c in candidates:
        by_role[c['role']].append(c)

    selected = []
    selected.extend(by_role["Top Order (1-3)"][:3])
    selected.extend(by_role["Middle Order (4-5)"][:4])
    selected.extend(by_role["Lower Order / Finisher (6+)"][:3])

    selected.sort(key=lambda x: x['clutch_score'], reverse=True)
    for rank, p in enumerate(selected, 1):
        p['rank'] = rank

    return selected
