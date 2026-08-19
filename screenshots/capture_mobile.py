"""Capture mobile screenshots of the OnyxDashboard React UI."""
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
        # Wait for the React app to mount — use the main h1 in the topbar
        # since `text=Dashboard` matches the (hidden on mobile) sidebar brand.
        page.wait_for_selector("h1", timeout=15000)
        time.sleep(1.2)

        # 1. Full mobile dark overview
        print("[1] Mobile dark overview")
        page.screenshot(path=os.path.join(OUT, "mobile-dark-overview.png"), full_page=True)

        # 2. Top stat cards close-up
        print("[2] Mobile stat cards")
        try:
            page.locator("div.grid.grid-cols-1").first.screenshot(
                path=os.path.join(OUT, "mobile-stat-cards.png")
            )
        except Exception as e:
            print(f"  stat capture failed: {e}")

        # 3. Device table (with horizontal scroll)
        print("[3] Mobile device table")
        try:
            page.locator("table").screenshot(path=os.path.join(OUT, "mobile-device-table.png"))
        except Exception as e:
            print(f"  table capture failed: {e}")

        # 4. Light mode
        print("[4] Mobile light mode")
        toggle = page.get_by_role("button", name="Toggle theme")
        if toggle.count() == 0:
            toggle = page.locator('button[aria-label="Toggle theme"]').first
        toggle.click()
        time.sleep(0.6)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUT, "mobile-light-overview.png"), full_page=True)

        # 5. Register modal on mobile
        print("[5] Mobile register modal")
        # Click the floating Register button in the bottom nav
        try:
            page.get_by_text("Register", exact=True).last.click()
            time.sleep(0.5)
            page.screenshot(
                path=os.path.join(OUT, "mobile-register-modal.png"),
                clip={"x": 0, "y": 80, "width": 390, "height": 600},
            )
            page.keyboard.press("Escape")
        except Exception as e:
            print(f"  modal capture failed: {e}")

        browser.close()
        print("Done.")


if __name__ == "__main__":
    main()
