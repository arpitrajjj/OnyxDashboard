"""Capture mobile screenshots of the new OnyxDashboard UI — hamburger menu,
device SMS drawer, online toast notifications."""
import os, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:5050"
OUT = os.path.dirname(os.path.abspath(__file__))


def main():
    with sync_playwright() as p:
        # Mobile viewport — iPhone 14 Pro size
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
        )
        page = ctx.new_page()
        page.goto(URL, wait_until="domcontentloaded")
        # React needs to mount + fetch /api/devices — give it time.
        page.wait_for_timeout(3000)
        # Wait for the table to actually have rows.
        try:
            page.wait_for_selector("table tbody tr", timeout=15000)
        except Exception:
            pass

        # 1. Mobile dark overview (welcome state)
        print("[1] Mobile dark overview")
        page.screenshot(path=os.path.join(OUT, "mobile-dark-overview.png"), full_page=True)

        # 2. Hamburger menu open
        print("[2] Hamburger menu")
        try:
            page.get_by_role("button", name="Open menu").click()
            time.sleep(0.5)
            page.screenshot(path=os.path.join(OUT, "mobile-hamburger.png"))
            # Close the menu via Escape, then wait for the exit animation
            page.keyboard.press("Escape")
            time.sleep(1.0)
        except Exception as e:
            print(f"  hamburger capture failed: {e}")

        # 3. Tap first device row to open SMS drawer
        print("[3] Device SMS drawer")
        try:
            # Scroll the table into view first
            page.evaluate("document.querySelector('table')?.scrollIntoView({block:'center'})")
            time.sleep(0.3)
            page.locator("table tbody tr").first.click(timeout=5000)
            time.sleep(1.0)
            page.screenshot(path=os.path.join(OUT, "mobile-sms-drawer.png"), full_page=True)
        except Exception as e:
            print(f"  drawer capture failed: {e}")

        # 4. Light mode
        print("[4] Mobile light mode")
        try:
            # Close drawer first
            page.keyboard.press("Escape")
            time.sleep(0.3)
            toggle = page.get_by_role("button", name="Toggle theme")
            if toggle.count() == 0:
                toggle = page.locator('button[aria-label="Toggle theme"]').first
            toggle.click()
            time.sleep(0.5)
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=os.path.join(OUT, "mobile-light-overview.png"), full_page=True)
        except Exception as e:
            print(f"  light capture failed: {e}")

        browser.close()
        print("Done.")


if __name__ == "__main__":
    main()
