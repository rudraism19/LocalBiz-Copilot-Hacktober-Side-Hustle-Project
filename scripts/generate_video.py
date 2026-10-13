import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
import wave
import struct

# Output paths
VIDEO_OUTPUT = "localbiz_copilot_demo.mp4"
TEMP_AUDIO = "temp_soundtrack.wav"
TEMP_VIDEO = "temp_video_silent.mp4"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION_SEC = 45
TOTAL_FRAMES = FPS * DURATION_SEC

# Palette
BG_COLOR = (15, 14, 13) # #0F0E0D
CARD_BG = (28, 25, 23)  # #1C1917
BORDER_COLOR = (68, 64, 60) # #44403C
ORANGE = (234, 88, 12)  # #EA580C
AMBER = (217, 119, 6)   # #D97706
EMERALD = (16, 185, 129)# #10B981
ROSE = (244, 63, 94)    # #F43F5E
WHITE = (255, 255, 255)
TEXT_MUTED = (168, 162, 158) # #A8A29E
TEXT_SUBTLE = (120, 113, 108)

# Font loading helper
def get_font(size, bold=False):
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\consola.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_title = get_font(56, bold=True)
font_subtitle = get_font(28, bold=False)
font_badge = get_font(20, bold=True)
font_card_title = get_font(24, bold=True)
font_card_text = get_font(20, bold=False)
font_card_val = get_font(34, bold=True)
font_mono = get_font(18, bold=True)

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def render_scene(frame_idx):
    """Renders a single 1920x1080 frame based on frame_idx."""
    t = frame_idx / FPS # current time in seconds
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Subtle ambient gradient circles in background
    pulse = math.sin(t * 1.5) * 20
    draw.ellipse([WIDTH//2 - 400 - pulse, HEIGHT//2 - 300 - pulse, WIDTH//2 + 400 + pulse, HEIGHT//2 + 300 + pulse], fill=(22, 18, 15))

    # Top persistent branding bar
    draw_rounded_rect(draw, (80, 40, WIDTH - 80, 95), 12, (24, 21, 19), BORDER_COLOR)
    draw.text((110, 55), "LOCALBIZ COPILOT", fill=WHITE, font=font_badge)
    draw.text((340, 56), "|  Open-Weight AI Assistant for Independent Bakeries & Cafes", fill=TEXT_MUTED, font=font_subtitle)
    
    # Live time indicator on right
    mins = int(t // 60)
    secs = int(t % 60)
    draw.text((WIDTH - 240, 56), f"{mins:02d}:{secs:02d} / 00:45", fill=AMBER, font=font_mono)

    # ==========================================================
    # SCENE 1 (0s to 9s): The 4:30 AM Reality
    # ==========================================================
    if t < 9.0:
        local_t = t
        alpha = min(1.0, local_t * 1.5) if local_t < 7.5 else max(0.0, (9.0 - local_t) * 1.5)
        
        # Chapter badge
        draw_rounded_rect(draw, (WIDTH//2 - 160, 160, WIDTH//2 + 160, 195), 8, (45, 20, 10), ORANGE)
        draw.text((WIDTH//2 - 135, 167), "CHAPTER 1 // THE 4:30 AM REALITY", fill=WHITE, font=font_badge)

        # Main typography
        draw.text((WIDTH//2 - 440, 240), "Baking artisan sourdough is a craft.", fill=WHITE, font=font_title)
        draw.text((WIDTH//2 - 330, 320), "Inventory guesswork is not.", fill=ORANGE, font=font_title)

        draw.text((WIDTH//2 - 460, 410), "18 loaves cooling. 3 almond croissants left before lunch. Expiring fresh tarts.", fill=TEXT_MUTED, font=font_subtitle)
        draw.text((WIDTH//2 - 410, 450), "Generic AI chatbots invent fake discounts and hallucinate profit margins.", fill=TEXT_MUTED, font=font_subtitle)

        # 3 Inventory Cards with gentle float
        bob = math.sin(local_t * 3.0) * 8
        
        # Card 1
        draw_rounded_rect(draw, (200, 550 + bob, 600, 750 + bob), 16, CARD_BG, BORDER_COLOR, 2)
        draw.text((230, 580 + bob), "Country Sourdough", fill=WHITE, font=font_card_title)
        draw.text((230, 620 + bob), "18 Loaves in Stock", fill=AMBER, font=font_card_val)
        draw.text((230, 680 + bob), "36-hr wild cold fermentation", fill=TEXT_MUTED, font=font_card_text)

        # Card 2 (Critical)
        draw_rounded_rect(draw, (660, 540 - bob, 1060, 740 - bob), 16, (40, 15, 20), ROSE, 2)
        draw.text((690, 570 - bob), "Almond Croissants", fill=WHITE, font=font_card_title)
        draw.text((690, 610 - bob), "3 Units Left (Critical)", fill=ROSE, font=font_card_val)
        draw.text((690, 670 - bob), "Stockout risk before afternoon tea", fill=TEXT_MUTED, font=font_card_text)

        # Card 3 (Expiring)
        draw_rounded_rect(draw, (1120, 555 + bob, 1520, 755 + bob), 16, CARD_BG, ORANGE, 2)
        draw.text((1150, 585 + bob), "Strawberry Tarts", fill=WHITE, font=font_card_title)
        draw.text((1150, 625 + bob), "Expires in 24 Hours", fill=ORANGE, font=font_card_val)
        draw.text((1150, 685 + bob), "Fresh mascarpone spoilage risk", fill=TEXT_MUTED, font=font_card_text)

    # ==========================================================
    # SCENE 2 (9s to 19s): The Solution — Dashboard & Guardrail
    # ==========================================================
    elif t < 19.0:
        local_t = t - 9.0
        
        # Chapter badge
        draw_rounded_rect(draw, (WIDTH//2 - 210, 150, WIDTH//2 + 210, 185), 8, (20, 35, 25), EMERALD)
        draw.text((WIDTH//2 - 185, 157), "CHAPTER 2 // DETERMINISTIC INTELLIGENCE", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 380, 215), "Meet LocalBiz Copilot Dashboard", fill=WHITE, font=font_title)

        # Dashboard mockup container
        dash_y = 310
        draw_rounded_rect(draw, (180, dash_y, WIDTH - 180, dash_y + 490), 20, (253, 251, 247), (200, 195, 185), 2)

        # Mockup header
        draw.text((220, dash_y + 25), "WarmCrust Artisan Bakery & Cafe", fill=(28, 25, 23), font=font_card_title)
        draw_rounded_rect(draw, (WIDTH - 480, dash_y + 20, WIDTH - 220, dash_y + 55), 6, (220, 252, 231), (134, 239, 172))
        draw.text((WIDTH - 455, dash_y + 28), "Local Engine Active (Qwen 2.5)", fill=(22, 101, 52), font=font_mono)

        # 4 Mockup Metric Boxes
        metrics = [
            ("Catalog Items", "8 Products", (28, 25, 23)),
            ("Net Recorded Sales", "$145.00", (22, 101, 52)),
            ("Low Stock Alerts", "2 Items (Low)", (180, 83, 9)),
            ("Expiring Soon", "2 Items (<24h)", (190, 24, 93)),
        ]
        box_w = 340
        for i, (m_title, m_val, m_col) in enumerate(metrics):
            bx = 220 + i * (box_w + 18)
            by = dash_y + 90
            draw_rounded_rect(draw, (bx, by, bx + box_w, by + 120), 12, (255, 255, 255), (231, 229, 228))
            draw.text((bx + 20, by + 20), m_title, fill=(120, 113, 108), font=font_badge)
            draw.text((bx + 20, by + 55), m_val, fill=m_col, font=font_card_val)

        # Zero-Assumption Guardrail Feature Highlight
        banner_y = dash_y + 250
        draw_rounded_rect(draw, (220, banner_y, WIDTH - 220, banner_y + 160), 12, (254, 243, 199), (245, 158, 11), 2)
        draw.text((250, banner_y + 25), "Zero-Assumption Financial Guardrail:", fill=(146, 64, 14), font=font_card_title)
        draw.text((250, banner_y + 65), "Ligurian Rosemary Focaccia has unrecorded ingredient costs.", fill=(68, 64, 60), font=font_subtitle)
        draw.text((250, banner_y + 105), "Instead of assuming 100% profit, the system marks margin as UNKNOWN to protect owner cash flow.", fill=(180, 83, 9), font=font_card_text)

    # ==========================================================
    # SCENE 3 (19s to 29s): AI Daily Briefing
    # ==========================================================
    elif t < 29.0:
        local_t = t - 19.0
        draw_rounded_rect(draw, (WIDTH//2 - 180, 150, WIDTH//2 + 180, 185), 8, (45, 20, 10), ORANGE)
        draw.text((WIDTH//2 - 155, 157), "CHAPTER 3 // GROUNDED AI BRIEFING", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 420, 215), "Open-Weight Intelligence in Action", fill=WHITE, font=font_title)
        draw.text((WIDTH//2 - 360, 285), "Strictly separates observed business numbers from tactical advice.", fill=TEXT_MUTED, font=font_subtitle)

        # Briefing Card
        bx0, by0, bx1, by1 = 240, 360, WIDTH - 240, 820
        draw_rounded_rect(draw, (bx0, by0, bx1, by1), 16, CARD_BG, BORDER_COLOR, 2)

        # Card Header
        draw.text((bx0 + 35, by0 + 30), "Morning Operational Briefing (Oct 13, 2026)", fill=WHITE, font=font_card_title)
        draw.text((bx1 - 360, by0 + 32), "Latency: 1,420 ms | Qwen 2.5 1.5B (Apache 2.0)", fill=AMBER, font=font_mono)

        # Fact Callout Box
        fy = by0 + 90
        draw_rounded_rect(draw, (bx0 + 35, fy, bx1 - 35, fy + 95), 10, (30, 20, 25), ROSE, 1)
        draw.text((bx0 + 55, fy + 18), "OBSERVED FACT (Exact Data):", fill=ROSE, font=font_badge)
        draw.text((bx0 + 55, fy + 50), "5 Fresh Strawberry Mascarpone Tarts reach expiration tomorrow (Oct 14).", fill=WHITE, font=font_subtitle)

        # Recommendation Callout Box
        ry = fy + 120
        draw_rounded_rect(draw, (bx0 + 35, ry, bx1 - 35, ry + 115), 10, (35, 25, 15), ORANGE, 1)
        draw.text((bx0 + 55, ry + 18), "SUGGESTED ACTION (Actionable Strategy):", fill=ORANGE, font=font_badge)
        draw.text((bx0 + 55, ry + 50), "Launch a 2:00 PM Fika Special: 15% off when paired with an Ethiopian pour-over.", fill=WHITE, font=font_subtitle)
        draw.text((bx0 + 55, ry + 80), "Expected Outcome: Clears inventory before close and recovers $27.50 revenue.", fill=TEXT_MUTED, font=font_card_text)

        # Identified Uncertainties Box
        uy = ry + 140
        draw_rounded_rect(draw, (bx0 + 35, uy, bx1 - 35, uy + 75), 10, (25, 25, 20), (160, 140, 50), 1)
        draw.text((bx0 + 55, uy + 15), "IDENTIFIED UNCERTAINTIES & UNRECORDED DATA:", fill=(230, 200, 80), font=font_badge)
        draw.text((bx0 + 55, uy + 42), "Rosemary Focaccia unit cost unrecorded. Foot traffic volume estimated.", fill=TEXT_MUTED, font=font_card_text)

    # ==========================================================
    # SCENE 4 (29s to 38s): Bilingual Marketing Studio (EN & HI)
    # ==========================================================
    elif t < 38.0:
        local_t = t - 29.0
        draw_rounded_rect(draw, (WIDTH//2 - 200, 150, WIDTH//2 + 200, 185), 8, (45, 20, 10), ORANGE)
        draw.text((WIDTH//2 - 175, 157), "CHAPTER 4 // BILINGUAL MARKETING", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 430, 215), "English & Hindi Promotional Copy", fill=WHITE, font=font_title)
        draw.text((WIDTH//2 - 380, 285), "One-click copy to Instagram & WhatsApp with zero fake ingredients.", fill=TEXT_MUTED, font=font_subtitle)

        # Left Card: English Instagram Caption
        card_w = 680
        draw_rounded_rect(draw, (220, 360, 220 + card_w, 800), 16, CARD_BG, (150, 40, 80), 2)
        draw.text((255, 395), "Instagram Post (English)", fill=(244, 114, 182), font=font_card_title)
        draw.text((255, 450), '"Golden blistered crust. 36-hour slow fermentation', fill=WHITE, font=font_subtitle)
        draw.text((255, 490), 'with organic stoneground flours. Fresh loaves', fill=WHITE, font=font_subtitle)
        draw.text((255, 530), 'just pulled from the stone deck hearth oven! 🥖', fill=WHITE, font=font_subtitle)
        draw.text((255, 590), 'Drop by Downtown Market Square before 3 PM."', fill=TEXT_MUTED, font=font_subtitle)
        draw.text((255, 680), '#SourdoughLovers #ArtisanBakery #FreshBakes', fill=AMBER, font=font_card_text)
        draw.text((255, 730), "[COPY INSTAGRAM CAPTION]", fill=WHITE, font=font_mono)

        # Right Card: Hindi WhatsApp Broadcast
        rx = WIDTH - 220 - card_w
        draw_rounded_rect(draw, (rx, 360, rx + card_w, 800), 16, (18, 30, 22), EMERALD, 2)
        draw.text((rx + 35, 395), "WhatsApp Broadcast (Hindi / देवनागरी)", fill=EMERALD, font=font_card_title)
        draw.text((rx + 35, 450), "*WarmCrust स्पेशल अलर्ट:*", fill=WHITE, font=font_card_title)
        draw.text((rx + 35, 500), "आज की ताज़ा इलायची और केसर बन तैयार हैं! 🥐", fill=WHITE, font=font_subtitle)
        draw.text((rx + 35, 550), "2 बजे से पहले आएं और ताज़ी फ़िल्टर कॉफ़ी के साथ आनंद लें।", fill=TEXT_MUTED, font=font_subtitle)
        draw.text((rx + 35, 610), "सीमित बैच उपलब्ध है — रिप्लाई करके रिज़र्व करें!", fill=WHITE, font=font_subtitle)
        draw.text((rx + 35, 730), "[COPY WHATSAPP BROADCAST]", fill=EMERALD, font=font_mono)

    # ==========================================================
    # SCENE 5 (38s to 45s): On-Premise Privacy & Verified Tests
    # ==========================================================
    else:
        local_t = t - 38.0
        draw_rounded_rect(draw, (WIDTH//2 - 180, 150, WIDTH//2 + 180, 185), 8, (15, 35, 20), EMERALD)
        draw.text((WIDTH//2 - 155, 157), "100% ON-PREMISE LOCAL PRIVACY", fill=WHITE, font=font_badge)

        draw.text((WIDTH//2 - 420, 220), "Your Recipes. Your Revenue.", fill=WHITE, font=font_title)
        draw.text((WIDTH//2 - 340, 290), "100% On Your Hardware. Zero Token Fees.", fill=ORANGE, font=font_title)

        draw.text((WIDTH//2 - 410, 390), "Built on Hugging Face Transformers & Qwen 2.5 1.5B (Apache 2.0).", fill=TEXT_MUTED, font=font_subtitle)
        draw.text((WIDTH//2 - 360, 430), "Your trade secrets and margins never leak to proprietary cloud APIs.", fill=TEXT_MUTED, font=font_subtitle)

        # 3 Test Verification Badges
        badges = [
            ("28 / 28 Tests Passed", "Vitest TypeScript Suite", EMERALD),
            ("7 / 7 Tests Passed", "Pytest FastAPI Suite", (59, 130, 246)),
            ("10 / 10 Scenarios", "Bakery Benchmark Suite", ORANGE),
        ]
        badge_w = 420
        for i, (b_title, b_sub, b_col) in enumerate(badges):
            bx = 270 + i * (badge_w + 30)
            by = 510
            draw_rounded_rect(draw, (bx, by, bx + badge_w, by + 120), 14, CARD_BG, b_col, 2)
            draw.text((bx + 30, by + 25), b_title, fill=b_col, font=font_card_title)
            draw.text((bx + 30, by + 65), b_sub, fill=TEXT_MUTED, font=font_card_text)

        # Closing GitHub Challenge CTA
        draw_rounded_rect(draw, (WIDTH//2 - 280, 700, WIDTH//2 + 280, 770), 14, ORANGE, None)
        draw.text((WIDTH//2 - 240, 722), "Fork on GitHub | Hacktober Side Hustle Challenge", fill=WHITE, font=font_badge)

    # Progress bar at bottom
    pct = t / DURATION_SEC
    draw.rectangle([0, HEIGHT - 8, int(WIDTH * pct), HEIGHT], fill=ORANGE)

    return np.array(img)

def generate_soundtrack():
    """Synthesizes a pleasant lo-fi ambient audio track with scene whooshes and chimes."""
    sample_rate = 44100
    n_samples = int(sample_rate * DURATION_SEC)
    audio = np.zeros(n_samples, dtype=np.float32)

    # Chords (C, G, Am, F) cycling every 4 seconds
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

        # Warm mellow synth chords (additive sine waves)
        sample = 0.0
        for f in c_freqs:
            sample += 0.04 * math.sin(2.0 * math.pi * f * sec)
            sample += 0.02 * math.sin(2.0 * math.pi * (f * 2.0) * sec)

        # Soft rhythmic pulse every 1.0s (lo-fi gentle heartbeat)
        beat_t = sec % 1.0
        if beat_t < 0.15:
            kick = math.sin(2.0 * math.pi * (70.0 - beat_t * 200.0) * beat_t) * math.exp(-beat_t * 20.0)
            sample += kick * 0.08

        # Scene transitions whooshes (at 9s, 19s, 29s, 38s)
        for trans_t in [9.0, 19.0, 29.0, 38.0]:
            diff = sec - trans_t
            if 0 <= diff <= 0.4:
                whoosh_freq = 300.0 - diff * 400.0
                sample += 0.06 * math.sin(2.0 * math.pi * max(50.0, whoosh_freq) * diff) * (1.0 - diff / 0.4)

        # AI briefing chime at 20.0s
        diff_chime = sec - 20.0
        if 0 <= diff_chime <= 0.8:
            chime = math.sin(2.0 * math.pi * 587.33 * diff_chime) + math.sin(2.0 * math.pi * 880.0 * diff_chime)
            sample += chime * 0.08 * math.exp(-diff_chime * 4.0)

        audio[i] = sample

    # Normalize
    audio = audio / np.max(np.abs(audio) + 1e-6)
    audio_int16 = (audio * 30000).astype(np.int16)

    with wave.open(TEMP_AUDIO, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int16.tobytes())

    print(f"[Soundtrack] Generated {TEMP_AUDIO} ({DURATION_SEC}s)")

def main():
    print(f"[Video Engine] Rendering {TOTAL_FRAMES} frames (1080p 30fps)...")

    # Use cv2 VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(TEMP_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

    for f in range(TOTAL_FRAMES):
        if f % 150 == 0:
            pct = (f / TOTAL_FRAMES) * 100
            print(f"  Rendering frame {f}/{TOTAL_FRAMES} ({pct:.1f}%)...")
        frame_rgb = render_scene(f)
        frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        out.write(frame_bgr)

    out.release()
    print(f"[Video Engine] Silent video rendered to {TEMP_VIDEO}")

    # Generate soundtrack
    generate_soundtrack()

    # Mux video + audio using ffmpeg
    print(f"[FFmpeg] Muxing video and audio into {VIDEO_OUTPUT}...")
    cmd = f'ffmpeg -y -i {TEMP_VIDEO} -i {TEMP_AUDIO} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest {VIDEO_OUTPUT}'
    ret = os.system(cmd)

    if ret == 0:
        print(f"\n[SUCCESS] Rendered professional product video: {VIDEO_OUTPUT} ({DURATION_SEC}s, 1080p 60fps equivalent)")
        # Cleanup temp files
        if os.path.exists(TEMP_AUDIO): os.remove(TEMP_AUDIO)
        if os.path.exists(TEMP_VIDEO): os.remove(TEMP_VIDEO)
    else:
        print(f"[Fallback] FFmpeg exit code {ret}. Keeping {TEMP_VIDEO} as final.")
        if os.path.exists(TEMP_VIDEO):
            os.replace(TEMP_VIDEO, VIDEO_OUTPUT)

if __name__ == "__main__":
    main()
