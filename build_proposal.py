from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

OUTPUT_PATH = r"C:\Users\hp\.gemini\antigravity-ide\brain\51e64d19-6619-45b9-82e9-c23cbee826d6\GibiGebeta_Proposal.docx"

# ── colour palette ──────────────────────────────────────────────────────────
DARK_NAVY   = RGBColor(0x0D, 0x1B, 0x2A)   # headings
GOLD        = RGBColor(0xC9, 0xA0, 0x2F)   # accents / table headers
LIGHT_GRAY  = RGBColor(0xF5, 0xF5, 0xF5)   # table row shading
MID_GRAY    = RGBColor(0x6B, 0x6B, 0x6B)   # body / subtitles
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)

doc = Document()

# ── page margins ────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin   = Cm(2.5)
    section.right_margin  = Cm(2.5)

# ── helpers ─────────────────────────────────────────────────────────────────
def set_cell_bg(cell, hex_color: str):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  hex_color)
    tcPr.append(shd)

def set_cell_border(cell, **kwargs):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{side}")
        b.set(qn("w:val"),   kwargs.get("val",   "single"))
        b.set(qn("w:sz"),    kwargs.get("sz",    "4"))
        b.set(qn("w:space"), "0")
        b.set(qn("w:color"), kwargs.get("color", "CCCCCC"))
        tcBorders.append(b)
    tcPr.append(tcBorders)

def para_space(para, before=0, after=0):
    pf = para.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after  = Pt(after)

def add_heading1(text):
    p = doc.add_paragraph()
    para_space(p, before=16, after=4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text.upper())
    run.bold      = True
    run.font.size = Pt(13)
    run.font.color.rgb = DARK_NAVY
    # bottom border
    pPr  = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bot  = OxmlElement("w:bottom")
    bot.set(qn("w:val"),   "single")
    bot.set(qn("w:sz"),    "6")
    bot.set(qn("w:space"), "1")
    bot.set(qn("w:color"), "C9A02F")
    pBdr.append(bot)
    pPr.append(pBdr)
    return p

def add_heading2(text):
    p = doc.add_paragraph()
    para_space(p, before=10, after=2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold      = True
    run.font.size = Pt(11)
    run.font.color.rgb = DARK_NAVY
    return p

def add_heading3(text):
    p = doc.add_paragraph()
    para_space(p, before=6, after=1)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold      = True
    run.italic    = True
    run.font.size = Pt(10.5)
    run.font.color.rgb = GOLD
    return p

def add_body(text, italic=False, color=None):
    p = doc.add_paragraph()
    para_space(p, before=1, after=3)
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = p.add_run(text)
    run.font.size   = Pt(10)
    run.italic      = italic
    if color:
        run.font.color.rgb = color
    else:
        run.font.color.rgb = MID_GRAY
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    para_space(p, before=1, after=1)
    p.paragraph_format.left_indent   = Cm(0.6)
    p.paragraph_format.first_line_indent = Cm(-0.3)
    if bold_prefix:
        r = p.add_run(bold_prefix + ": ")
        r.bold           = True
        r.font.size      = Pt(10)
        r.font.color.rgb = DARK_NAVY
    r2 = p.add_run(text)
    r2.font.size      = Pt(10)
    r2.font.color.rgb = MID_GRAY
    return p

def add_numbered(text, bold_prefix=None):
    p = doc.add_paragraph(style="List Number")
    para_space(p, before=1, after=1)
    p.paragraph_format.left_indent       = Cm(0.6)
    p.paragraph_format.first_line_indent = Cm(-0.3)
    if bold_prefix:
        r = p.add_run(bold_prefix + ": ")
        r.bold           = True
        r.font.size      = Pt(10)
        r.font.color.rgb = DARK_NAVY
    r2 = p.add_run(text)
    r2.font.size      = Pt(10)
    r2.font.color.rgb = MID_GRAY
    return p

def add_page_break():
    doc.add_page_break()

def build_table(headers, rows, col_widths=None):
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style     = "Table Grid"

    # header row
    hdr_row = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr_row.cells[i]
        set_cell_bg(cell, "0D1B2A")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p    = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run  = p.add_run(h)
        run.bold           = True
        run.font.size      = Pt(9)
        run.font.color.rgb = WHITE

    # data rows
    for ri, row_data in enumerate(rows):
        row = table.rows[ri + 1]
        bg  = "F5F5F5" if ri % 2 == 0 else "FFFFFF"
        for ci, cell_text in enumerate(row_data):
            cell = row.cells[ci]
            set_cell_bg(cell, bg)
            set_cell_border(cell)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            # first col bold
            run = p.add_run(str(cell_text))
            run.font.size      = Pt(9)
            run.font.color.rgb = DARK_NAVY if ci == 0 else MID_GRAY
            if ci == 0:
                run.bold = True

    # column widths
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)
    return table

