"""
Downloads available official Wikimedia player portraits and generates
styled SVG franchise cards for all players.
"""

import os
import urllib.request
import json

IMG_DIR = os.path.join(os.path.dirname(__file__), "web", "static", "images", "players")
os.makedirs(IMG_DIR, exist_ok=True)

# Wikimedia commons filenames mapped to player IDs
wiki_map = {
    "3647": "Shreyas_Iyer_2021.jpg",                       # Shreyas Iyer
    "781": "Sunil_Narine.jpg",                             # Sunil Narine
    "2933": "Jasprit_Bumrah_in_PMO_New_Delhi.jpg",         # Jasprit Bumrah
    "47": "Virat_Kohli_in_PMO_New_Delhi.jpg",              # Virat Kohli
    "813": "Jos_Buttler_in_2023.jpg",                      # Jos Buttler
    "1699": "Suryakumar_Yadav_in_PMO_New_Delhi.jpg",       # Suryakumar Yadav
    "143": "Dinesh.Karthik.jpg",                           # Dinesh Karthik
    "4722": "Rashid_Khan.jpg",                             # Rashid Khan
    "6464": "Prime_Minister_Of_Bharat_Shri_Narendra_Damodardas_Modi_with_Arshdeep_Singh_Family_(Cropped).jpg", # Arshdeep Singh
    "516": "Sanju.Samson.jpg",                             # Sanju Samson
    "278": "Tim_Southee.jpg",                              # Tim Southee
    "7897": "Tilak_Varma_in_March_2026.png"                # Tilak Varma
}

print("Downloading available photographic portraits...")
for pid, filename in wiki_map.items():
    dest_path = os.path.join(IMG_DIR, f"{pid}.jpg")
    if not os.path.exists(dest_path):
        url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=400"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            res = urllib.request.urlopen(req, timeout=5)
            with open(dest_path, "wb") as f:
                f.write(res.read())
            print(f"  [OK] Downloaded {pid}.jpg ({filename})")
        except Exception as e:
            print(f"  [SKIP] {pid} ({filename}): {e}")
    else:
        print(f"  [EXISTS] {pid}.jpg")

# Franchise branding colors
franchise_colors = {
    "Kolkata Knight Riders": ("#3A225D", "#F7D54E"), # Purple & Gold
    "Punjab Kings": ("#ED1B24", "#DCDDDF"),          # Red & Silver
    "Mumbai Indians": ("#004BA0", "#D1AB3E"),        # Blue & Gold
    "Royal Challengers Bengaluru": ("#2B2A29", "#DA1818"), # Black & Red
    "Delhi Capitals": ("#004C93", "#E41B17"),        # Navy & Red
    "Rajasthan Royals": ("#EA1A85", "#254AA5"),       # Pink & Blue
    "Chennai Super Kings": ("#F9CD05", "#124984"),   # Yellow & Blue
    "Sunrisers Hyderabad": ("#F26522", "#000000"),   # Orange & Black
    "Gujarat Titans": ("#1B2133", "#D2B468")          # Midnight & Gold
}

# Generate styled SVG fallback/primary portrait for all players
with open(os.path.join(os.path.dirname(__file__), "web", "static", "data", "platform_data.json"), "r", encoding="utf-8") as f:
    data = json.load(f)

all_players = data.get("batters", []) + data.get("bowlers", [])

print("\nGenerating styled franchise vector portraits...")
for p in all_players:
    pid = str(p["player_id"])
    name = p["player_name"]
    team = p.get("team", "Rajasthan Royals")
    
    # Pick primary franchise color
    bg_color, accent_color = ("#17233F", "#E65391")
    for franchise, (c1, c2) in franchise_colors.items():
        if franchise.lower() in team.lower():
            bg_color, accent_color = c1, c2
            break

    # Initials
    parts = name.split()
    initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) > 1 else name[:2].upper()

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="grad_{pid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{bg_color}" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <radialGradient id="glow_{pid}" cx="50%" cy="35%" r="50%">
      <stop offset="0%" stop-color="{accent_color}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="{bg_color}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad_{pid})" />
  <circle cx="200" cy="180" r="160" fill="url(#glow_{pid})" />
  
  <!-- Stylized cricketer silhouette -->
  <g fill="{accent_color}" opacity="0.15">
    <circle cx="200" cy="150" r="60" />
    <path d="M 120 320 C 120 230, 280 230, 280 320 Z" />
  </g>

  <!-- Player Initials Circle -->
  <circle cx="200" cy="170" r="70" fill="#FFFFFF" fill-opacity="0.08" stroke="{accent_color}" stroke-width="3" />
  <text x="200" y="188" font-family="'Playfair Display', Georgia, serif" font-size="54" font-weight="bold" fill="#FFFFFF" text-anchor="middle">{initials}</text>
  
  <!-- Team & Name Plate -->
  <rect x="20" y="320" width="360" height="60" rx="8" fill="#000000" fill-opacity="0.5" stroke="rgba(255,255,255,0.1)" />
  <text x="200" y="348" font-family="'Manrope', sans-serif" font-size="16" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">{name.upper()}</text>
  <text x="200" y="368" font-family="'Manrope', sans-serif" font-size="11" font-weight="600" fill="{accent_color}" text-anchor="middle" letter-spacing="1">{team.upper()}</text>
</svg>'''

    svg_path = os.path.join(IMG_DIR, f"{pid}.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)

print(f"Generated {len(all_players)} vector portraits in {IMG_DIR}")
