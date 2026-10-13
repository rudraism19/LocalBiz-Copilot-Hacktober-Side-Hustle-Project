import time
import os
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = "demo_captures"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

PAGES = [
    ("01_dashboard.png", "http://localhost:3000"),
    ("02_inventory.png", "http://localhost:3000/inventory"),
    ("03_sales.png", "http://localhost:3000/sales"),
    ("04_briefing.png", "http://localhost:3000/briefing"),
    ("05_marketing.png", "http://localhost:3000/marketing"),
    ("06_settings.png", "http://localhost:3000/settings"),
]

def capture_demo_screens():
    print("[Browser Capture] Launching Microsoft Edge via Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page = context.new_page()

        for filename, url in PAGES:
            print(f"  Navigating to {url} -> {filename}...")
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(3000) # allow React client components to mount & fetch data
            
            # Special interaction for briefing
            if "briefing" in url:
                try:
                    btn = page.locator("button:has-text('Generate Morning Briefing')").first
                    if btn.is_visible():
                        btn.click()
                        print("    Triggered Briefing Generation...")
                        page.wait_for_timeout(10000)
                except Exception as e:
                    print("    Briefing note:", e)

            # Special interaction for marketing
            if "marketing" in url:
                try:
                    gen_btn = page.locator("button:has-text('Generate Campaign')").first
                    if gen_btn.is_visible():
                        gen_btn.click()
                        print("    Triggered Marketing Generation...")
                        page.wait_for_timeout(8000)
                except Exception as e:
                    print("    Marketing note:", e)

            out_path = os.path.join(SCREENSHOTS_DIR, filename)
            page.screenshot(path=out_path)
            print(f"    Saved {out_path}")

        browser.close()
        print("\n[SUCCESS] Captured all 6 real application screens!")

if __name__ == "__main__":
    capture_demo_screens()
