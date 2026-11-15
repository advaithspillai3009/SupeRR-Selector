import urllib.request
import json

def verify():
    # 1. Check index.html
    html = urllib.request.urlopen('http://127.0.0.1:8000/').read().decode('utf-8')
    assert '/static/images/brand/rr_crest.png' in html, 'Missing rr_crest.png in html'
    print('[PASS] Sidebar top logo uses official Rajasthan Royals crest')

    # 2. Check platform_data.json
    data = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/static/data/platform_data.json').read().decode('utf-8'))
    assert not any('karthik' in b['player_name'].lower() for b in data['batters']), 'Dinesh Karthik still in batters!'
    print('[PASS] Dinesh Karthik successfully removed from platform data')

    top10_names = [b['player_name'] for b in data['batters'][:10]]
    print('Top 10 Batters:', top10_names)
    assert 'Tim David' in top10_names, 'Tim David not in top 10 batters!'
    print('[PASS] Tim David successfully promoted into Top 10 Batters')

    # 3. Check CSS for dark mode player contrast
    css = urllib.request.urlopen('http://127.0.0.1:8000/static/css/styles.css').read().decode('utf-8')
    assert '.table-player-name-link' in css, 'Missing .table-player-name-link in css'
    assert '[data-theme="dark"] .table-player-name-link' in css, 'Missing dark mode contrast rule'
    print('[PASS] Dark mode high-contrast player name styles verified')

if __name__ == '__main__':
    verify()
