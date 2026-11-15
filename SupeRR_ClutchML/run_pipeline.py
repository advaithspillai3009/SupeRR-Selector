"""
SupeRR-ClutchML Pipeline Runner
Executes the complete data-driven machine learning analysis and exports rankings.
"""

import os
import sys
import csv
from collections import defaultdict

# Reconfigure stdout for utf-8 display
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from src.config import OUTPUT_DIR, DATA_DIR
from src.data_loader import load_all_data
from src.feature_engineering import compute_ball_pressure
from src.ml_models import T20ExpectancyMLModel
from src.scoring_engine import evaluate_batters, evaluate_bowlers, select_role_balanced_batters

def main():
    print("=" * 70)
    print("        SupeRR-ClutchML: T20 Pressure & Clutch Analytics Model")
    print("=" * 70)

    # 1. Load Data
    print("\n[1/5] Ingesting match datasets and establishing player mappings...")
    competitions, matches, deliveries_by_match, player_avg_pos, excluded_player_ids = load_all_data()
    print(f"      Total matches loaded: {len(deliveries_by_match):,}")
    print(f"      Excluded IPL-ineligible players: {len(excluded_player_ids):,}")

    # Identify confirmed IPL tournament players
    ipl_comp_ids = {cid for cid, c in competitions.items() if 'ipl' in c['comp_name'].lower()}
    ipl_match_ids = {mid for mid, m in matches.items() if m.get('comp_id') in ipl_comp_ids}
    ipl_players = set()
    with open(os.path.join(DATA_DIR, "playing_eleven.csv"), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            if r['match_id'] in ipl_match_ids:
                ipl_players.add(r['player_id'])
    print(f"      Verified IPL players in dataset: {len(ipl_players):,}")

    # 2. Compute 1st innings match totals
    inn1_totals = defaultdict(int)
    for match_id, balls in deliveries_by_match.items():
        for r in balls:
            if r['innings'] == '1':
                runs = int(r['runs']) if r['runs'] else 0
                e1 = int(r['extras1_runs']) if r['extras1_runs'] else 0
                e2 = int(r['extras_2_runs']) if r['extras_2_runs'] else 0
                inn1_totals[match_id] += (runs + e1 + e2)

    # 3. Initialize ML Expectancy Model & Player Stats
    print("\n[2/5] Initializing ML Expectancy Engine and extracting ball features...")
    exp_model = T20ExpectancyMLModel()

    batter_stats = defaultdict(lambda: {
        'name': '',
        'p_balls': 0, 'p_runs': 0, 'p_outs': 0, 'p_4s': 0, 'p_6s': 0, 'p_dots': 0,
        'b_balls': 0, 'b_runs': 0, 'b_outs': 0, 'b_4s': 0, 'b_6s': 0, 'b_dots': 0,
        'match_p_balls': defaultdict(int), 'match_p_runs': defaultdict(int),
        'expected_runs_p': 0.0, 'expected_runs_b': 0.0
    })

    bowler_stats = defaultdict(lambda: {
        'name': '',
        'p_balls': 0, 'p_runs': 0, 'p_wkts': 0, 'p_dots': 0, 'p_bounds': 0,
        'b_balls': 0, 'b_runs': 0, 'b_wkts': 0, 'b_dots': 0, 'b_bounds': 0,
        'match_p_balls': defaultdict(int), 'match_p_runs': defaultdict(int), 'match_p_wkts': defaultdict(int),
        'expected_runs_p': 0.0, 'expected_wkts_p': 0.0
    })

    total_deliveries = 0
    hp_deliveries = 0

    for match_id, balls in deliveries_by_match.items():
        match_info = matches.get(match_id, {})
        comp_info = competitions.get(match_info.get('comp_id', ''), {})

        current_innings = None
        inn_score = 0
        inn_wickets = 0
        inn_legal_balls = 0

        revised_target = match_info.get('revised_target')
        target = int(revised_target) if (revised_target and revised_target.isdigit() and int(revised_target) > 0) else inn1_totals.get(match_id, 160) + 1

        for b in balls:
            total_deliveries += 1
            inn = b['innings']
            if inn != current_innings:
                current_innings = inn
                inn_score = 0
                inn_wickets = 0
                inn_legal_balls = 0

            runs_bat = int(b['runs']) if b['runs'] else 0
            e1 = int(b['extras1_runs']) if b['extras1_runs'] else 0
            e2 = int(b['extras_2_runs']) if b['extras_2_runs'] else 0
            extras_type = b['extras_type']
            is_legal = extras_type not in ('wide', 'Overstep')
            is_wkt = b['is_wicket'] == 'true'
            wkt_type = b['dismissal_type']
            is_bowler_wkt = is_wkt and wkt_type in ('Bowled', 'Caught', 'LBW', 'Stump', 'Hit Wicket')

            bowler_runs = runs_bat
            if extras_type in ('wide', 'Overstep'):
                bowler_runs += (e1 + e2)

            is_four = b['is_four'] == 'true'
            is_six = b['is_six'] == 'true'
            is_boundary = is_four or is_six
            is_dot = (runs_bat == 0 and e1 == 0 and e2 == 0)

            # Compute ball pressure
            pi, is_high_pressure, leverage = compute_ball_pressure(
                b, inn, inn_score, inn_wickets, inn_legal_balls, target, match_info, comp_info
            )
            if is_high_pressure:
                hp_deliveries += 1

            # Predict situational expectations via ML model
            over_num = int(b['overid']) if b['overid'].isdigit() else 1
            rrr_val = (max(0, target - inn_score) * 6.0) / max(1, 120 - inn_legal_balls) if inn == '2' else 8.5
            exp_runs, exp_wkt = exp_model.predict_expectation(over_num, is_high_pressure, rrr_val, inn_wickets)

            # Accumulate batter stats
            striker_id = b['striker_id']
            if is_legal:
                s = batter_stats[striker_id]
                s['name'] = b['striker_name']
                if is_high_pressure:
                    s['p_balls'] += 1
                    s['p_runs'] += runs_bat
                    s['p_outs'] += 1 if (is_wkt and b['dismissed_player_id'] == striker_id) else 0
                    s['p_4s'] += 1 if is_four else 0
                    s['p_6s'] += 1 if is_six else 0
                    s['p_dots'] += 1 if is_dot else 0
                    s['expected_runs_p'] += exp_runs
                    s['match_p_balls'][match_id] += 1
                    s['match_p_runs'][match_id] += runs_bat
                else:
                    s['b_balls'] += 1
                    s['b_runs'] += runs_bat
                    s['b_outs'] += 1 if (is_wkt and b['dismissed_player_id'] == striker_id) else 0
                    s['b_4s'] += 1 if is_four else 0
                    s['b_6s'] += 1 if is_six else 0
                    s['b_dots'] += 1 if is_dot else 0
                    s['expected_runs_b'] += exp_runs

            # Accumulate bowler stats
            bowler_id = b['bowler_id']
            bw = bowler_stats[bowler_id]
            bw['name'] = b['bowler_name']
            if is_high_pressure:
                if is_legal:
                    bw['p_balls'] += 1
                    bw['expected_runs_p'] += exp_runs
                    bw['expected_wkts_p'] += exp_wkt
                    bw['match_p_balls'][match_id] += 1
                bw['p_runs'] += bowler_runs
                bw['match_p_runs'][match_id] += bowler_runs
                if is_bowler_wkt:
                    bw['p_wkts'] += 1
                    bw['match_p_wkts'][match_id] += 1
                if is_dot and is_legal:
                    bw['p_dots'] += 1
                if is_boundary:
                    bw['p_bounds'] += 1
            else:
                if is_legal:
                    bw['b_balls'] += 1
                bw['b_runs'] += bowler_runs
                if is_bowler_wkt:
                    bw['b_wkts'] += 1
                if is_dot and is_legal:
                    bw['b_dots'] += 1
                if is_boundary:
                    bw['b_bounds'] += 1

            inn_score += (runs_bat + e1 + e2)
            if is_legal:
                inn_legal_balls += 1
            if is_wkt:
                inn_wickets += 1

    print(f"      Total deliveries processed: {total_deliveries:,}")
    print(f"      High-pressure deliveries classified: {hp_deliveries:,} ({hp_deliveries/total_deliveries*100:.1f}%)")

    # 4. Score Batters & Bowlers
    print("\n[3/5] Computing Dual-Benchmark Clutch Scores & Bayesian Shrinkage...")
    all_batters = evaluate_batters(batter_stats, player_avg_pos, excluded_player_ids, ipl_only_ids=ipl_players)
    all_bowlers = evaluate_bowlers(bowler_stats, excluded_player_ids, ipl_only_ids=ipl_players)

    top_10_batters = select_role_balanced_batters(all_batters, top_n=10)
    top_10_bowlers = all_bowlers[:10]
    for r, b in enumerate(top_10_bowlers, 1):
        b['rank'] = r

    # 5. Display Official Rankings
    print("\n" + "=" * 80)
    print("               OFFICIAL TOP 10 BATTERS UNDER PRESSURE (IPL-ELIGIBLE)")
    print("=" * 80)
    print(f"{'Rank':<5} {'Player':<20} {'Role':<20} {'P_Balls':<8} {'P_SR':<8} {'B_SR':<8} {'dSR Lift':<10} {'P_Avg':<8} {'Score':<8}")
    print("-" * 80)
    for p in top_10_batters:
        print(f"{p['rank']:<5} {p['player_name']:<20} {p['role']:<20} {p['p_balls']:<8} {p['p_sr']:<8.1f} {p['b_sr']:<8.1f} {p['delta_sr']:<+10.1f} {p['p_avg']:<8.1f} {p['clutch_score']:<8.2f}")

    print("\n" + "=" * 80)
    print("               OFFICIAL TOP 10 BOWLERS UNDER PRESSURE (IPL-ELIGIBLE)")
    print("=" * 80)
    print(f"{'Rank':<5} {'Player':<20} {'P_Balls':<8} {'P_Econ':<8} {'B_Econ':<8} {'dEcon Lift':<10} {'Wkts':<6} {'Wkt SR':<8} {'Score':<8}")
    print("-" * 80)
    for p in top_10_bowlers:
        print(f"{p['rank']:<5} {p['player_name']:<20} {p['p_balls']:<8} {p['p_econ']:<8.2f} {p['b_econ']:<8.2f} {p['delta_econ']:<+10.2f} {p['p_wkts']:<6} {p['p_sr']:<8.1f} {p['clutch_score']:<8.2f}")

    # 6. Export Artifacts
    print("\n[4/5] Exporting ranking CSVs to outputs/ directory...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    bat_file = os.path.join(OUTPUT_DIR, "top_10_batters.csv")
    with open(bat_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'rank', 'player_id', 'player_name', 'role', 'avg_pos', 'p_balls', 'p_runs', 'p_outs',
            'p_sr', 'b_sr', 'delta_sr', 'p_avg', 'b_avg', 'p_bound_pct', 'p_dot_pct',
            'rae', 'consistency', 'clutch_score'
        ])
        writer.writeheader()
        writer.writerows(top_10_batters)

    bowl_file = os.path.join(OUTPUT_DIR, "top_10_bowlers.csv")
    with open(bowl_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'rank', 'player_id', 'player_name', 'p_balls', 'p_runs', 'p_wkts',
            'p_econ', 'b_econ', 'delta_econ', 'p_sr', 'b_sr', 'p_dot_pct', 'p_bound_pct',
            'rsae', 'wae', 'consistency', 'clutch_score'
        ])
        writer.writeheader()
        writer.writerows(top_10_bowlers)

    print(f"      Saved: {bat_file}")
    print(f"      Saved: {bowl_file}")
    print("\n[5/5] Pipeline execution completed successfully.")
    print("=" * 70)

if __name__ == '__main__':
    main()