def add_code_block(text):
    p = doc.add_paragraph()
    para_space(p, before=4, after=4)
    p.paragraph_format.left_indent = Cm(0.8)
    run = p.add_run(text)
    run.font.name  = "Courier New"
    run.font.size  = Pt(8.5)
    run.font.color.rgb = RGBColor(0x2D, 0x2D, 0x2D)
    return p

# ════════════════════════════════════════════════════════════════════════════
#  COVER PAGE
# ════════════════════════════════════════════════════════════════════════════
p = doc.add_paragraph()
para_space(p, before=60, after=0)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("GibiGebeta")
run.bold           = True
run.font.size      = Pt(32)
run.font.color.rgb = DARK_NAVY

p = doc.add_paragraph()
para_space(p, before=4, after=0)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Intelligent Meal Management System")
run.bold           = True
run.font.size      = Pt(16)
run.font.color.rgb = GOLD

p = doc.add_paragraph()
para_space(p, before=2, after=30)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Arba Minch University")
run.font.size      = Pt(13)
run.font.color.rgb = MID_GRAY

# divider
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
pPr  = p._p.get_or_add_pPr()
pBdr = OxmlElement("w:pBdr")
bot  = OxmlElement("w:bottom")
bot.set(qn("w:val"),   "single")
bot.set(qn("w:sz"),    "12")
bot.set(qn("w:space"), "1")
bot.set(qn("w:color"), "C9A02F")
pBdr.append(bot)
pPr.append(pBdr)

meta = [
    ("Prepared by",    "Solomon"),
    ("Project Type",   "Student-Initiated Academic Project"),
    ("Institution",    "Arba Minch University"),
    ("Date",           "June 2026"),
    ("Status",         "Pending University Approval"),
]
for label, value in meta:
    p = doc.add_paragraph()
    para_space(p, before=6, after=0)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p.add_run(label + ":  ")
    r1.bold           = True
    r1.font.size      = Pt(10)
    r1.font.color.rgb = DARK_NAVY
    r2 = p.add_run(value)
    r2.font.size      = Pt(10)
    r2.font.color.rgb = MID_GRAY

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  1. EXECUTIVE SUMMARY
# ════════════════════════════════════════════════════════════════════════════
add_heading1("1. Executive Summary")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("GibiGebeta: Intelligent Meal Management System for Arba Minch University")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_body(
    "GibiGebeta is a secure, full-stack digital meal management system designed specifically to modernize, "
    "secure, and optimize student dining services (Gibi Gebeta) across all campuses of Arba Minch University (AMU). "
    "The system replaces traditional paper-based meal verification with a real-time, scanner-based authentication "
    "platform that integrates directly with university registrar records."
)
add_body(
    "AMU currently serves between 10,000 and 12,000 students across six campuses, issuing physical meal cards "
    "twice per academic year per semester. Managing access, preventing fraud, and forecasting kitchen volumes "
    "under this system creates significant operational and financial challenges."
)

add_heading2("Key System Capabilities")
bullets = [
    ("Real-time student identity and meal eligibility verification at cafeteria gates",),
    ("Prevention of duplicate meal claims within the same meal session across all campuses",),
    ("Cafeteria assignment enforcement with Amharic-language denial notifications",),
    ("Dynamic fasting logic engine supporting Orthodox and Muslim dietary schedules",),
    ("Automated synchronization with the university registrar database",),
    ("Secure device authorization for scanning terminals via OTP verification",),
    ("Administrative dashboards, real-time analytics, and downloadable reports",),
]
for b in bullets:
    add_bullet(b[0])

add_body(
    "The implementation of GibiGebeta is expected to significantly reduce meal misuse, eliminate recurring "
    "meal card printing costs, minimize food waste through accurate demand forecasting, and support "
    "data-driven procurement and administrative decision-making."
)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  2. PROBLEM STATEMENT
# ════════════════════════════════════════════════════════════════════════════
add_heading1("2. Problem Statement")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("The Challenges of Manual Cafeteria Operations in Public Universities")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_heading2("2.1  Context and Background")
add_body(
    "Arba Minch University operates six campuses and provides heavily subsidized dining services (Gibi Gebeta) "
    "for 10,000–12,000 students daily. Managing dining access and food supply for a population of this scale "
    "is one of the university's most critical and costly daily operational responsibilities. "
    "Currently, student dining access relies on manually issued, paper-based meal cards distributed once per "
    "semester—approximately 20,000–24,000 cards per academic year. The absence of an integrated, real-time "
    "verification system creates multiple operational vulnerabilities."
)

