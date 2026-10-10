"""Render sample job posters for the Jobs inbox demo with headless Edge.
All companies, emails and numbers are FICTIONAL. Styles vary on purpose (flyer, LinkedIn screenshot,
phone photo of a notice board, scam flyer) because that is what the team receives every day."""
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
TMP = HERE / "render"
SITE = Path(__file__).resolve().parent.parent  # the wireframe-research folder
OUT = SITE / "img" / "jobs" / "inbox"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
TMP.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

W, H = 720, 900
BASE = """<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0} body{width:%dpx;height:%dpx;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif}
ul{padding-left:22px} li{margin:4px 0}
</style></head><body>%s</body></html>"""

POSTERS = {
    # Clean, corporate flyer
    "savanna-accounts-assistant": """
<div style="height:100%;background:#0f5132;color:#fff;padding:48px;display:flex;flex-direction:column">
  <div style="display:flex;align-items:center;gap:14px"><div style="width:58px;height:58px;border-radius:50%;background:#ffc107;color:#0f5132;font:800 26px Arial;display:grid;place-items:center">SF</div>
  <div style="font:700 24px Arial">Savanna Fresh Foods Ltd</div></div>
  <div style="margin-top:46px;font:900 64px/1 Arial;color:#ffc107">WE'RE<br>HIRING!</div>
  <div style="margin-top:22px;font:700 36px Arial">Accounts Assistant</div>
  <div style="margin-top:6px;font-size:21px;opacity:.9">Industrial Area, Nairobi · Full-time</div>
  <div style="margin-top:28px;background:rgba(255,255,255,.1);border-radius:14px;padding:22px;font-size:19px;line-height:1.45">
    <b>Requirements</b><ul><li>Diploma/Degree in Accounting or Finance</li><li>CPA Part II and above</li><li>1–2 years' experience; QuickBooks an added advantage</li></ul>
    <b style="display:block;margin-top:10px">Duties</b><ul><li>Supplier &amp; bank reconciliations</li><li>Invoice processing and petty cash</li></ul></div>
  <div style="margin-top:auto;font-size:20px;line-height:1.5"><b style="color:#ffc107">HOW TO APPLY:</b> Send your CV &amp; cover letter to<br><b>careers@savannafresh.co.ke</b> by <b>7th October 2026</b></div>
</div>""",
    # Industrial flyer, apply via link
    "mavuno-warehouse-supervisor": """
<div style="height:100%;background:#f4f4f4;padding:0;display:flex;flex-direction:column">
  <div style="background:#e65100;color:#fff;padding:36px 44px"><div style="font:800 22px Arial;letter-spacing:.2em">MAVUNO LOGISTICS</div>
  <div style="font:900 54px/1.05 Arial;margin-top:18px">WAREHOUSE<br>SUPERVISORS (3)</div></div>
  <div style="padding:34px 44px;font-size:20px;line-height:1.5;color:#222;flex:1">
    <p><b>Location:</b> Athi River &nbsp;|&nbsp; <b>Shifts:</b> Day &amp; Night</p>
    <p style="margin-top:18px"><b>You will:</b></p><ul><li>Supervise receiving, picking and dispatch</li><li>Lead teams of 15–25 casuals</li><li>Keep stock records accurate on the WMS</li></ul>
    <p style="margin-top:18px"><b>You have:</b></p><ul><li>Diploma in Logistics / Supply Chain</li><li>3+ years warehouse experience, 1 as supervisor</li><li>Forklift certificate is a plus</li></ul>
  </div>
  <div style="background:#212121;color:#fff;padding:28px 44px;font-size:20px">Apply online: <b style="color:#ffab40">mavunologistics.co.ke/careers</b><br>Closing date: <b>11 October 2026</b></div>
</div>""",
    # Medical, white & blue
    "imani-clinical-officers": """
<div style="height:100%;background:#fff;border:14px solid #1565c0;padding:40px;display:flex;flex-direction:column;color:#0d2a4a">
  <div style="font:800 30px Georgia">Imani Medical Centre</div><div style="font-size:17px;color:#1565c0">Caring for Kisumu since 2009</div>
  <div style="margin-top:36px;font:800 26px Arial;color:#1565c0;letter-spacing:.12em">VACANCY</div>
  <div style="font:900 50px/1.05 Arial;margin-top:6px">Clinical Officers (2)</div>
  <div style="margin-top:24px;font-size:20px;line-height:1.5">
    <ul><li>Diploma in Clinical Medicine &amp; Surgery</li><li>Registered with the Clinical Officers Council, valid practising licence</li><li>At least 2 years in outpatient / casualty</li><li>Willing to work night shifts</li></ul></div>
  <div style="margin-top:auto;background:#e3f2fd;border-radius:12px;padding:22px;font-size:20px;line-height:1.5">
    Email your application, CV and copies of certificates to <b>hr@imanimedical.co.ke</b><br>quoting <b>"CO-2026"</b> on the subject line.<br>Deadline: <b>5/10/2026</b></div>
</div>""",
    # Scam flyer: payment, huge pay, personal number
    "scam-airport-jobs": """
<div style="height:100%;background:#ffeb3b;padding:34px;display:flex;flex-direction:column;align-items:center;text-align:center;color:#b71c1c">
  <div style="font:900 60px/1 Impact,Arial">URGENT!!!</div>
  <div style="font:900 40px/1.1 Impact,Arial;color:#000;margin-top:14px">AIRPORT JOBS 2026</div>
  <div style="font:700 26px Arial;margin-top:22px;color:#000">Cleaners • Drivers • Loaders • Cashiers<br>Customer Care • Security</div>
  <div style="margin-top:26px;background:#d50000;color:#fff;font:900 44px Impact,Arial;padding:16px 26px;border-radius:12px">SALARY KES 85,000</div>
  <div style="font:700 24px Arial;color:#000;margin-top:20px">NO EXPERIENCE NEEDED!! 300 SLOTS ONLY</div>
  <div style="margin-top:auto;font:700 23px/1.45 Arial;color:#000">Pay registration fee of <u>KES 1,500</u> via M-Pesa<br>to <b>0700 000 000 (Mr. James)</b><br>then send your name &amp; ID on WhatsApp.<br><span style="color:#b71c1c">Interviews this week. Hurry!</span></div>
</div>""",
    # LinkedIn-style screenshot, no deadline
    "kazi-social-media-manager": """
<div style="height:100%;background:#f3f2ef;padding:30px">
  <div style="background:#fff;border-radius:10px;border:1px solid #ddd;padding:24px;font-size:19px;line-height:1.5;color:#1d1d1d">
    <div style="display:flex;gap:12px;align-items:center"><div style="width:56px;height:56px;border-radius:50%;background:#5e35b1;color:#fff;display:grid;place-items:center;font:700 22px Arial">KD</div>
    <div><b>Wanjiru K.</b> · 2nd<div style="font-size:15px;color:#666">Head of Growth at Kazi Digital · 3h · 🌐</div></div></div>
    <p style="margin-top:18px">We're growing! 🚀 Kazi Digital is hiring a <b>Social Media Manager</b> to own our brand voice across Instagram, TikTok, X and LinkedIn.</p>
    <p style="margin-top:12px">📍 Westlands, Nairobi (hybrid: 3 days in office)</p>
    <p style="margin-top:12px">What we're looking for:<br>✅ 3+ years running brand social accounts<br>✅ Strong copywriting + basic Canva/CapCut<br>✅ Comfortable with Meta Ads and monthly reporting<br>✅ A portfolio of campaigns you've led</p>
    <p style="margin-top:12px">Send your CV + portfolio link to <span style="color:#0a66c2">jobs@kazidigital.co.ke</span> with the subject "SMM". Please share with your network 🙏</p>
    <p style="margin-top:12px;color:#0a66c2">#hiring #socialmedia #nairobijobs #marketing</p>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;color:#666;font-size:16px">👍❤️ 214 · 37 comments · 58 reposts</div>
  </div>
</div>""",
    # Phone photo of a printed notice (slightly blurred, tilted)
    "tumaini-teacher": """
<div style="height:100%;background:#6d5d4b;display:grid;place-items:center">
  <div style="width:600px;height:800px;background:#fbfaf3;transform:rotate(-2.5deg);filter:blur(.9px) contrast(.92);box-shadow:0 18px 40px rgba(0,0,0,.45);padding:46px;font-family:'Times New Roman',serif;color:#222">
    <div style="text-align:center;font:700 30px 'Times New Roman'">TUMAINI ACADEMY, NAKURU</div>
    <div style="text-align:center;font-size:18px;margin-top:4px">P.O. Box 0000 – 20100, Nakuru</div>
    <hr style="margin:18px 0;border:0;border-top:2px solid #222">
    <div style="text-align:center;font:700 26px 'Times New Roman';text-decoration:underline">TEACHING VACANCY</div>
    <p style="margin-top:22px;font-size:20px;line-height:1.55">The Board of Management invites applications for the position of <b>Teacher – Mathematics/Physics</b> (1 post) to start in January 2027.</p>
    <p style="margin-top:14px;font-size:20px"><b>Requirements:</b></p>
    <ul style="font-size:20px;line-height:1.5"><li>B.Ed (Science) Mathematics/Physics</li><li>Registered with TSC</li><li>Experience with CBC is an added advantage</li></ul>
    <p style="margin-top:14px;font-size:20px;line-height:1.55">Hand-deliver your application letter, CV and certificates to the school office (Mon–Fri, 8am–4pm) on or before <b style="filter:blur(1.6px)">13th Oct 2026</b>.</p>
    <p style="margin-top:26px;font-size:18px;text-align:right">PRINCIPAL</p>
  </div>
</div>""",
    # Bank interns, apply via link
    "bahari-customer-service-interns": """
<div style="height:100%;background:linear-gradient(160deg,#00363a,#006064);color:#fff;padding:46px;display:flex;flex-direction:column">
  <div style="font:700 26px Georgia;letter-spacing:.05em">Bahari Microfinance Bank</div>
  <div style="margin-top:56px;font:300 30px Arial;opacity:.85">Graduate Internship Programme</div>
  <div style="font:800 54px/1.05 Arial;margin-top:8px">Customer Service<br>Interns (10)</div>
  <div style="margin-top:18px;font-size:21px;opacity:.9">Mombasa · Malindi · Kilifi · 6 months, monthly stipend</div>
  <ul style="margin-top:26px;font-size:20px;line-height:1.55"><li>Graduated in 2024–2026 with a Business or related degree</li><li>Excellent spoken English and Kiswahili</li><li>Computer literate; customer-focused</li></ul>
  <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.35);padding-top:20px;font-size:20px;line-height:1.5">Apply at <b>baharibank.co.ke/internships</b><br>Applications close <b>4 October 2026</b></div>
</div>""",
}


def render(html, out):
    src = TMP / (out.stem + ".html")
    src.write_text(BASE % (W, H, html), encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={W},{H}",
                    "--force-device-scale-factor=1", "--virtual-time-budget=2000",
                    f"--screenshot={out}", src.as_uri()], capture_output=True, timeout=60)
    print(out.name, out.stat().st_size // 1024, "KB")


for slug, html in POSTERS.items():
    png = OUT / f"{slug}.png"
    render(html, png)
    # JPEG keeps the files small (posters arrive as photos/screenshots anyway)
    try:
        from PIL import Image
        Image.open(png).convert("RGB").save(OUT / f"{slug}.jpeg", quality=82)
        png.unlink()
    except ImportError:
        pass
