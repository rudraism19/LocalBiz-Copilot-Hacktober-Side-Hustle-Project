import os
import math
import asyncio
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
import wave
import subprocess

VIDEO_OUTPUT = "localbiz_copilot_demo.mp4"
TEMP_SILENT_VIDEO = "temp_video_silent.mp4"
TEMP_BGM = "temp_bgm.wav"
TEMP_FINAL_AUDIO = "temp_final_audio.aac"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION_SEC = 62
TOTAL_FRAMES = FPS * DURATION_SEC

# Scene Timings (seconds)
SCENE_TIMINGS = [
    (0.0, 12.0),   # Scene 1: The 4:30 AM Reality
    (12.0, 24.0),  # Scene 2: Real Dashboard & Sales Margin
    (24.0, 35.0),  # Scene 3: Grounded AI Morning Briefing
    (35.0, 47.0),  # Scene 4: Bilingual Marketing Studio
    (47.0, 62.0),  # Scene 5: 100% On-Premise Privacy & Verified Tests
]

# Color Palette
BG_COLOR = (15, 14, 13)       # #0F0E0D Dark Charcoal Canvas
CARD_BG = (28, 25, 23)        # #1C1917
BORDER_COLOR = (68, 64, 60)   # #44403C
ORANGE = (234, 88, 12)        # #EA580C
AMBER = (217, 119, 6)         # #D97706
EMERALD = (16, 185, 129)      # #10B981
ROSE = (244, 63, 94)          # #F43F5E
WHITE = (255, 255, 255)
TEXT_MUTED = (168, 162, 158)  # #A8A29E
TEXT_SUBTLE = (120, 113, 108)

# Fonts
def get_font(size, bold=False):
    paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_title = get_font(46, bold=True)
font_subtitle = get_font(24, bold=False)
font_badge = get_font(18, bold=True)
font_card_title = get_font(22, bold=True)
font_card_val = get_font(30, bold=True)
font_card_text = get_font(18, bold=False)
font_mono = get_font(16, bold=True)
font_caption = get_font(21, bold=True)

# Pre-load screenshots
def load_and_prep_screenshots():
    screens = {}
    mapping = {
        "dashboard": "demo_captures/01_dashboard.png",
        "inventory": "demo_captures/02_inventory.png",
        "sales": "demo_captures/03_sales.png",
        "briefing": "demo_captures/04_briefing.png",
        "marketing": "demo_captures/05_marketing.png",
        "settings": "demo_captures/06_settings.png",
    }
    for k, p in mapping.items():
        if os.path.exists(p):
            try:
                screens[k] = Image.open(p).convert("RGB")
            except Exception as e:
                print(f"Error loading {p}: {e}")
        else:
            print(f"Warning: {p} not found.")
    return screens

SCREENSHOTS = load_and_prep_screenshots()