add_heading2("2.2  Core Pain Points")

add_heading3("A.  Meal Card Fraud and Unauthorized Access")
add_body(
    "Physical meal cards can be shared, duplicated, or misused. Gate personnel manually inspecting thousands "
    "of students within narrow meal windows cannot reliably verify the identity of each card holder, creating "
    "opportunities for unauthorized individuals to access subsidized dining services."
)

add_heading3("B.  Duplicate Meal Consumption")
add_body(
    "Without a synchronized, real-time tracking system, there is no mechanism to prevent a student from "
    "receiving meals multiple times during the same session. A student may access Cafe 1 during breakfast "
    "and then attempt to claim another meal from Cafe 2 within the same window, leading to unnecessary "
    "consumption of university resources."
)

add_heading3("C.  Food Wastage and Unpredictable Meal Demand")
add_body(
    "Meal preparation relies on estimates rather than actual turnout data. Attendance fluctuates significantly "
    "due to fasting cycles, internships, and seasonal activities. On Orthodox fasting days "
    "(Wednesdays, Fridays, and Lent) and during Muslim fasting periods (Ramadan), breakfast and lunch "
    "turnout drops sharply. Without live data, kitchens over-prepare, generating avoidable food waste and "
    "unnecessary procurement costs."
)

add_heading3("D.  Disconnect Between Cafeteria and Registrar Records")
add_body(
    "Students on internships, field practice assignments, or medical exemptions temporarily leave campus. "
    "Because cafeteria rosters are not linked to registrar data, these students remain listed as active "
    "diners. The university continues allocating food resources for students who are not physically present, "
    "creating both data inaccuracies and budget inefficiencies."
)

add_heading3("E.  Recurring Meal Card Printing and Administrative Costs")
add_body(
    "The current paper-based system requires continuous printing, distribution, and replacement of meal "
    "cards twice per academic year. Lost or damaged cards generate further replacement work. Over time, "
    "these administrative and material costs represent a significant recurring operational expense."
)

add_heading3("F.  Gate Delays and Security Challenges")
add_body(
    "Manual verification during peak meal hours causes long queues and reduced service efficiency. "
    "The absence of device-level authorization means there is no control over which computers or terminals "
    "can access or manipulate student dining records."
)

add_heading2("2.3  Cumulative Impact")
add_body(
    "Together, these issues create measurable financial leakage and operational burden. Resources that "
    "could be redirected toward educational facilities, laboratories, and student services are instead "
    "consumed by avoidable inefficiencies—highlighting the urgent need for an integrated, intelligent "
    "meal management solution."
)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  3. PROPOSED SOLUTION
# ════════════════════════════════════════════════════════════════════════════
add_heading1("3. Proposed Solution: GibiGebeta")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("An Intelligent, Database-Driven Meal Management System")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_body(
    "GibiGebeta replaces paper-based meal cards and manual verification with a centralized, real-time meal "
    "validation platform. The system integrates with university registrar records and enforces institutional "
    "policies automatically, eliminating the manual bottlenecks that drive current operational challenges."
)

add_body("The solution operates across three coordinated layers:")
add_bullet("The Core Engine (Backend): A high-performance Node.js/Express API server processing verification logic in real time.")
add_bullet("The Scanner App (Frontend Gate): A fast, responsive Next.js interface optimized for tablets and dedicated scanners.")
add_bullet("The Registrar Sync System: A secure connector that keeps student rosters aligned with official university enrollment.")

add_heading2("3.1  Core Features and Capabilities")

add_heading3("A.  Instant Student Verification with Identity Confirmation")
add_body(
    "Students scan their university-issued barcode ID card at an authorized terminal. The system instantly "
    "retrieves the student's profile, displaying their photo on-screen so gate personnel can visually confirm "
    "the identity of the person presenting the card. This directly prevents card sharing and unauthorized access."
)
add_body(
    "If a student loses their ID card, a temporary copy issued by the university carries the same barcode "
    "and is accepted seamlessly by the system."
)

add_heading3("B.  Real-Time Duplicate Meal Prevention")
add_body(
    "The database enforces a strict session-based rule. Once a student successfully scans during a meal "
    "window (Breakfast, Lunch, or Dinner), any subsequent scan of the same ID across any cafeteria within "
    "the same session is immediately blocked and logged with a duplicate denial record."
)

