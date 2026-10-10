"""Render sample CV images (before/after) and a company profile mock-up with headless Edge."""
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
TMP = HERE / "render"
SITE = Path(__file__).resolve().parent.parent  # the wireframe-research folder
OUT = SITE / "img" / "samples"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
TMP.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

# Sample content: fictional, with personal details redacted on the images
ROLES = {
    "accountant": dict(
        title="Accountant", sector="Finance",
        summary="CPA(K) accountant with 3 years' experience in audit and financial reporting for SMEs. Known for cutting month-end close time and tightening internal controls.",
        wins=["Reduced month-end close from 10 to 6 days", "Recovered KES 2.4M in unreconciled supplier payments", "Led migration of 3 clients to QuickBooks Online"],
        jobs=[("Assistant Accountant", "Audit & Advisory Firm, Nairobi", "2023 – Present", ["Prepare monthly management accounts for 12 SME clients", "Perform bank and supplier reconciliations across 5 currencies", "Support statutory audits and KRA tax compliance"]),
              ("Accounts Intern", "Manufacturing Company, Thika", "2022 – 2023", ["Processed 300+ invoices monthly with 99% accuracy", "Assisted with payroll for 80 staff"])],
        skills=["IFRS", "QuickBooks", "Sage", "Excel (Advanced)", "iTax", "Audit"],
        edu=[("CPA (K)", "KASNEB, 2022"), ("BCom, Accounting", "University of Nairobi, 2021")],
        duties=["Doing bank reconciliations", "Preparing accounts", "Filing documents", "Any other duties assigned by supervisor"]),
    "project-manager": dict(
        title="Project Manager", sector="NGO & Development",
        summary="PMP-certified project manager with 7 years delivering donor-funded health and livelihood programmes across 6 counties, managing budgets up to USD 1.2M.",
        wins=["Delivered USD 1.2M USAID programme on time and 4% under budget", "Scaled community health outreach to 40,000 households", "Built M&E dashboards adopted organisation-wide"],
        jobs=[("Project Manager", "International NGO, Kisumu", "2021 – Present", ["Lead a team of 18 across 3 field offices", "Manage donor reporting for USAID and FCDO grants", "Coordinate with county health departments"]),
              ("Project Officer", "Local NGO, Nairobi", "2018 – 2021", ["Designed livelihood training reaching 2,500 youth", "Wrote 4 successful funding proposals"])],
        skills=["PMP", "Grant management", "M&E", "Budgeting", "KoboToolbox", "Stakeholder engagement"],
        edu=[("MA, Project Planning", "University of Nairobi, 2019"), ("BA, Sociology", "Maseno University, 2016")],
        duties=["Managing projects", "Writing reports", "Attending meetings", "Supervising staff"]),
    "nurse": dict(
        title="Registered Nurse", sector="Healthcare · UK application",
        summary="NMC-registered nurse with 5 years' acute care experience in medical and surgical wards. OSCE-passed and ready to join an NHS trust.",
        wins=["Passed NMC OSCE on first attempt", "Cut ward medication errors by 30% through a double-check protocol", "Mentored 12 student nurses"],
        jobs=[("Registered Nurse", "Level 5 Hospital, Nakuru", "2020 – Present", ["Deliver care to 25-bed medical ward patients", "Administer IV therapy and wound management", "Lead handovers for a team of 8 nurses"]),
              ("Staff Nurse", "Mission Hospital, Kiambu", "2019 – 2020", ["Rotated across maternity, surgical and outpatient units"])],
        skills=["Acute care", "IV therapy", "Wound care", "Patient safety", "EMR systems", "Mentoring"],
        edu=[("BSc Nursing", "Moi University, 2019"), ("NMC Registration", "UK, 2025")],
        duties=["Taking care of patients", "Giving medicine", "Working in wards", "Hardworking and honest"]),
    "software-developer": dict(
        title="Software Developer", sector="Tech",
        summary="Full-stack developer with 3 years building web and mobile products for fintech. Strong in React, Node.js and M-Pesa integrations.",
        wins=["Built M-Pesa checkout used by 50,000+ customers", "Cut API response times by 60%", "Shipped 4 production apps end-to-end"],
        jobs=[("Software Developer", "Fintech Startup, Nairobi", "2023 – Present", ["Develop React and Node.js features for a lending app", "Integrate Daraja (M-Pesa) APIs", "Mentor 2 junior developers"]),
              ("Junior Developer", "Software Agency, Nairobi", "2022 – 2023", ["Built client websites and dashboards"])],
        skills=["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Daraja API"],
        edu=[("BSc Computer Science", "JKUAT, 2021")],
        duties=["Coding", "Fixing bugs", "Computer packages: MS Word, Excel, Internet"]),
    "business-graduate": dict(
        title="Business Graduate", sector="Graduate",
        summary="First-class business graduate with internship experience in marketing and sales. Confident communicator, eager to join a graduate trainee programme.",
        wins=["First Class Honours, BCom Marketing", "Grew internship client's Instagram by 3,000 followers", "Chair, university Enactus team"],
        jobs=[("Marketing Intern", "FMCG Distributor, Nairobi", "2025", ["Supported product launch across 40 retail outlets", "Analysed sales data for weekly reports"]),
              ("Sales Associate (Part-time)", "Retail Store, Nairobi", "2023 – 2024", ["Consistently exceeded monthly sales targets"])],
        skills=["Market research", "Excel", "Canva", "Social media", "Presentation", "Teamwork"],
        edu=[("BCom, Marketing", "Strathmore University, 2025"), ("KCSE: A-", "Alliance Girls, 2020")],
        duties=["Hobbies: reading, travelling, music", "Objective: to get a job", "Referees available on request"]),
    "clinical-officer": dict(
        title="Clinical Officer", sector="Healthcare",
        summary="Clinical officer with 4 years in outpatient and emergency care, experienced in HIV management and community health programmes.",
        wins=["Managed 60+ outpatient consultations daily", "Improved ART adherence in clinic cohort to 94%", "Trained 20 community health volunteers"],
        jobs=[("Clinical Officer", "County Hospital, Machakos", "2021 – Present", ["Diagnose and treat outpatients and emergencies", "Lead the comprehensive care clinic", "Supervise 4 nurses and interns"]),
              ("Clinical Officer Intern", "Sub-County Hospital", "2020 – 2021", ["Rotated through paediatrics, surgery and OB/GYN"])],
        skills=["Emergency care", "HIV/ART", "Diagnostics", "Community health", "DHIS2", "Minor surgery"],
        edu=[("Diploma, Clinical Medicine", "KMTC, 2020")],
        duties=["Treating patients", "Working in OPD", "Other duties as assigned"]),
    "finance-manager": dict(
        title="Finance Manager", sector="Finance · Senior",
        summary="CPA and ACCA finance leader with 10 years in manufacturing and retail, overseeing budgets of KES 1.5B and teams of 12.",
        wins=["Improved working capital by KES 180M in one year", "Led ERP implementation (SAP) across 4 branches", "Clean audit opinions for 5 consecutive years"],
        jobs=[("Finance Manager", "Manufacturing Group, Nairobi", "2019 – Present", ["Lead a finance team of 12", "Own budgeting, forecasting and board reporting", "Manage banking and treasury relationships"]),
              ("Senior Accountant", "Retail Chain, Nairobi", "2015 – 2019", ["Consolidated accounts for 30 stores"])],
        skills=["FP&A", "SAP", "Treasury", "IFRS", "Leadership", "Tax strategy"],
        edu=[("MBA, Finance", "USIU-Africa, 2018"), ("CPA (K), ACCA", "2014")],
        duties=["In charge of finance department", "Preparing budgets", "Supervising accountants"]),
    "civil-engineer": dict(
        title="Civil Engineer", sector="Engineering",
        summary="EBK-registered graduate engineer with 4 years on road and water infrastructure projects worth over KES 900M.",
        wins=["Supervised 22km road rehabilitation, delivered 3 weeks early", "Reduced material wastage by 15%", "Designed water reticulation for 5,000 households"],
        jobs=[("Site Engineer", "Construction Contractor, Eldoret", "2022 – Present", ["Supervise works and subcontractors on KeRRA projects", "Prepare BoQs and progress reports", "Enforce site safety standards"]),
              ("Graduate Engineer", "Engineering Consultancy, Nairobi", "2021 – 2022", ["AutoCAD and Civil 3D design support"])],
        skills=["AutoCAD", "Civil 3D", "BoQs", "Site supervision", "MS Project", "HSE"],
        edu=[("BSc Civil Engineering", "JKUAT, 2021"), ("Graduate Engineer", "EBK, 2022")],
        duties=["Site work", "Drawing plans", "Supervision"]),
    "hospitality-supervisor": dict(
        title="Hospitality Supervisor", sector="Hospitality · Dubai application",
        summary="Guest-focused hospitality supervisor with 6 years in 5-star hotels and resorts. Experienced in leading F&B teams and delivering luxury service.",
        wins=["Raised guest satisfaction scores from 86% to 95%", "Trained 30+ staff in service standards", "Employee of the Quarter, twice"],
        jobs=[("F&B Supervisor", "5-Star Hotel, Nairobi", "2021 – Present", ["Lead a team of 15 across 2 restaurants", "Handle VIP guests and events up to 300 pax", "Manage shift rosters and inventory"]),
              ("Waiter / Captain", "Beach Resort, Mombasa", "2018 – 2021", ["Delivered fine-dining service for international guests"])],
        skills=["F&B operations", "Guest relations", "Team leadership", "Opera PMS", "Food safety", "Upselling"],
        edu=[("Diploma, Hospitality Management", "Utalii College, 2018")],
        duties=["Serving customers", "Cleaning", "Taking orders", "Good communication skills"]),
}