# Narration lines & timestamps
NARRATION_DATA = [
    {
        "id": 1,
        "start": 0.3,
        "text": "Every morning at 4:30 AM, independent bakeries face the same challenge: fresh sourdough cooling on racks, perishable ingredients expiring, and zero room for inventory guesswork. Independent cafes need real intelligence grounded in actual business data.",
        "caption": "4:30 AM in the bakery: fresh loaves cooling, ingredients expiring, zero room for guesswork."
    },
    {
        "id": 2,
        "start": 12.4,
        "text": "Introducing LocalBiz Copilot. A production-minded business assistant with deterministic financial accounting, automated stock alerts, and a strict Zero-Assumption Guardrail protecting owner cash flow.",
        "caption": "LocalBiz Copilot: deterministic sales accounting, stock alerts, and Zero-Assumption margin guardrail."
    },
    {
        "id": 3,
        "start": 24.4,
        "text": "At the push of a button, open-weight models generate a grounded daily briefing, strictly separating verified inventory facts from actionable afternoon flash promotions.",
        "caption": "Grounded AI Briefing: strictly separates verified inventory facts from actionable promotions."
    },
    {
        "id": 4,
        "start": 35.4,
        "text": "The Bilingual Marketing Studio drafts one-click promotional campaigns in both English and Hindi, from mouthwatering Instagram posts to formatted WhatsApp broadcasts in Devanagari script.",
        "caption": "Bilingual Marketing: one-click Instagram captions and native Hindi WhatsApp broadcasts."
    },
    {
        "id": 5,
        "start": 47.4,
        "text": "One hundred percent on-premise privacy. Your recipes and margins stay on your device, with twenty-eight Vitest and seven Pytest suites verified. LocalBiz Copilot: real intelligence for independent business.",
        "caption": "100% on-premise privacy. Open weights (Apache 2.0). 28/28 Vitest, 7/7 Pytest, 10/10 Benchmark."
    },
]

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_browser_mockup(img, draw, screenshot_key, x, y, w, h, url_text, zoom=1.0, pan_y=0):
    """Draws a sleek modern browser window mockup with traffic lights and real screenshot inside."""
    header_h = 38
    # Window container shadow / outline
    draw_rounded_rect(draw, (x - 2, y - 2, x + w + 2, y + h + header_h + 2), 14, (32, 28, 25), BORDER_COLOR, 2)
    # Header bar
    draw_rounded_rect(draw, (x, y, x + w, y + header_h + 10), 12, (26, 23, 21))
    draw.rectangle([x, y + header_h - 4, x + w, y + header_h], fill=(26, 23, 21))

    # macOS style traffic lights
    dot_y = y + header_h // 2
    draw.ellipse([x + 18, dot_y - 6, x + 30, dot_y + 6], fill=(255, 95, 86))
    draw.ellipse([x + 36, dot_y - 6, x + 48, dot_y + 6], fill=(255, 189, 46))
    draw.ellipse([x + 54, dot_y - 6, x + 66, dot_y + 6], fill=(39, 201, 63))

    # URL bar
    url_w = 480
    url_x = x + w // 2 - url_w // 2
    draw_rounded_rect(draw, (url_x, y + 8, url_x + url_w, y + header_h - 6), 6, (18, 16, 15), (55, 50, 45))
    draw.text((url_x + 14, y + 10), "🔒 " + url_text, fill=TEXT_MUTED, font=font_mono)

    # Screenshot area
    if screenshot_key in SCREENSHOTS:
        raw_shot = SCREENSHOTS[screenshot_key]
        sw, sh = raw_shot.size

        # Apply pan and zoom crop
        crop_w = int(sw / zoom)
        crop_h = int(sh / zoom)
        crop_x = int((sw - crop_w) / 2)
        crop_y = min(max(0, int(pan_y)), sw - crop_h)

        cropped = raw_shot.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h))
        resized = cropped.resize((w, h), Image.Resampling.LANCZOS)
        img.paste(resized, (x, y + header_h))
    else:
        draw.rectangle([x, y + header_h, x + w, y + header_h + h], fill=(20, 18, 16))