add_heading3("C.  Cafeteria Assignment Enforcement")
add_body(
    "Students are assigned to specific cafeterias based on batch, department, or campus policies. If a "
    "student attempts to dine at an unassigned cafeteria, access is denied and a clear Amharic-language "
    "notification directs them to their designated location (e.g., \u12e8\u1270\u1218\u12f0\u1261\u1260\u1275 \u12ab\u12c4 Cafe 1)."
)

add_heading3("D.  Dynamic Fasting Logic Engine")
add_body(
    "GibiGebeta automatically calculates meal eligibility based on student fasting profiles and calendar date:"
)
add_bullet("Orthodox Fasting: Breakfast access blocked on Wednesdays, Fridays, and during Lent.")
add_bullet("Muslim Fasting: Breakfast and lunch access blocked during Ramadan; dinner access remains open.")
add_bullet("Sunday Fasting: Breakfast access blocked on Sundays for applicable profiles.")
add_body(
    "This allows kitchen managers to receive precise fasting-adjusted turnout forecasts before meal "
    "preparation begins, significantly reducing food waste."
)

add_heading3("E.  Automated Registrar Synchronization")
add_body(
    "The system connects to the university registrar through a secure, read-only view table that the "
    "university ICT team creates on the registrar database. This view exposes the necessary student "
    "fields without granting write access to sensitive institutional data. Synchronization automatically:"
)
add_bullet("Updates student names, batch years, departments, and campus assignments.")
add_bullet("Marks students on internship as inactive, suspending their dining access automatically.")
add_bullet("Restores access when students return to active enrollment status.")

add_heading3("F.  Secure Device Terminal Authorization")
add_body(
    "Scanning terminals must be registered and authorized by an administrator before they can submit "
    "meal scans. Device authorization is enforced through a secure email-based OTP mechanism. "
    "Unauthorized devices cannot interact with the scanning API."
)

add_heading3("G.  Administrative Dashboards and Reporting")
add_body(
    "Administrators and cafeteria managers access real-time dashboards providing:"
)
add_bullet("Live meal session attendance and pending student counts.")
add_bullet("Campus-level and cafeteria-level comparative statistics.")
add_bullet("Historical attendance trends by batch, department, and campus.")
add_bullet("Downloadable reports to support procurement planning and institutional audits.")

add_heading2("3.2  Expected Outcomes")
outcomes = [
    "Elimination of physical meal card printing and replacement costs",
    "Significant reduction in unauthorized dining access and duplicate meal claims",
    "Improved kitchen demand forecasting through live fasting-adjusted attendance data",
    "Reduced administrative workload through automated registrar synchronization",
    "Faster gate processing and reduced student queuing times",
    "Full audit trail of every meal transaction across all campuses",
]
for o in outcomes:
    add_bullet(o)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  4. TECHNICAL ARCHITECTURE
# ════════════════════════════════════════════════════════════════════════════
add_heading1("4. Technical Architecture")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("System Infrastructure, Technology Stack, and Data Flow")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_body(
    "GibiGebeta employs a modern, modular three-tier client-server architecture built for high availability, "
    "low-latency scan processing, and secure data management across multiple university campuses."
)

add_heading2("4.1  Technology Stack")
build_table(
    headers=["Layer", "Technology", "Version", "Purpose"],
    rows=[
        ["Frontend UI", "Next.js / React", "15.1.0 / 19.0.0", "Scanner gate and admin dashboard interfaces"],
        ["Styling", "Tailwind CSS", "4.1.18", "Responsive design for tablets, scanners, and desktops"],
        ["API Client", "Axios", "1.13.4", "Secure HTTP communication between frontend and backend"],
        ["Backend Runtime", "Node.js", "≥ 20.19.0", "High-concurrency asynchronous request processing"],
        ["Application Framework", "Express.js", "4.19.2", "Modular REST API routing and middleware"],
        ["Authentication", "JWT (jsonwebtoken)", "9.0.3", "Stateless session tokens for all user roles"],
        ["Email Service", "Nodemailer", "Latest", "OTP delivery for device authorization"],
        ["Database Engine", "MySQL", "8.x", "Relational data storage with indexed queries"],
        ["Database Driver", "mysql2", "3.6.5", "Parameterized SQL execution and connection pooling"],
    ],
    col_widths=[3.8, 3.8, 2.4, 6.0],
)

add_heading2("4.2  Architectural Layers")

