"""
Data Loader Module for SupeRR-ClutchML
Parses CSV datasets, builds entity mappings, and filters IPL-ineligible players.
"""

import os
import csv
from collections import defaultdict
from .config import DATA_DIR, EXCLUDED_TEAMS

def load_all_data():
    """
    Loads all data files from Data Pack and identifies IPL-ineligible players.
    Returns:
        competitions (dict): comp_id -> metadata
        matches (dict): match_id -> metadata
        deliveries_by_match (dict): match_id -> list of ball records
        player_avg_pos (dict): player_id -> (avg_batting_pos, role_string)
        excluded_player_ids (set): set of player IDs belonging to excluded teams
    """
    competitions = {}
    with open(os.path.join(DATA_DIR, 'competitions.csv'), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            competitions[r['comp_id']] = r

    matches = {}
    with open(os.path.join(DATA_DIR, 'matches.csv'), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            matches[r['match_id']] = r

    # Identify excluded team IDs
    excluded_team_ids = set()
    with open(os.path.join(DATA_DIR, 'teams.csv'), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            if r['team_name'] in EXCLUDED_TEAMS or any(x in r['team_name'].lower() for x in ['pakistan', 'bangladesh']):
                excluded_team_ids.add(r['team_id'])

    # Identify excluded player IDs
    excluded_player_ids = set()
    with open(os.path.join(DATA_DIR, 'competition_team_player_mapping.csv'), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            if r['team_id'] in excluded_team_ids or any(x in r['team_name'].lower() for x in ['pakistan', 'bangladesh']):
                excluded_player_ids.add(r['player_id'])

    # Player position analysis from playing_eleven.csv
    player_positions = defaultdict(list)
    with open(os.path.join(DATA_DIR, 'playing_eleven.csv'), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            if r['batting_order']:
                try:
                    order = int(r['batting_order'])
                    player_positions[r['player_id']].append(order)
                except ValueError:
                    pass

    player_avg_pos = {}
    for pid, pos_list in player_positions.items():
        avg_pos = sum(pos_list) / len(pos_list)
        if avg_pos <= 3.4:
            role = "Top Order (1-3)"
        elif avg_pos <= 5.4:
            role = "Middle Order (4-5)"
        else:
            role = "Lower Order / Finisher (6+)"
        player_avg_pos[pid] = (avg_pos, role)

    # Deliveries grouped by match
    deliveries_by_match = defaultdict(list)
    with open(os.path.join(DATA_DIR, 'ball_by_ball.csv'), 'r', encoding='utf-8', errors='ignore') as f:
        for r in csv.DictReader(f):
            deliveries_by_match[r['match_id']].append(r)
            # Extra safety check: catch any player playing in excluded teams
            if r['batting_team_id'] in excluded_team_ids:
                excluded_player_ids.add(r['striker_id'])
                excluded_player_ids.add(r['non_striker_id'])
            if r['bowling_team_id'] in excluded_team_ids:
                excluded_player_ids.add(r['bowler_id'])

    return competitions, matches, deliveries_by_match, player_avg_pos, excluded_player_ids
