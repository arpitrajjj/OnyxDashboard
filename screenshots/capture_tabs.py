"""Capture screenshots of the new tabbed OnyxDashboard UI — desktop + mobile."""
import os, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:5050"
OUT = os.path.dirname(os.path.abspath(__file__))


def main():
    with sync_playwright() as p:
        # === Desktop (1440x900) ===
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        try:
            page.wait_for_selector("table tbody tr", timeout=15000)
        except Exception:
            pass

        # Desktop Overview tab
        print("[1] Desktop overview")
        page.screenshot(path=os.path.join(OUT, "tab-overview.png"), full_page=True)

        # Switch to Devices tab
        print("[2] Desktop devices")
        try:
            page.get_by_role("button", name="Devices").first.click()
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(OUT, "tab-devices.png"), full_page=True)
        except Exception as e:
            print(f"  devices capture failed: {e}")

        # Switch to SMS tab
        print("[3] Desktop SMS")
        try:
            page.get_by_role("button", name="SMS").first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUT, "tab-sms.png"), full_page=True)
        except Exception as e:
            print(f"  sms capture failed: {e}")

        # Switch to API tab
        print("[4] Desktop API")
        try:
            page.get_by_role("button", name="API").first.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(OUT, "tab-api.png"), full_page=True)
        except Exception as e:
            print(f"  api capture failed: {e}")

        browser.close()

        # === Mobile (390x844 — iPhone 14 Pro) ===
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3)
        page = ctx.new_page()
        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        try:
            page.wait_for_selector("table tbody tr", timeout=15000)
        except Exception:
            pass

        # Mobile overview (default tab)
        print("[5] Mobile overview")
        page.screenshot(path=os.path.join(OUT, "tab-mobile-overview.png"), full_page=True)

        # Tap SMS tab in the bottom bar (use .last since the desktop sidebar
        # also has a "SMS" button, even though it's hidden on mobile)
        print("[6] Mobile SMS tab")
        try:
            page.locator("nav button:has-text('SMS')").last.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUT, "tab-mobile-sms.png"), full_page=True)
        except Exception as e:
            print(f"  mobile sms capture failed: {e}")

        # Tap Devices tab
        print("[7] Mobile devices tab")
        try:
            page.locator("nav button:has-text('Devices')").last.click()
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(OUT, "tab-mobile-devices.png"), full_page=True)
        except Exception as e:
            print(f"  mobile devices capture failed: {e}")

        browser.close()
        print("Done.")


if __name__ == "__main__":
    main()
