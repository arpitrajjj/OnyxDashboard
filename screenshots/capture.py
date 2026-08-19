"""Capture 6 OnyxDashboard screenshots with Playwright."""
import os
import time
from playwright.sync_api import sync_playwright

URL = "http://localhost:5000"
OUT = os.path.dirname(os.path.abspath(__file__))


def shot(page, name, full_page=False):
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=full_page)
    print(f"  saved {name}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(URL, wait_until="networkidle")
        page.wait_for_selector("#devices-tbody tr")

        # 1. Full dashboard overview
        print("[1] Dashboard overview")
        shot(page, "dashboard-overview.png", full_page=True)

        # 2. Just the top stat cards region
        print("[2] Stat cards close-up")
        page.evaluate("document.querySelector('.stat-grid').scrollIntoView({block:'center'})")
        time.sleep(0.3)
        page.locator(".stat-grid").screenshot(path=os.path.join(OUT, "stat-cards.png"))

        # 3. Filter: online only
        print("[3] Online filter")
        page.evaluate("document.querySelector('.topbar').scrollIntoView({block:'start'})")
        page.select_option("#filter-status", "online")
        page.wait_for_function("document.querySelector('#devices-tbody tr') && !document.querySelector('#devices-tbody tr .empty')")
        time.sleep(0.4)
        page.locator(".panel").first.screenshot(path=os.path.join(OUT, "filter-online.png"))

        # 4. Search by name
        print("[4] Search 'pixel'")
        page.select_option("#filter-status", "")
        page.fill("#search-input", "pixel")
        page.wait_for_function("document.querySelectorAll('#devices-tbody tr').length > 0")
        time.sleep(0.4)
        page.locator(".panel").first.screenshot(path=os.path.join(OUT, "search-pixel.png"))

        # 5. Register device modal
        print("[5] Register modal")
        page.fill("#search-input", "")
        page.click("#register-btn")
        page.wait_for_selector("#register-modal:not([hidden])")
        time.sleep(0.3)
        page.locator(".modal-card").screenshot(path=os.path.join(OUT, "register-modal.png"))
        # close it
        page.keyboard.press("Escape")

        # 6. API reference section
        print("[6] API reference")
        page.evaluate("document.querySelector('#api').scrollIntoView({block:'center'})")
        time.sleep(0.3)
        page.locator("#api").screenshot(path=os.path.join(OUT, "api-reference.png"))

        browser.close()
        print("Done.")


if __name__ == "__main__":
    main()