BEFORE = """<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;width:620px;height:877px;background:#fff;font-family:'Times New Roman',serif;color:#111;font-size:13px}}
.p{{padding:44px 56px}} h1{{text-align:center;font-size:20px;text-decoration:underline;margin:0 0 20px}}
h2{{font-size:14px;text-transform:uppercase;margin:18px 0 6px;text-decoration:underline}}
table{{border-collapse:collapse;width:100%}} td{{padding:3px 4px;vertical-align:top}} td:first-child{{width:150px;font-weight:bold}}
.r{{display:inline-block;background:#111;height:12px;vertical-align:middle}}
ul{{margin:4px 0;padding-left:22px}} li{{margin:2px 0}}
</style></head><body><div class="p">
<h1>CURRICULUM VITAE</h1>
<h2>Personal Details</h2>
<table>
<tr><td>Name:</td><td><span class="r" style="width:170px"></span></td></tr>
<tr><td>Date of Birth:</td><td><span class="r" style="width:90px"></span></td></tr>
<tr><td>ID No:</td><td><span class="r" style="width:80px"></span></td></tr>
<tr><td>Marital Status:</td><td>Single</td></tr>
<tr><td>Religion:</td><td>Christian</td></tr>
<tr><td>Nationality:</td><td>Kenyan</td></tr>
<tr><td>Phone:</td><td><span class="r" style="width:110px"></span></td></tr>
</table>
<h2>Career Objective</h2>
<p>To secure a challenging position in a reputable organization where I can utilize my skills and knowledge for the growth of the organization and myself.</p>
<h2>Education Background</h2>
<table>{edu}<tr><td>2012 - 2015</td><td>K.C.P.E / Primary School</td></tr></table>
<h2>Work Experience</h2>
<p><b>{job_title}</b> &nbsp; {job_dates}</p>
<p>Duties:</p><ul>{duties}</ul>
<h2>Skills</h2><ul><li>Computer literate</li><li>Hardworking, honest and a team player</li><li>Able to work under minimal supervision</li></ul>
<h2>Hobbies</h2><p>Reading, travelling, watching movies and meeting new people.</p>
</div></body></html>"""

