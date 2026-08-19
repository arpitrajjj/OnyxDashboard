"""Capture OnyxDashboard React UI screenshots with Playwright.

Each step is wrapped so a single failure doesn't kill the whole script.
"""
import os
import time
from playwright.sync_api import sync_playwright

URL = "http://localhost:5050"
OUT = os.path.dirname(os.path.abspath(__file__))


def step(n, name, fn):
    try:
        print(f"[{n}] {name}")
        fn()
    except Exception as e:
        print(f"  ! step {n} failed: {e}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_selector("text=Dashboard")
        time.sleep(1.2)

        # 1. Full dashboard overview (dark theme by default)
        def s1():
            page.screenshot(path=os.path.join(OUT, "dashboard-overview.png"), full_page=True)
        step(1, "Dashboard overview (dark)", s1)

        # 2. Stat cards region close-up
        def s2():
            page.locator("div.grid.grid-cols-1").first.screenshot(
                path=os.path.join(OUT, "stat-cards.png")
            )
        step(2, "Stat cards close-up", s2)

        # 3. Device table region (with all devices loaded)
        def s3():
            page.evaluate("document.querySelector('table')?.scrollIntoView({block:'center'})")
            time.sleep(0.3)
            page.locator("table").screenshot(path=os.path.join(OUT, "device-table.png"))
        step(3, "Device table", s3)

        # 4. Register device modal
        def s4():
            btn = page.get_by_role("button", name="Register device")
            if btn.count() == 0:
                btn = page.locator("text=Register device").first
            btn.click()
            time.sleep(0.5)
            page.screenshot(
                path=os.path.join(OUT, "register-modal.png"),
                clip={"x": 320, "y": 160, "width": 800, "height": 600},
            )
            page.keyboard.press("Escape")
            time.sleep(0.2)
        step(4, "Register modal", s4)

        # 5. API reference section
        def s5():
            api_heading = page.locator("h2:has-text('API Reference')")
            if api_heading.count() == 0:
                api_heading = page.locator("text=API Reference").first
            api_heading.scroll_into_view_if_needed()
            time.sleep(0.3)
            # Screenshot a generous region around the API section
            page.screenshot(
                path=os.path.join(OUT, "api-reference.png"),
                clip={"x": 32, "y": 600, "width": 1376, "height": 700},
            )
        step(5, "API reference", s5)

        # 6. Light mode full page
        def s6():
            toggle = page.get_by_role("button", name="Toggle theme")
            if toggle.count() == 0:
                toggle = page.locator('button[aria-label="Toggle theme"]').first
            toggle.click()
            time.sleep(0.6)
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(0.2)
            page.screenshot(path=os.path.join(OUT, "light-mode.png"), full_page=True)
        step(6, "Light mode", s6)

        browser.close()
        print("Done.")


if __name__ == "__main__":
    main()