def render_scene(frame_idx):
    t = frame_idx / FPS
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Ambient animated background light
    pulse = math.sin(t * 1.5) * 15
    draw.ellipse([WIDTH//2 - 500 - pulse, HEIGHT//2 - 350 - pulse, WIDTH//2 + 500 + pulse, HEIGHT//2 + 350 + pulse], fill=(24, 20, 17))

    # Top persistent branding header
    draw_rounded_rect(draw, (80, 28, WIDTH - 80, 80), 10, (26, 23, 21), BORDER_COLOR)
    draw.text((105, 42), "LOCALBIZ COPILOT", fill=WHITE, font=font_badge)
    draw.text((310, 43), "|  Open-Weight AI Assistant for Independent Bakeries & Cafes", fill=TEXT_MUTED, font=font_card_text)
    
    # Live time indicator on right
    mins = int(t // 60)
    secs = int(t % 60)
    draw.text((WIDTH - 230, 43), f"{mins:02d}:{secs:02d} / 01:02", fill=AMBER, font=font_mono)

    # Active caption / subtitle at bottom
    active_caption = ""
    for item in NARRATION_DATA:
        # Show caption during the scene
        pass
    if t < 12.0:
        active_caption = NARRATION_DATA[0]["caption"]
    elif t < 24.0:
        active_caption = NARRATION_DATA[1]["caption"]
    elif t < 35.0:
        active_caption = NARRATION_DATA[2]["caption"]
    elif t < 47.0:
        active_caption = NARRATION_DATA[3]["caption"]
    else:
        active_caption = NARRATION_DATA[4]["caption"]

    # ==========================================================
    # SCENE 1 (0s to 12s): The 4:30 AM Reality
    # ==========================================================
    if t < 12.0:
        local_t = t
        # Chapter badge
        draw_rounded_rect(draw, (WIDTH//2 - 170, 110, WIDTH//2 + 170, 142), 6, (45, 20, 10), ORANGE)
        draw.text((WIDTH//2 - 145, 116), "CHAPTER 1 // THE 4:30 AM REALITY", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 420, 160), "Baking artisan sourdough is a craft.", fill=WHITE, font=font_title)
        draw.text((WIDTH//2 - 310, 225), "Inventory guesswork is not.", fill=ORANGE, font=font_title)

        draw.text((WIDTH//2 - 430, 295), "18 loaves cooling. 3 croissants before rush. Perishable fruit tarts expiring.", fill=TEXT_MUTED, font=font_subtitle)

        # 3 Inventory Reality Cards with gentle animation
        bob = math.sin(local_t * 2.5) * 6
        
        # Card 1: Sourdough
        draw_rounded_rect(draw, (180, 370 + bob, 640, 590 + bob), 14, CARD_BG, BORDER_COLOR, 2)
        draw.text((210, 400 + bob), "Country Sourdough", fill=WHITE, font=font_card_title)
        draw.text((210, 440 + bob), "18 Loaves In Stock", fill=AMBER, font=font_card_val)
        draw.text((210, 500 + bob), "36-hr wild yeast cold fermentation", fill=TEXT_MUTED, font=font_card_text)
        draw.text((210, 535 + bob), "Status: Optimal morning bake", fill=EMERALD, font=font_mono)

        # Card 2: Almond Croissants
        draw_rounded_rect(draw, (730, 360 - bob, 1190, 580 - bob), 14, (38, 16, 22), ROSE, 2)
        draw.text((760, 390 - bob), "Almond Croissants", fill=WHITE, font=font_card_title)
        draw.text((760, 430 - bob), "3 Units Left (Critical)", fill=ROSE, font=font_card_val)
        draw.text((760, 490 - bob), "High morning demand velocity", fill=TEXT_MUTED, font=font_card_text)
        draw.text((760, 525 - bob), "Stockout predicted before 11:30 AM", fill=ROSE, font=font_mono)

        # Card 3: Strawberry Tarts
        draw_rounded_rect(draw, (1280, 370 + bob, 1740, 590 + bob), 14, CARD_BG, ORANGE, 2)
        draw.text((1310, 400 + bob), "Strawberry Mascarpone Tart", fill=WHITE, font=font_card_title)
        draw.text((1310, 440 + bob), "Expires in 24 Hours", fill=ORANGE, font=font_card_val)
        draw.text((1310, 500 + bob), "Fresh dairy cream spoilage risk", fill=TEXT_MUTED, font=font_card_text)
        draw.text((1310, 535 + bob), "Needs promotional clearance push", fill=ORANGE, font=font_mono)

        # Bottom contrast banner
        draw_rounded_rect(draw, (260, 640, WIDTH - 260, 750), 12, (26, 23, 21), (60, 50, 45))
        draw.text((300, 665), "The Problem With Generic Chatbots:", fill=ROSE, font=font_card_title)
        draw.text((300, 705), "They hallucinate fake profit margins and invent non-existent ingredient discounts.", fill=TEXT_MUTED, font=font_subtitle)

    # ==========================================================
    # SCENE 2 (12s to 24s): Real Dashboard & Sales Margin
    # ==========================================================
    elif t < 24.0:
        local_t = t - 12.0
        draw_rounded_rect(draw, (WIDTH//2 - 210, 100, WIDTH//2 + 210, 132), 6, (20, 35, 25), EMERALD)
        draw.text((WIDTH//2 - 185, 106), "CHAPTER 2 // LIVE DASHBOARD & ZERO-ASSUMPTION", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 420, 145), "Deterministic Business Accounting", fill=WHITE, font=font_title)

        # Browser Mockup showing REAL Dashboard Screenshot
        # Ken Burns subtle zoom (1.0 to 1.15)
        zoom = 1.0 + (local_t / 12.0) * 0.12
        pan = (local_t / 12.0) * 120
        draw_browser_mockup(img, draw, "dashboard", 200, 210, 1520, 630, "http://localhost:3000 (Live Artisan Bakery Dashboard)", zoom=zoom, pan_y=pan)

        # Highlight callout badge over Zero-Assumption Guardrail
        callout_alpha = min(1.0, max(0.0, (local_t - 2.0) * 2.0))
        if callout_alpha > 0:
            draw_rounded_rect(draw, (WIDTH - 580, 270, WIDTH - 240, 370), 10, (40, 25, 10), AMBER, 2)
            draw.text((WIDTH - 560, 288), "Zero-Assumption Guardrail", fill=AMBER, font=font_card_title)
            draw.text((WIDTH - 560, 325), "Missing recipe cost = Margin UNKNOWN", fill=WHITE, font=font_mono)

    # ==========================================================
    # SCENE 3 (24s to 35s): Grounded AI Morning Briefing
    # ==========================================================
    elif t < 35.0:
        local_t = t - 24.0
        draw_rounded_rect(draw, (WIDTH//2 - 190, 100, WIDTH//2 + 190, 132), 6, (45, 20, 10), ORANGE)
        draw.text((WIDTH//2 - 165, 106), "CHAPTER 3 // GROUNDED AI BRIEFING", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 440, 145), "Separating Observed Facts From Strategy", fill=WHITE, font=font_title)

        # Browser Mockup showing REAL Briefing Screenshot
        zoom = 1.0 + (local_t / 11.0) * 0.10
        pan = (local_t / 11.0) * 80
        draw_browser_mockup(img, draw, "briefing", 200, 210, 1520, 630, "http://localhost:3000/briefing (Grounded AI Morning Briefing)", zoom=zoom, pan_y=pan)

        # Highlight badge: Open-weight inference specs
        draw_rounded_rect(draw, (WIDTH - 600, 270, WIDTH - 240, 360), 10, (20, 35, 25), EMERALD, 2)
        draw.text((WIDTH - 580, 288), "Qwen 2.5 1.5B (Apache 2.0)", fill=EMERALD, font=font_card_title)
        draw.text((WIDTH - 580, 325), "Latency: 1,420 ms | Local CPU", fill=WHITE, font=font_mono)

    # ==========================================================
    # SCENE 4 (35s to 47s): Bilingual Marketing Studio
    # ==========================================================
    elif t < 47.0:
        local_t = t - 35.0
        draw_rounded_rect(draw, (WIDTH//2 - 200, 100, WIDTH//2 + 200, 132), 6, (45, 20, 10), ORANGE)
        draw.text((WIDTH//2 - 175, 106), "CHAPTER 4 // BILINGUAL MARKETING", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 430, 145), "English & Hindi Promotional Copy", fill=WHITE, font=font_title)

        # Browser Mockup showing REAL Marketing Studio Screenshot
        zoom = 1.0 + (local_t / 12.0) * 0.10
        pan = (local_t / 12.0) * 60
        draw_browser_mockup(img, draw, "marketing", 200, 210, 1520, 630, "http://localhost:3000/marketing (Bilingual Marketing Studio)", zoom=zoom, pan_y=pan)

        # Highlight pills
        draw_rounded_rect(draw, (240, 270, 560, 350), 10, (35, 20, 30), (244, 114, 182), 2)
        draw.text((260, 290), "Instagram Copy + Hashtags", fill=(244, 114, 182), font=font_card_title)
        draw.text((260, 322), "English artisan storytelling", fill=WHITE, font=font_mono)

        draw_rounded_rect(draw, (WIDTH - 580, 270, WIDTH - 240, 350), 10, (18, 35, 22), EMERALD, 2)
        draw.text((WIDTH - 560, 290), "WhatsApp Hindi Broadcast", fill=EMERALD, font=font_card_title)
        draw.text((WIDTH - 560, 322), "Devanagari script formatting", fill=WHITE, font=font_mono)

    # ==========================================================
    # SCENE 5 (47s to 62s): 100% On-Premise Privacy & Verified Tests
    # ==========================================================
    else:
        local_t = t - 47.0
        draw_rounded_rect(draw, (WIDTH//2 - 190, 100, WIDTH//2 + 190, 132), 6, (15, 35, 20), EMERALD)
        draw.text((WIDTH//2 - 165, 106), "CHAPTER 5 // 100% ON-PREMISE PRIVACY", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 410, 150), "Your Recipes. Your Revenue.", fill=WHITE, font=font_title)
        draw.text((WIDTH//2 - 340, 215), "100% On Your Hardware. Zero Token Fees.", fill=ORANGE, font=font_title)

        draw.text((WIDTH//2 - 430, 290), "Trade secrets and sales never leak to proprietary cloud LLM APIs.", fill=TEXT_MUTED, font=font_subtitle)

        # 3 Test Verification Badges
        badges = [
            ("28 / 28 Tests Passed", "Vitest TypeScript Suite", "Deterministic logic, margins, storage", EMERALD),
            ("7 / 7 Tests Passed", "Pytest FastAPI Suite", "Transformers pipeline, Hindi support", (59, 130, 246)),
            ("10 / 10 Scenarios", "Bakery Benchmark Suite", "Repeatable evaluation scenarios", ORANGE),
        ]
        badge_w = 460
        for i, (b_title, b_sub, b_desc, b_col) in enumerate(badges):
            bx = 200 + i * (badge_w + 35)
            by = 360
            draw_rounded_rect(draw, (bx, by, bx + badge_w, by + 160), 14, CARD_BG, b_col, 2)
            draw.text((bx + 25, by + 25), b_title, fill=b_col, font=font_card_title)
            draw.text((bx + 25, by + 68), b_sub, fill=WHITE, font=font_subtitle)
            draw.text((bx + 25, by + 112), b_desc, fill=TEXT_MUTED, font=font_card_text)

        # Live Settings Screenshot in browser mockup at bottom
        draw_browser_mockup(img, draw, "settings", 340, 560, 1240, 260, "http://localhost:3000/settings (Active Model Diagnostics)", zoom=1.1, pan_y=40)

        # Closing GitHub CTA
        draw_rounded_rect(draw, (WIDTH//2 - 280, 860, WIDTH//2 + 280, 925), 14, ORANGE, None)
        draw.text((WIDTH//2 - 240, 882), "Fork on GitHub | Hacktober Side Hustle Challenge", fill=WHITE, font=font_badge)

    # Subtitle ticker bar at bottom
    bar_y = HEIGHT - 85
    draw_rounded_rect(draw, (80, bar_y, WIDTH - 80, bar_y + 60), 8, (22, 19, 17), BORDER_COLOR)
    # Speaker indicator
    draw.text((105, bar_y + 18), "🎙️ NARRATION:", fill=AMBER, font=font_mono)
    draw.text((250, bar_y + 18), active_caption, fill=WHITE, font=font_caption)

    # Animated audio pulse dots
    dot_base_x = WIDTH - 180
    for d in range(5):
        h_dot = int(math.sin(t * 12.0 + d * 0.8) * 10) + 12
        draw.rectangle([dot_base_x + d * 14, bar_y + 30 - h_dot//2, dot_base_x + d * 14 + 6, bar_y + 30 + h_dot//2], fill=AMBER)

    # Progress bar at absolute bottom
    pct = t / DURATION_SEC
    draw.rectangle([0, HEIGHT - 6, int(WIDTH * pct), HEIGHT], fill=ORANGE)

    return np.array(img)

def generate_soundtrack():
    """Synthesizes lo-fi ambient backing track for DURATION_SEC."""
    sample_rate = 44100
    n_samples = int(sample_rate * DURATION_SEC)
    audio = np.zeros(n_samples, dtype=np.float32)

    chord_freqs = [
        [261.63, 329.63, 392.00], # C
        [196.00, 246.94, 293.66], # G
        [220.00, 261.63, 329.63], # Am
        [174.61, 220.00, 261.63], # F
    ]

    t_arr = np.linspace(0, DURATION_SEC, n_samples, endpoint=False)

    for i in range(n_samples):
        sec = t_arr[i]
        cycle = int((sec / 4.0) % 4)
        c_freqs = chord_freqs[cycle]

        sample = 0.0
        for f in c_freqs:
            sample += 0.03 * math.sin(2.0 * math.pi * f * sec)
            sample += 0.015 * math.sin(2.0 * math.pi * (f * 2.0) * sec)

        beat_t = sec % 1.0
        if beat_t < 0.15:
            kick = math.sin(2.0 * math.pi * (65.0 - beat_t * 180.0) * beat_t) * math.exp(-beat_t * 22.0)
            sample += kick * 0.06

        # Scene transitions whooshes
        for trans_t in [12.0, 24.0, 35.0, 47.0]:
            diff = sec - trans_t
            if 0 <= diff <= 0.4:
                whoosh_freq = 320.0 - diff * 450.0
                sample += 0.05 * math.sin(2.0 * math.pi * max(50.0, whoosh_freq) * diff) * (1.0 - diff / 0.4)

        # AI briefing chime at 25.0s
        diff_chime = sec - 25.0
        if 0 <= diff_chime <= 0.8:
            chime = math.sin(2.0 * math.pi * 587.33 * diff_chime) + math.sin(2.0 * math.pi * 880.0 * diff_chime)
            sample += chime * 0.07 * math.exp(-diff_chime * 4.0)

        audio[i] = sample

    audio = audio / (np.max(np.abs(audio)) + 1e-6)
    audio_int16 = (audio * 28000).astype(np.int16)

    with wave.open(TEMP_BGM, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int16.tobytes())

    print(f"[Soundtrack] Synthesized background music -> {TEMP_BGM}")

def mix_audio_with_narration():
    """Uses FFmpeg to delay and mix all 5 narration tracks with ducked BGM."""
    print("[Audio Mixer] Aligning narration clips and ducking background soundtrack...")

    # Build adelay filter string
    # Narration 1: 0.3s (300ms)
    # Narration 2: 12.4s (12400ms)
    # Narration 3: 24.4s (24400ms)
    # Narration 4: 35.4s (35400ms)
    # Narration 5: 47.4s (47400ms)
    filter_complex = (
        "[1:a]adelay=300|300,volume=1.3[n1];"
        "[2:a]adelay=12400|12400,volume=1.3[n2];"
        "[3:a]adelay=24400|24400,volume=1.3[n3];"
        "[4:a]adelay=35400|35400,volume=1.3[n4];"
        "[5:a]adelay=47400|47400,volume=1.3[n5];"
        "[n1][n2][n3][n4][n5]amix=inputs=5:dropout_transition=0:normalize=0[voice];"
        "[0:a]volume=0.22[bgm];"
        "[bgm][voice]amix=inputs=2:dropout_transition=0:normalize=0,afade=t=out:st=60.0:d=2.0[outa]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", TEMP_BGM,
        "-i", "narration_1.mp3",
        "-i", "narration_2.mp3",
        "-i", "narration_3.mp3",
        "-i", "narration_4.mp3",
        "-i", "narration_5.mp3",
        "-filter_complex", filter_complex,
        "-map", "[outa]",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(DURATION_SEC),
        TEMP_FINAL_AUDIO
    ]

    subprocess.check_call(cmd)
    print(f"[Audio Mixer] Final master audio track created: {TEMP_FINAL_AUDIO}")

def main():
    print(f"=== LOCALBIZ COPILOT VIDEO PRODUCTION ENGINE ===")
    print(f"Target: {DURATION_SEC}s, 1080p, 30fps ({TOTAL_FRAMES} frames)")
    print(f"Screenshots loaded: {list(SCREENSHOTS.keys())}")

    # 1. Render Video Frames
    print(f"\n[1/3] Rendering {TOTAL_FRAMES} high-definition video frames...")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(TEMP_SILENT_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

    for f in range(TOTAL_FRAMES):
        if f % 180 == 0:
            pct = (f / TOTAL_FRAMES) * 100
            print(f"  Frame {f}/{TOTAL_FRAMES} ({pct:.1f}%)...")
        frame_rgb = render_scene(f)
        frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        out.write(frame_bgr)

    out.release()
    print(f"[1/3 DONE] Silent video rendered to {TEMP_SILENT_VIDEO}")

    # 2. Synthesize & Mix Audio
    print(f"\n[2/3] Processing audio and voiceover narration...")
    generate_soundtrack()
    mix_audio_with_narration()

    # 3. Final Mux
    print(f"\n[3/3] Muxing video and audio into final broadcast MP4: {VIDEO_OUTPUT}...")
    cmd = [
        "ffmpeg", "-y",
        "-i", TEMP_SILENT_VIDEO,
        "-i", TEMP_FINAL_AUDIO,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-shortest",
        VIDEO_OUTPUT
    ]
    subprocess.check_call(cmd)

    # Cleanup temporary intermediates
    for temp_f in [TEMP_SILENT_VIDEO, TEMP_BGM, TEMP_FINAL_AUDIO]:
        if os.path.exists(temp_f):
            try:
                os.remove(temp_f)
            except Exception:
                pass

    print(f"\n=======================================================")
    print(f"[SUCCESS] Final Master Video Ready: {VIDEO_OUTPUT}")
    print(f"Duration: {DURATION_SEC}s | 1080p 30fps | Professional Voiceover & Demo Included")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