AFTER = """<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box}}
body{{margin:0;width:620px;height:877px;background:#fff;font-family:'Segoe UI',Arial,sans-serif;color:#3A3631;font-size:11.5px;line-height:1.45}}
.top{{background:#0D0D0D;color:#fff;padding:30px 36px 24px;border-bottom:4px solid #B8913F}}
.name{{display:block;background:#FAF7F2;height:22px;width:230px;border-radius:3px;margin-bottom:10px}}
.role{{font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#E6C877;letter-spacing:.3px}}
.contact{{display:flex;gap:10px;margin-top:12px}} .contact span{{display:block;height:8px;width:90px;background:rgba(230,200,119,.35);border-radius:3px}}
.cols{{display:grid;grid-template-columns:1fr 178px;gap:26px;padding:22px 36px}}
h3{{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#0D0D0D;margin:0 0 7px;padding-bottom:4px;border-bottom:2px solid #B8913F}}
.sec{{margin-bottom:16px}} p{{margin:0}}
.wins li{{margin-bottom:4px}} ul{{margin:0;padding-left:15px}}
.job{{margin-bottom:10px}} .jt{{font-weight:700;color:#0D0D0D;font-size:12.5px}} .jm{{color:#6E675C;font-size:10.5px;margin-bottom:3px}}
.chips{{display:flex;flex-wrap:wrap;gap:5px}} .chips span{{background:#F4ECDA;color:#7A5E22;border-radius:20px;padding:2px 8px;font-size:10.5px;font-weight:600}}
.ed{{margin-bottom:8px}} .ed b{{display:block;color:#0D0D0D}} .ed span{{color:#6E675C;font-size:10.5px}}
.hl{{background:#FAF7F2;border-left:3px solid #B8913F;padding:8px 10px;border-radius:4px}}
</style></head><body>
<div class="top"><span class="name"></span><div class="role">{title}</div>
<div class="contact"><span></span><span></span><span style="width:120px"></span></div></div>
<div class="cols"><div>
<div class="sec"><h3>Professional Profile</h3><p>{summary}</p></div>
<div class="sec"><h3>Key Achievements</h3><div class="hl"><ul class="wins">{wins}</ul></div></div>
<div class="sec"><h3>Experience</h3>{jobs}</div>
</div><div>
<div class="sec"><h3>Core Skills</h3><div class="chips">{skills}</div></div>
<div class="sec"><h3>Education</h3>{edu}</div>
<div class="sec"><h3>Languages</h3><p>English (Fluent)<br>Kiswahili (Native)</p></div>
</div></div></body></html>"""