add_heading3("Client Layer (Presentation)")
add_body(
    "The frontend is built with Next.js 15 and React 19, providing optimized page routing and server-side "
    "rendering. The interface adapts responsively to desktop workstations in administrative offices, "
    "tablet devices mounted at cafeteria gates, and dedicated barcode terminal screens. Axios manages "
    "all API communication with global request interceptors for authentication token handling."
)

add_heading3("Application Layer (Business Logic)")
add_body(
    "The Express.js backend organizes all business rules into modular routes, controllers, and models. "
    "The entire system enforces the Africa/Addis_Ababa (UTC+3) timezone globally, ensuring that meal "
    "windows open and close precisely on schedule regardless of client device clock settings. "
    "Role-based middleware controls access for four distinct user types: Super Admin, Campus Manager, "
    "Cafe Scanner, and Cafe Manager."
)

add_heading3("Data and Integration Layer")
add_body(
    "The local MySQL database stores campus configurations, student records, scan history, attendance "
    "snapshots, and session logs. Critical fields such as studentId and campusId are indexed for "
    "sub-100ms query performance during peak scan periods. The registrar integration uses a "
    "read-only view table created by the university ICT team, queried through a direct, secured "
    "MySQL connection."
)

add_heading2("4.3  Core Operational Data Flows")

add_heading3("A.  Real-Time Scan Validation Flow")
steps = [
    ("Step 1", "Student barcode is scanned at an authorized terminal and a POST request is sent to the API."),
    ("Step 2", "Backend middleware verifies that the terminal is a registered and OTP-authorized device."),
    ("Step 3", "Student record is retrieved and validated against cafeteria assignment rules."),
    ("Step 4", "Fasting logic engine checks the student's profile against the current day and meal type."),
    ("Step 5", "Deduplication engine checks whether the student has already scanned this session."),
    ("Step 6", "If all checks pass, the scan is logged and the terminal displays an 'Allowed' confirmation with the student photo."),
]
for bold, text in steps:
    add_bullet(text, bold_prefix=bold)

add_heading3("B.  Registrar Synchronization Flow")
add_body(
    "The campus manager triggers a synchronization request. The system runs a SHOW COLUMNS inspection "
    "on the registrar view table to dynamically detect available fields (including optional profile photo "
    "columns). It then fetches updated student records, compares them against the local database, inserts "
    "new students, updates changed records, and deactivates students who are no longer active or are "
    "currently on internship."
)

add_heading2("4.4  Security Protocols")
sec = [
    ("Stateless Authentication", "All sessions use JWT tokens stored in secure HttpOnly cookies, preventing XSS-based token theft."),
    ("SQL Injection Prevention", "All database interactions use parameterized queries with no string-interpolated SQL."),
    ("Device Authorization", "Scanning terminals require OTP-based email verification before being granted API access."),
    ("Role-Based Access Control", "Each user role (Admin, Campus, Cafe Manager, Scanner) has distinct permission boundaries."),
    ("Encrypted Communication", "All client-server traffic is transmitted over HTTPS in production deployments."),
    ("Audit Logging", "Every meal scan, denial, and override is stored with a precise timestamp for audit trail purposes."),
]
for bold, text in sec:
    add_bullet(text, bold_prefix=bold)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  5. ROLLOUT & IMPLEMENTATION PLAN
# ════════════════════════════════════════════════════════════════════════════
add_heading1("5. Rollout & Implementation Plan")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Phased Deployment, Integration Testing, and Training Strategy")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_body(
    "Implementation follows a six-week phased strategy designed to minimize operational disruptions while "
    "validating system performance at each stage before expanding to the next. Weeks 1 through 6 cover "
    "infrastructure, integration, hardware, training, and a single-cafeteria pilot. Full multi-campus "
    "rollout follows pilot evaluation and formal university approval."
)

add_heading2("5.1  Implementation Schedule")
build_table(
    headers=["Phase", "Week", "Objective", "Key Deliverable"],
    rows=[
        ["Phase 1: Infrastructure Setup", "Week 1", "Deploy server, database, and application environments", "Functional system environment on university network"],
        ["Phase 2: Registrar Integration", "Week 2", "Establish read-only registrar sync and validate field mapping", "Automated student roster synchronization"],
        ["Phase 3: Gate Hardware Setup", "Week 3", "Install and authorize cafeteria scanning terminals", "Registered, OTP-verified gate devices"],
        ["Phase 4: Training & Pilot", "Week 4", "Train staff and run live pilot in one cafeteria", "Pilot evaluation report and trained personnel"],
        ["Phase 5–6: Full Deployment", "Weeks 5–6", "Expand system across all campuses and provide support", "University-wide live dining management system"],
    ],
    col_widths=[4.0, 1.8, 5.5, 5.0],
)

