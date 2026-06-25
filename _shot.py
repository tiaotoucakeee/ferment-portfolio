from playwright.sync_api import sync_playwright
url = 'http://localhost:8779/index.html'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(url)
    pg.wait_for_timeout(2600)
    pg.screenshot(path='_hero.png', clip={'x': 0, 'y': 0, 'width': 1280, 'height': 800})
    b.close()
print('shot')