PROFILE = """<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
body{margin:0;width:1000px;height:800px;background:linear-gradient(135deg,#F4ECDA,#FAF7F2);font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:0}
.pg{width:380px;height:537px;box-shadow:0 30px 60px rgba(13,13,13,.25);position:relative;overflow:hidden}
.cover{background:#0D0D0D;color:#fff;padding:44px 36px;transform:rotate(-4deg) translateX(30px);z-index:2}
.cover .bar{width:60px;height:6px;background:#B8913F;border-radius:3px;margin-bottom:28px}
.cover small{letter-spacing:3px;font-size:11px;color:#A39C8F}
.cover h1{font-size:38px;line-height:1.05;margin:14px 0 18px}
.cover p{color:#D9D2C5;font-size:13px;line-height:1.6}
.cover .shape{position:absolute;right:-80px;bottom:-80px;width:280px;height:280px;border-radius:50%;background:#B8913F;opacity:.9}
.cover .shape2{position:absolute;right:60px;bottom:40px;width:90px;height:90px;border-radius:50%;background:#E6C877}
.cover .yr{position:absolute;left:36px;bottom:36px;font-weight:700;font-size:13px}
.inner{background:#fff;padding:36px 32px;transform:rotate(3deg) translateX(-20px) translateY(20px);color:#3A3631;font-size:11px}
.inner h2{color:#0D0D0D;font-size:18px;margin:0 0 10px} .inner .ln{height:6px;background:#E8E1D4;border-radius:3px;margin-bottom:7px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}
.stats div{background:#F4ECDA;border-radius:8px;padding:10px;text-align:center} .stats b{display:block;color:#7A5E22;font-size:18px}
.img{height:120px;border-radius:8px;background:linear-gradient(135deg,#0D0D0D,#7A5E22);margin:14px 0}
.svc{display:grid;grid-template-columns:1fr 1fr;gap:8px} .svc div{border:1px solid #E8E1D4;border-radius:6px;padding:8px}
.svc i{display:block;width:18px;height:18px;border-radius:5px;background:#B8913F;margin-bottom:6px}
</style></head><body>
<div class="pg cover"><div class="bar"></div><small>COMPANY PROFILE</small><h1>Your Company<br>Ltd</h1>
<p>Delivering quality, reliable solutions to clients across East Africa since 2010.</p>
<div class="shape"></div><div class="shape2"></div><div class="yr">2026</div></div>
<div class="pg inner"><h2>Who We Are</h2><div class="ln"></div><div class="ln"></div><div class="ln" style="width:80%"></div>
<div class="stats"><div><b>15+</b>Years</div><div><b>200+</b>Clients</div><div><b>47</b>Counties</div></div>
<div class="img"></div><h2 style="font-size:14px">Our Services</h2>
<div class="svc"><div><i></i><div class="ln"></div><div class="ln" style="width:70%"></div></div><div><i></i><div class="ln"></div><div class="ln" style="width:60%"></div></div>
<div><i></i><div class="ln"></div><div class="ln" style="width:75%"></div></div><div><i></i><div class="ln"></div><div class="ln" style="width:65%"></div></div></div></div>
</body></html>"""