add_heading2("5.2  Phase Details")

add_heading3("Phase 1: Infrastructure Setup (Week 1)")
add_body("Objective: Prepare the hosting environment and deploy all system components.")
for a in [
    "Configure MySQL database server on university infrastructure.",
    "Deploy the Node.js/Express backend API to the campus server.",
    "Deploy the Next.js frontend application to the university web environment.",
    "Configure email delivery (SMTP) for OTP device authorization.",
    "Perform initial connectivity and smoke tests.",
]:
    add_bullet(a)

add_heading3("Phase 2: Registrar Integration (Week 2)")
add_body("Objective: Establish secure, automated student data synchronization.")
for a in [
    "Coordinate with ICT and registrar teams to create the read-only student view table.",
    "Validate field mapping (stId, fullName, batchYear, deptName, campId).",
    "Run test synchronizations and verify internship status handling.",
    "Confirm photo column detection if profile images are available.",
]:
    add_bullet(a)

add_heading3("Phase 3: Gate Hardware Setup (Week 3)")
add_body("Objective: Install and authorize cafeteria entry terminals.")
for a in [
    "Deploy one laptop and one USB barcode scanner per cafeteria.",
    "Connect terminals to campus network (Ethernet or secured Wi-Fi).",
    "Register and authorize each device through administrator OTP verification.",
    "Conduct latency tests to confirm scan response times.",
]:
    add_bullet(a)

add_heading3("Phase 4: Staff Training and Pilot Deployment (Week 4)")
add_body("Objective: Test under real operating conditions and prepare personnel.")
for a in [
    "Train cafeteria gate checkers to interpret scan results (green/red feedback).",
    "Train ICT administrators on campus management, overrides, and reporting.",
    "Deploy a live pilot in one selected cafeteria for one full week.",
    "Collect operational feedback and document issues for resolution.",
]:
    add_bullet(a)

add_heading3("Phase 5–6: Full Deployment and Support (Weeks 5–6)")
add_body("Objective: Expand system-wide and stabilize.")
for a in [
    "Activate scanning gates across all campus cafeterias simultaneously.",
    "Provide on-site technical support during the first three days of live operation.",
    "Monitor server load, database replication, and network performance.",
    "Deliver the first set of dining analytics reports to management.",
]:
    add_bullet(a)

add_heading2("5.3  Risk Mitigation")
build_table(
    headers=["Risk", "Likelihood", "Mitigation Strategy"],
    rows=[
        ["Network interruption at gate", "Medium", "Temporary local scan log stored on device, synced when connection restores."],
        ["Hardware failure at terminal", "Low", "Spare authorized backup device available per campus."],
        ["Registrar DB schema changes", "Low", "Dynamic SHOW COLUMNS inspection adapts automatically without code changes."],
        ["Staff resistance or slow adoption", "Medium", "Additional training sessions; Amharic-language interface reduces learning curve."],
        ["Pilot data inconsistency", "Low", "Parallel manual backup maintained during pilot week for comparison."],
    ],
    col_widths=[4.5, 2.2, 9.6],
)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  6. ROI & FINANCIAL IMPACT
# ════════════════════════════════════════════════════════════════════════════
add_heading1("6. Return on Investment & Financial Impact")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Cost Reduction, Waste Minimization, and Operational Savings")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_body(
    "Providing subsidized dining services for 10,000–12,000 students across six campuses represents one "
    "of Arba Minch University's most significant recurring operational expenditures. Inefficiencies "
    "arising from meal card fraud, duplicate consumption, inaccurate demand forecasting, and recurring "
    "administrative overhead represent avoidable costs. GibiGebeta targets each of these leakage areas."
)

add_heading2("6.1  Core Areas of Financial Recovery")

areas = [
    (
        "A.  Elimination of Meal Card Printing Costs",
        "The university currently prints and distributes 10,000–12,000 meal cards twice per academic year "
        "(up to 24,000 cards annually), plus replacements for lost or damaged cards. Replacing this with "
        "digital verification eliminates all associated printing, distribution, and administrative replacement costs."
    ),
    (
        "B.  Reduction of Unauthorized Dining Access",
        "Real-time identity verification through barcode scanning and on-screen photo confirmation directly "
        "prevents card sharing and guest dining. This reduces the number of unauthorized meals claimed "
        "against the university's subsidized dining budget."
    ),
    (
        "C.  Prevention of Duplicate Meal Claims",
        "Centralized session tracking blocks multiple claims within the same meal window across all campuses. "
        "This ensures each student is counted and served exactly once per session, improving resource accuracy."
    ),
    (
        "D.  Improved Meal Demand Forecasting",
        "Historical attendance data and real-time fasting-adjusted turnout figures allow kitchen managers "
        "to prepare quantities calibrated to actual expected demand. On high-fasting days, this can "
        "significantly reduce over-preparation and food waste."
    ),
    (
        "E.  Automated Off-Campus Student Deactivation",
        "Students on internships or exemptions are automatically removed from the active dining roster "
        "through registrar synchronization, ensuring the university stops allocating food and subsidy "
        "resources for students who are not physically present on campus."
    ),
]
for heading, body in areas:
    add_heading3(heading)
    add_body(body)