def render(html, out, w, h):
    src = TMP / (out.stem + ".html")
    src.write_text(html, encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                    "--force-device-scale-factor=1", "--virtual-time-budget=2000",
                    f"--screenshot={out}", src.as_uri()], capture_output=True, timeout=60)
    print(out.name, out.stat().st_size // 1024, "KB")


for slug, r in ROLES.items():
    edu_before = "".join(f"<tr><td>{e[1].split(', ')[-1]}</td><td>{e[0]} – {e[1].rsplit(', ', 1)[0]}</td></tr>" for e in r["edu"])
    j = r["jobs"][0]
    render(BEFORE.format(edu=edu_before, job_title=j[0], job_dates=j[2],
                         duties="".join(f"<li>{d}</li>" for d in r["duties"])),
           OUT / f"{slug}-before.jpeg", 620, 877)
    jobs = "".join(
        f'<div class="job"><div class="jt">{t}</div><div class="jm">{c} · {d}</div><ul>{"".join(f"<li>{b}</li>" for b in bl)}</ul></div>'
        for t, c, d, bl in r["jobs"])
    render(AFTER.format(title=r["title"], summary=r["summary"],
                        wins="".join(f"<li>{w}</li>" for w in r["wins"]), jobs=jobs,
                        skills="".join(f"<span>{s}</span>" for s in r["skills"]),
                        edu="".join(f'<div class="ed"><b>{a}</b><span>{b}</span></div>' for a, b in r["edu"])),
           OUT / f"{slug}-after.jpeg", 620, 877)

render(PROFILE, SITE / "img" / "photos" / "company-profile-mockup.jpeg", 1000, 800)