add_heading2("6.2  Development and Infrastructure Investment")
add_body(
    "The primary investment required to bring GibiGebeta to production consists of the following components:"
)
build_table(
    headers=["Cost Component", "Description"],
    rows=[
        ["Development Time", "Approximately 6–8 months of full-time development effort invested by the project author."],
        ["Internet and Connectivity", "Ongoing internet access costs incurred during development, testing, and remote deployment."],
        ["Development Infrastructure", "Subscriptions to cloud-based development tools, hosting environments, and testing infrastructure used during the build phase."],
        ["Hardware (per cafeteria)", "One laptop and one USB barcode scanner per cafeteria gate — to be procured by the university upon approval."],
        ["Server Hosting", "Deployment on existing AMU infrastructure at no additional server licensing cost."],
    ],
    col_widths=[5.2, 11.1],
)

add_heading2("6.3  Long-Term Institutional Value")
add_body("Beyond direct cost reduction, the system provides strategic long-term benefits:")
for b in [
    "Audit readiness: Full transaction logs support financial and operational audits at any time.",
    "Supply chain optimization: Precise historical data guides accurate grain, meat, and supply procurement.",
    "Scalability: The modular architecture supports adding new campuses, cafeterias, or meal types with minimal configuration changes.",
    "Reporting credibility: Management can present verified dining statistics to funding bodies and university boards with confidence.",
]:
    add_bullet(b)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  7. CONCLUSION
# ════════════════════════════════════════════════════════════════════════════
add_heading1("7. Conclusion & Recommended Next Steps")

p = doc.add_paragraph()
para_space(p, before=2, after=2)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("A Vision for Efficient, Secure, and Data-Driven Campus Dining")
run.bold           = True
run.italic         = True
run.font.size      = Pt(10.5)
run.font.color.rgb = GOLD

add_body(
    "The modernization of cafeteria operations represents a significant and measurable step forward in "
    "Arba Minch University's digital transformation. GibiGebeta is not merely a scanning tool—it is "
    "an integrated resource management system that connects administrative oversight, security "
    "enforcement, and financial accountability into a single platform."
)
add_body(
    "By replacing traditional paper-based meal verification with a centralized, database-synchronized "
    "system, the university can eliminate recurring card management costs, prevent subsidy leakage, "
    "and make data-driven decisions about food preparation and procurement—potentially recovering a "
    "significant portion of annual dining expenditure within the first semester of operation."
)

add_heading2("7.1  Recommended Next Steps")
next_steps = [
    ("System Demonstration", "Schedule a walkthrough of the live system interface with the ICT Directorate and Student Services Office."),
    ("Technical Coordination", "Coordinate with the registrar and ICT teams to establish the read-only student view table and confirm field mappings."),
    ("Pilot Location Selection", "Designate one cafeteria for a one-week controlled pilot deployment to evaluate real-world performance."),
    ("Formal Approval", "Upon successful pilot review, seek presidential and administrative approval for university-wide rollout."),
    ("Hardware Procurement", "Procure one laptop and one barcode scanner per cafeteria gate based on the approved cafeteria count."),
]
for i, (bold, text) in enumerate(next_steps, 1):
    add_numbered(text, bold_prefix=f"{i}. {bold}")

add_body(
    "GibiGebeta is a complete, working system built over six to eight months of dedicated development. "
    "It is ready for pilot deployment and structured to scale to all six AMU campuses following approval. "
    "We look forward to presenting the system and answering any technical or administrative questions "
    "from university leadership."
)

add_page_break()

# ════════════════════════════════════════════════════════════════════════════
#  8. APPENDICES
# ════════════════════════════════════════════════════════════════════════════
add_heading1("Appendix A: Cafeteria Gate Hardware Specifications")
add_body("The following hardware is required for each cafeteria entry gate across all six campuses:")

build_table(
    headers=["Component", "Specification", "Notes"],
    rows=[
        ["Scanning Terminal", "Standard laptop or mini-PC running Google Chrome or Microsoft Edge", "Option: 10-inch tablet in wall-mounted bracket"],
        ["Barcode Scanner", "1D/2D USB omni-directional barcode reader", "Must read printed ID cards and mobile screen barcodes"],
        ["Scan Response", "Scanner trigger delay < 50ms", "API validation response target < 100ms"],
        ["Network", "Ethernet or secured campus Wi-Fi", "Ping < 50ms to local server recommended"],
        ["Quantity", "One laptop + one scanner per cafeteria gate", "Spare authorized backup device recommended per campus"],
    ],
    col_widths=[4.0, 7.2, 5.1],
)

add_heading1("Appendix B: Registrar Database Field Mapping")
add_body(
    "GibiGebeta reads student data from a read-only view table created by the university ICT team "
    "on the registrar database. The following field mappings are hardcoded in the system:"
)
build_table(
    headers=["Registrar Source Column", "Local System Column", "Data Type", "Notes"],
    rows=[
        ["stId", "studentId", "VARCHAR(255)", "Unique. Case-sensitive collation (utf8mb4_bin)."],
        ["fullName", "name", "VARCHAR(255)", "Student full name. Trimmed on import."],
        ["batchYear", "batch", "INT", "Used for cafeteria batch assignments."],
        ["deptName", "department", "VARCHAR(255)", "Student's academic department."],
        ["campId", "campusId", "INT", "Links student to their designated campus."],
        ["profileUrl / photoUrl / photo", "profileUrl", "VARCHAR(255)", "Optional. Auto-detected from available columns. Not required."],
    ],
    col_widths=[4.5, 4.0, 2.8, 5.0],
)
add_body(
    "Note: The system automatically inspects the view table schema using a SHOW COLUMNS query before "
    "syncing. If the photo column is named differently (e.g., avatar, pic_url), the system skips "
    "photo mapping gracefully without failing. No environment configuration is required for this field."
)

add_heading1("Appendix C: Localized Gate Denial Messages")
add_body(
    "The system displays context-specific denial messages in Amharic to help gate checkers "
    "communicate clearly with students:"
)
build_table(
    headers=["Denial Code", "Amharic Message", "English Meaning", "Trigger Condition"],
    rows=[
        ["duplicate", "\u12a0\u120d\u1270\u1348\u1240\u12f0\u121d", "Already Served", "Student scanned successfully earlier in this meal session."],
        ["cafe_mismatch", "\u12e8\u1270\u1218\u12f0\u1261\u1260\u1275 \u12ab\u12c4 Cafe X", "Assigned to Cafe X", "Student attempting to eat at an unassigned cafeteria."],
        ["fasting_restricted", "\u12a0\u120d\u1270\u1348\u1240\u12f0\u121d", "Fasting Restriction", "Fasting student accessing a meal type restricted by their profile."],
        ["internship_blocked", "\u12a0\u120d\u1270\u1348\u1240\u12f0\u121d", "On Internship", "Student is registered as off-campus for internship."],
        ["outside_window", "\u1230\u12d3\u1275 \u12a0\u120d\u134b\u1790\u121d", "Session Closed", "Scan attempted outside the scheduled meal time window."],
    ],
    col_widths=[3.5, 4.0, 3.8, 5.0],
)

add_heading1("Appendix D: Fasting Eligibility Logic")
add_body("The fasting engine evaluates the following decision tree on every scan request:")
add_code_block(
"""[Is Student Fasting?]
    |
    +---> No  ---> [Allow scan normally]
    |
    +---> Yes ---> [Check Fasting Type]
              |
              +---> Orthodox Fasting
              |         |
              |         +---> Meal = Breakfast?
              |         |         |
              |         |         +---> Day = Wed / Fri / Lent ---> [DENIED]
              |         |         +---> Other Days             ---> [ALLOWED]
              |         +---> Lunch / Dinner                   ---> [ALLOWED]
              |
              +---> Muslim Fasting
              |         |
              |         +---> Meal = Breakfast or Lunch        ---> [DENIED]
              |         +---> Meal = Dinner                    ---> [ALLOWED]
              |
              +---> Sunday Fasting
                        |
                        +---> Day = Sunday AND Meal = Breakfast ---> [DENIED]
                        +---> All Other Cases                   ---> [ALLOWED]"""
)

# ── save ─────────────────────────────────────────────────────────────────────
doc.save(OUTPUT_PATH)
print(f"Saved: {OUTPUT_PATH}")
