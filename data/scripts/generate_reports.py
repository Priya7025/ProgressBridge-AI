"""
Generate realistic sample daily reports, spreadsheets, and ground truth mapping
for ProgressBridge AI semantic schedule matching validation.

Output directories:
- supabase/seed/sample_reports/
- data/sample_reports/
"""

import csv
import json
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
SUPABASE_SEED_REPORTS = WORKSPACE_ROOT / "supabase" / "seed" / "sample_reports"
DATA_REPORTS = WORKSPACE_ROOT / "data" / "sample_reports"

SUPABASE_SEED_REPORTS.mkdir(parents=True, exist_ok=True)
DATA_REPORTS.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# 1. Text Report Definitions
# -------------------------------------------------------------

# Report 1: Civil & Structural Field Diary
REPORT_1_FILENAME = "daily_site_report_civil_2026-08-14.txt"
REPORT_1_TEXT = """PROGRESSBRIDGE AI - SITE PROGRESS REPORT
PROJECT: Onshore Terminal Expansion - Package B
DATE: 2026-08-14
REPORT TYPE: Daily Field Diary - Civil & Structural Infrastructure
PREPARED BY: Rajesh K., Lead Civil Field Supervisor
WEATHER: Clear, 34°C, dry ground conditions

SUMMARY OF FIELD ACTIVITIES:
1. Storm Drainage Trenching (Reforming Unit):
   Backhoe operator finished digging the storm drain trench alongside Train B near foundation FND-V-201. Reached about 45 linear meters today. Trench bottom is firm, slope checked with laser level.

2. Pipe Rack Subgrade Prep:
   Roller operator ran passes over the subgrade soil between Grid A and G along the main pipe rack corridor (STR-PR-101). QA technician completed three nuclear gauge moisture/density tests this afternoon; all hit 96% modified Proctor, meeting specification.

3. Aggregate Base Course at Cooling Tower:
   Spread and compacted the 150mm crushed stone foundation layer over the cooling tower basin footprint (CT-BASIN-01). Grader and 10-ton vibrating roller finished the south half.

4. Blinding Layer Pour (Compressor Bay):
   Mixed and placed the 75mm lean concrete blinding mud mat for the compressor building base slab (BLDG-COMP-01). Surface was struck off flat and covered for overnight setting.

5. Rebar Cage Erection (CCR Building):
   Ironworkers hoisted and tied the heavy #8 and #10 high-yield rebar cages for the control building foundation mats (BLDG-CCR). All corner lap splices and spacer chairs inspected and approved by third-party inspector.

6. Effluent Basin Anchor Bolts:
   Survey team set up optical levels and locked in the galvanized anchor bolt assemblies with wooden templates at the ETP basin foundation (ETP-BASIN-01) before tomorrow's concrete pour.

7. Lab Testing (Demin Tank Foundation):
   Crushed the 7-day test cylinders from the demin water tank pad pour (FND-DM-TK01). Average strength came in at 28.4 MPa, on track to easily hit 35 MPa 28-day requirement.

8. Steelwork Bolting on Main Rack:
   Ironworker crew torqued up all the HSFG connection bolts on the lower tier steel beams along pipe rack STR-PR-101. Verified 100% of bolts with calibrated torque wrench and applied yellow paint marks.

UNSCHEDULED / NON-BASELINE ENTRIES:
9. Supervisor Vehicle Maintenance:
   Site mechanic spent 3 hours replacing the alternator and battery on site supervisor's Toyota Hilux pickup (Vehicle #CIV-04) near the security gate.

SAFETY & WORKFORCE:
- Zero lost-time incidents recorded.
- Civil workforce: 42 personnel on site (6 supervisors, 18 ironworkers/masons, 18 helpers/operators).
"""

# Report 2: Mechanical & Piping Shift Log
REPORT_2_FILENAME = "daily_shift_log_mechanical_2026-08-15.txt"
REPORT_2_TEXT = """PROGRESSBRIDGE AI - SHIFT LOG
DISCIPLINE: Mechanical, Equipment Rigging & Pressure Piping
DATE: 2026-08-15 | SHIFT: Day (07:00 - 18:30)
FACILITY: Onshore Gas Terminal - Units 10 & 20
REPORTING SUPERVISOR: Vikram Sengupta, Lead Piping & Rigging Supervisor

1. HEAVY EQUIPMENT RIGGING:
- Shell-and-Tube Exchanger Lift:
  Mobilized 150-ton mobile crane at Process Train A. Successfully lifted the horizontal shell-and-tube exchanger (V-101) and set it dead center onto its concrete saddle supports.
- Crude Pump Baseplate Setting:
  Placed the centrifugal multistage crude charge pump skid (K-102A) onto the inertia block in the booster compression bay. Completed initial rough leveling with machinist shims.

2. SPOOL FABRICATION & PIPING ERECTION:
- Pipe Rack Tier 2 Spool Erection:
  Crane hoisted the heavy pre-fab 12-inch schedule 80 carbon steel spool into position on the main pipe rack corridor tier 2 (PR-TIER-02). Secured temporarily with drift pins.
- Stainless Steel Discharge Line Fit-Up:
  Welders completed fit-up on the 8-inch 316L stainless line coming off exchanger battery south (E-201A/B). Tack-welded 4 butt joints under argon purge backing.
- High-Pressure Gas Header Welding:
  Two certified 6G pipe welders completed TIG root pass followed by SMAW hot and cap passes on HP gas header at Exchanger Battery North (E-202A/B). Visual inspection passed cleanly.
- Cooling Water Valve Installation:
  Installed three Class 600 isolation valves (two gate, one check) at cooling water station CW-PUMP-02. Replaced all temporary shipping seals with brand new graphite-filled spiral wound gaskets.
- Flange Torquing:
  Bolted up the 16-inch nozzle connection at tank farm manifold (MANIFOLD-TF01). Applied star-pattern tightening in 3 stages up to 480 N-m in strict accordance with ASME PCC-1 specs.
- Pipe Support Teflon Shoes:
  Mounted 14 Teflon/PTFE sliding guide shoes under process lines at instrument air skid (SKID-IA-01).

3. PRESSURE TESTING & LAGGING:
- Hydrotest Package Hold:
  Filled and pressurized the crude manifold piping spool assembly to 150% rated design pressure (36.5 bar). Held hold period for 2 hours with zero pressure drop. Dewatered and blown dry with utility air.
- Steam Header Lagging:
  Thermal insulation gang fitted preformed rockwool / mineral wool blankets over 30 meters of overhead steam header line (HDR-STM-01).

4. NON-PROJECT WORK:
- Tool Container Relocation:
  Rigging crew used 25-ton yard crane to relocate 2 empty tool shipping containers from laydown yard C to contractor staging area behind perimeter fence.

REMARKS / CONSTRAINTS:
- No crane breakdowns or rigging safety concerns.
- Third-party NDT radiographer booked for 20:00 tonight to shoot films on HP gas header weld joints.
"""

# Report 3: Electrical & Controls Site Diary
REPORT_3_FILENAME = "site_diary_electrical_2026-08-16.txt"
REPORT_3_TEXT = """PROGRESSBRIDGE AI - SITE DIARY (ELECTRICAL & CONTROLS)
DATE: 2026-08-16
LOCATION: Substation 01 & Process Area
SUPERVISOR: Amitava Bose, Electrical Construction Lead

FIELD PROGRESS OBSERVATIONS:
1. Substation 33kV Cable Tray:
   Electrical crew finished putting up 42 meters of the 450mm perforated galvanized tray raceways inside the 33kV switchgear room ceiling space (SWG-33KV-01).

2. 11kV Room Ladder Trays:
   Bracket fabricators welded heavy-duty unistrut wall supports and hung the vertical ladder cable rack running up to the 11kV switchboard cubicles (SWG-11KV-01).

3. MCC-01 Conduit Runs:
   Electricians bent and threaded 2-inch rigid steel conduits (RGS) connecting MCC-Train A (MCC-TRAIN-A) to local push-button stations.

4. Explosion-Proof Box Sealing:
   Mounted hazardous-area Ex-d junction boxes and poured Chico sealing compound at MCC-02 room (MCC-TRAIN-B).

5. 33kV Duct Bank Cable Pull:
   Winched the 3-core 240 sq mm 33kV high voltage armored cable through the concrete duct bank into the CCR battery equipment room (UPS-BAT-ROOM).

6. Lug Crimping:
   Used 12-ton hydraulic crimper with hex dies to crimp heavy tinned copper lugs onto phase conductors in trench corridor A (TRNCH-ELEC-01).

7. 33kV Cold-Shrink Terminations:
   Certified jointer completed 33kV cold-shrink stress cone termination kits on top tier pipe rack cable tray run (TRAY-RACK-01).

8. Earth Rods & Earth Resistance:
   Sunk three 3-meter copper-bonded ground rods near ESD panel enclosure (ESD-PNL-01). Fall-of-potential test gave 1.8 ohms, comfortably under the 2.0 ohm limit.

9. Cadweld Earthing Connections:
   Completed 8 exothermic thermite Cadweld shots bonding 50x6mm copper tape to perimeter grounding grid at Fire & Gas panel shelter (FGS-PNL-01).

NON-SCHEDULE INCIDENT / ANOMALY:
10. Temporary Dewatering of Fabrication Yard:
    Emergency callout: Cleared debris and pumped standing storm runoff out of temporary fabrication yard ditch after torrential overnight rain. Took 4 laborers and 1 submersible pump roughly 4 hours.

CREW ON SITE:
- 1 Electrical Superintendent, 4 Foremen, 16 Electricians, 2 Certified Jointers, 8 Helpers.
"""

# Report 4: Multi-Discipline Commissioning & Utility Report
REPORT_4_FILENAME = "daily_site_report_multidiscipline_2026-08-19.txt"
REPORT_4_TEXT = """PROGRESSBRIDGE AI - MULTI-DISCIPLINE SITE SUMMARY
DATE: 2026-08-19
AREA: Utilities & Offsites Integration
COORDINATOR: Marcus Vance, Commissioning Interface Lead

1. CIVIL INFRASTRUCTURE:
- Cable Trench Covers:
  Installed precast concrete trench channels and seated removable checkered steel covers along the Emergency Generator pad (FND-EDG-01).
- Substation Roof Waterproofing:
  Applied primer and torch-on bituminous waterproofing membrane sheets across the secondary substation roof slab (BLDG-SS-02).

2. MECHANICAL & PIPING:
- Chemical Dosing Package Setting:
  Placed the modular chemical injection package (SKID-CHEM-01) onto concrete anchor plinths and aligned hold-down anchor bolts.
- Nitrogen Leak Testing on Fin-Fan Deck:
  Pressurized fin-fan condenser coils (AC-101) with nitrogen to 7 bar and swabbed Snoop bubble fluid across all flange joints; zero leakage found.
- Steam Traced Line Insulation:
  Lagging crew wrapped preformed mineral wool insulation jackets on the overhead steam header (HDR-STM-01).

3. ELECTRICAL & INSTRUMENTATION:
- Switchgear Cubicle Erection:
  Erected 11kV vacuum circuit breaker switchgear cubicles and torque-bolted copper busbar links inside the variable frequency drive shelter (VFD-PANEL-01).
- Megger Insulation Resistance Testing:
  Conducted 1000V DC insulation resistance Megger checks on cathodic protection power feed cables (CP-TRU-01); all phases measured >500 Mega-ohms.
- Field Transmitter Calibration:
  Calibrated pressure transmitters using HART 475 communicator and verified 4-20mA loop signals back to transformer TR-01 monitoring rack (XFMR-33-11KV-01).

4. AD-HOC FIELD TASK:
- Visitor Viewing Stand Assembly:
  Carpenters erected a temporary wooden viewing platform and safety barricade for visiting OIL executive management delegation near north gate.

SIGN-OFF:
Marcus Vance (Lead Coordinator)
"""

# -------------------------------------------------------------
# 2. Spreadsheet Definitions (CSV)
# -------------------------------------------------------------

SPREADSHEET_1_FILENAME = "daily_progress_log_civil_mechanical_2026-08-17.csv"
SPREADSHEET_1_ROWS = [
    {
        "date": "2026-08-17",
        "location_note": "Tank Farm East - Crude Tank 01",
        "activity_note": "Tamped and compacted backfill gravel in 200mm layers around Tank 01 dike retaining walls (BUND-TK-01)",
        "status_note": "Layers 3 and 4 completed; soil testing passed with 97% compaction."
    },
    {
        "date": "2026-08-17",
        "location_note": "Compressor House Bay 1-3",
        "activity_note": "Assembled plywood shuttering and heavy steel waler supports for deep foundation pedestals (BLDG-COMP-01)",
        "status_note": "Forms locked in place; ready for pre-pour dimensional inspection."
    },
    {
        "date": "2026-08-17",
        "location_note": "Process Train A - Cracker Area",
        "activity_note": "Placed ribbed rubber waterstop profiles across construction cold joints on Train A cracker slab (FND-TK-101)",
        "status_note": "Joints fully prepped and secured prior to adjoining slab pour."
    },
    {
        "date": "2026-08-17",
        "location_note": "Main Pipe Rack Corridor - Grid A to G",
        "activity_note": "Laid 8-inch solid cement block walls with horizontal bond beams at pipe rack support shelter (STR-PR-101)",
        "status_note": "Reached 2.4m height; mortar curing under damp burlap."
    },
    {
        "date": "2026-08-17",
        "location_note": "Process Train A - Booster Compression Standby",
        "activity_note": "Set up dual laser alignment sensors on compressor-motor coupling and dialed in hot-alignment offsets for K-102B",
        "status_note": "Angular misalignment dialed down to 0.03mm, well within tolerance."
    },
    {
        "date": "2026-08-17",
        "location_note": "Process Train B - LP Compression Bay",
        "activity_note": "Checked soft-foot on pump feet using dial gauges and inserted 0.2mm precision SS shims under K-202A",
        "status_note": "Soft-foot reduced to below 0.025mm; foundation hold-down bolts tightened."
    },
    {
        "date": "2026-08-17",
        "location_note": "Heat Exchanger Battery - South",
        "activity_note": "Carried out X-ray radiography and magnetic particle inspection across 14 field butt welds on E-201A/B piping",
        "status_note": "13 welds accepted, 1 root lack-of-fusion marked for repair."
    },
    {
        "date": "2026-08-17",
        "location_note": "Air Cooled Fin-Fan Condenser Deck",
        "activity_note": "Pressurized fin-fan cooler coils (AC-101) with nitrogen gas to 7 bar and brush-tested all threaded connections with Snoop soap liquid",
        "status_note": "Zero bubbling observed; pneumatic test package signed off."
    },
    {
        "date": "2026-08-17",
        "location_note": "South Gate Guard House",
        "activity_note": "Assembled temporary wooden scaffolding and privacy screens for visiting client delegation at south perimeter gate",
        "status_note": "Ad-hoc task requested by client PM; not on project baseline schedule."
    },
]

SPREADSHEET_2_FILENAME = "contractor_daily_log_electrical_piping_2026-08-18.csv"
SPREADSHEET_2_ROWS = [
    {
        "date": "2026-08-18",
        "location_note": "Compressor House Bay 4-6",
        "activity_note": "Took Schmidt rebound hammer readings and UPV sound velocity scans on the compressor house columns (BLDG-COMP-02)",
        "status_note": "Uniform compressive strength indicated across all 12 test locations; no subsurface voids."
    },
    {
        "date": "2026-08-18",
        "location_note": "Process Train A - Cracker Area",
        "activity_note": "Stood up heavy steel H-columns with 70-ton mobile crane and anchored with temporary wire rope guys on Train A (FND-TK-101)",
        "status_note": "Columns set plumb to within 3mm over 12m vertical height."
    },
    {
        "date": "2026-08-18",
        "location_note": "Process Train B - Reforming Unit",
        "activity_note": "Tensioned high-strength structural bolts on column base plates and moment connections around vessel FND-V-201",
        "status_note": "Direct tension indicators (DTIs) verified flattened to spec."
    },
    {
        "date": "2026-08-18",
        "location_note": "Crude Charge Pump Station",
        "activity_note": "Mounted lube oil skid console, ran stainless steel return lines and tied in the nitrogen accumulator vessel for P-101A",
        "status_note": "Tubing runs clamped to structural channels; pressure relief valve tagged."
    },
    {
        "date": "2026-08-18",
        "location_note": "Fuel Gas Conditioning Skid",
        "activity_note": "Hung variable spring supports beneath fuel gas header (SKID-FG-01) and adjusted turnbuckles to cold design preset position",
        "status_note": "Spring travel pins pulled and locked in cold-load position."
    },
    {
        "date": "2026-08-18",
        "location_note": "Overhead Steam Distribution Header",
        "activity_note": "Circulated alkaline degreaser and citric acid chemical pickle solution through main lube oil piping loops on HDR-STM-01",
        "status_note": "Passivation completed; millipore filter membrane test passed clean."
    },
    {
        "date": "2026-08-18",
        "location_note": "Outdoor Transformer Yard - TR-01 Bay",
        "activity_note": "Packed intumescent firestop pillows and compound into cable tray wall openings between transformer bay and switchroom (XFMR-33-11KV-01)",
        "status_note": "2-hour fire rated seal completed and certified."
    },
    {
        "date": "2026-08-18",
        "location_note": "Process Train B - Cable Trench Corridor",
        "activity_note": "Landed incoming power feeds and landed control wires onto terminal blocks inside MCC-B breaker cubicles for TRNCH-ELEC-02",
        "status_note": "All terminations tug-tested and labeled per schematic diagram."
    },
    {
        "date": "2026-08-18",
        "location_note": "Plant High-Mast Yard Lighting Towers",
        "activity_note": "Assembled steel battery stands, placed individual 2V stationary lead-acid cells, and torqued inter-cell bus links (LIGHT-MAST-01)",
        "status_note": "Applied anti-corrosion grease on lead terminal posts; open-circuit bank voltage 126V DC."
    },
    {
        "date": "2026-08-18",
        "location_note": "Main Substation 33kV Switchgear Room",
        "activity_note": "Injected secondary current using Omicron test kit to calibrate phase overcurrent and earth fault protection relays (SWG-33KV-01)",
        "status_note": "Trip curves verified; breaker trip timing recorded at 38 milliseconds."
    },
]

# -------------------------------------------------------------
# 3. Ground Truth Mapping
# -------------------------------------------------------------

GROUND_TRUTH_DATA = {
    "metadata": {
        "dataset_name": "ProgressBridge AI Evaluation Benchmark",
        "description": "Ground truth mappings linking field daily reports and progress spreadsheets to L5/L6 baseline schedule activities",
        "total_files": 6,
        "total_entries": 47,
        "matched_entries": 42,
        "unmatched_entries": 5,
        "disciplines": ["Civil", "Mechanical", "Electrical"],
    },
    "entries": [
        # Report 1 entries
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 1,
            "section": "1. Storm Drainage Trenching (Reforming Unit)",
            "raw_text": "Backhoe operator finished digging the storm drain trench alongside Train B near foundation FND-V-201. Reached about 45 linear meters today. Trench bottom is firm, slope checked with laser level.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0002",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to excavation for foundation and storm drainage at Process Train B / FND-V-201."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 2,
            "section": "2. Pipe Rack Subgrade Prep",
            "raw_text": "Roller operator ran passes over the subgrade soil between Grid A and G along the main pipe rack corridor (STR-PR-101). QA technician completed three nuclear gauge moisture/density tests this afternoon; all hit 96% modified Proctor, meeting specification.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0003",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to subgrade soil compaction and in-situ moisture-density nuclear testing at STR-PR-101."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 3,
            "section": "3. Aggregate Base Course at Cooling Tower",
            "raw_text": "Spread and compacted the 150mm crushed stone foundation layer over the cooling tower basin footprint (CT-BASIN-01). Grader and 10-ton vibrating roller finished the south half.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0005",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to aggregate base course / slope stone work at Cooling Tower Basin Area (CT-BASIN-01)."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 4,
            "section": "4. Blinding Layer Pour (Compressor Bay)",
            "raw_text": "Mixed and placed the 75mm lean concrete blinding mud mat for the compressor building base slab (BLDG-COMP-01). Surface was struck off flat and covered for overnight setting.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0008",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to concrete foundation / blinding works at Compressor House Bay 1-3 (BLDG-COMP-01)."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 5,
            "section": "5. Rebar Cage Erection (CCR Building)",
            "raw_text": "Ironworkers hoisted and tied the heavy #8 and #10 high-yield rebar cages for the control building foundation mats (BLDG-CCR). All corner lap splices and spacer chairs inspected and approved by third-party inspector.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0012",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to rebar cage and formwork at Central Control Room Building (BLDG-CCR)."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 6,
            "section": "6. Effluent Basin Anchor Bolts",
            "raw_text": "Survey team set up optical levels and locked in the galvanized anchor bolt assemblies with wooden templates at the ETP basin foundation (ETP-BASIN-01) before tomorrow's concrete pour.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0013",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to anchor bolts & rebar fixing at Effluent Treatment Plant Basin (ETP-BASIN-01)."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 7,
            "section": "7. Lab Testing (Demin Tank Foundation)",
            "raw_text": "Crushed the 7-day test cylinders from the demin water tank pad pour (FND-DM-TK01). Average strength came in at 28.4 MPa, on track to easily hit 35 MPa 28-day requirement.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0020",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to concrete testing / slab works at Demineralized Water Storage Area (FND-DM-TK01)."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 8,
            "section": "8. Steelwork Bolting on Main Rack",
            "raw_text": "Ironworker crew torqued up all the HSFG connection bolts on the lower tier steel beams along pipe rack STR-PR-101. Verified 100% of bolts with calibrated torque wrench and applied yellow paint marks.",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0028",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to structural steel bolting and grouting at Main Pipe Rack Corridor (STR-PR-101)."
        },
        {
            "source_file": "daily_site_report_civil_2026-08-14.txt",
            "entry_index": 9,
            "section": "9. Supervisor Vehicle Maintenance",
            "raw_text": "Site mechanic spent 3 hours replacing the alternator and battery on site supervisor's Toyota Hilux pickup (Vehicle #CIV-04) near the security gate.",
            "discipline": "Civil",
            "expected_activity_id": "unmatched",
            "is_matched": False,
            "rephrasing_type": "deliberate_non_match",
            "notes": "Deliberate non-match: non-project vehicle maintenance to test exception handling & review queue."
        },

        # Report 2 entries
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 1,
            "section": "Shell-and-Tube Exchanger Lift",
            "raw_text": "Mobilized 150-ton mobile crane at Process Train A. Successfully lifted the horizontal shell-and-tube exchanger (V-101) and set it dead center onto its concrete saddle supports.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0001",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Rig, crane hoist and set horizontal shell-and-tube heat exchanger onto saddle supports at V-101."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 2,
            "section": "Crude Pump Baseplate Setting",
            "raw_text": "Placed the centrifugal multistage crude charge pump skid (K-102A) onto the inertia block in the booster compression bay. Completed initial rough leveling with machinist shims.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0002",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Position centrifugal multi-stage crude pump and rough-align baseplate at K-102A."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 3,
            "section": "Pipe Rack Tier 2 Spool Erection",
            "raw_text": "Crane hoisted the heavy pre-fab 12-inch schedule 80 carbon steel spool into position on the main pipe rack corridor tier 2 (PR-TIER-02). Secured temporarily with drift pins.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0012",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Rig and erect pre-fabricated 12-inch carbon steel schedule 80 pipe spools at PR-TIER-02."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 4,
            "section": "Stainless Steel Discharge Line Fit-Up",
            "raw_text": "Welders completed fit-up on the 8-inch 316L stainless line coming off exchanger battery south (E-201A/B). Tack-welded 4 butt joints under argon purge backing.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0013",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Fit-up and full penetration butt weld on 8-inch stainless steel process line at E-201A/B."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 5,
            "section": "High-Pressure Gas Header Welding",
            "raw_text": "Two certified 6G pipe welders completed TIG root pass followed by SMAW hot and cap passes on HP gas header at Exchanger Battery North (E-202A/B). Visual inspection passed cleanly.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0014",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to GTAW root welding and low-hydrogen SMAW fill/cap on HP gas header at E-202A/B."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 6,
            "section": "Cooling Water Valve Installation",
            "raw_text": "Installed three Class 600 isolation valves (two gate, one check) at cooling water station CW-PUMP-02. Replaced all temporary shipping seals with brand new graphite-filled spiral wound gaskets.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0009",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to valve installation & assembly at Cooling Water Circulation Station (CW-PUMP-02)."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 7,
            "section": "Flange Torquing",
            "raw_text": "Bolted up the 16-inch nozzle connection at tank farm manifold (MANIFOLD-TF01). Applied star-pattern tightening in 3 stages up to 480 N-m in strict accordance with ASME PCC-1 specs.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0016",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Controlled cross-pattern torque tightening on 16-inch flange connection (ASME PCC-1) at MANIFOLD-TF01."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 8,
            "section": "Pipe Support Teflon Shoes",
            "raw_text": "Mounted 14 Teflon/PTFE sliding guide shoes under process lines at instrument air skid (SKID-IA-01).",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0018",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Mount PTFE teflon sliding pipe shoes and structural guide clamps at SKID-IA-01."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 9,
            "section": "Hydrotest Package Hold",
            "raw_text": "Filled and pressurized the crude manifold piping spool assembly to 150% rated design pressure (36.5 bar). Held hold period for 2 hours with zero pressure drop. Dewatered and blown dry with utility air.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0024",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Hydrostatic pressure test on piping spool assembly at 1.5x design pressure (HDR-STM-01 / manifold)."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 10,
            "section": "Steam Header Lagging",
            "raw_text": "Thermal insulation gang fitted preformed rockwool / mineral wool blankets over 30 meters of overhead steam header line (HDR-STM-01).",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0028",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Fitting high-density rockwool / mineral wool insulation shells on steam headers."
        },
        {
            "source_file": "daily_shift_log_mechanical_2026-08-15.txt",
            "entry_index": 11,
            "section": "Tool Container Relocation",
            "raw_text": "Rigging crew used 25-ton yard crane to relocate 2 empty tool shipping containers from laydown yard C to contractor staging area behind perimeter fence.",
            "discipline": "Mechanical",
            "expected_activity_id": "unmatched",
            "is_matched": False,
            "rephrasing_type": "deliberate_non_match",
            "notes": "Deliberate non-match: laydown yard container relocation."
        },

        # Report 3 entries
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 1,
            "section": "Substation 33kV Cable Tray",
            "raw_text": "Electrical crew finished putting up 42 meters of the 450mm perforated galvanized tray raceways inside the 33kV switchgear room ceiling space (SWG-33KV-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0001",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Install heavy-duty perforated galvanized steel cable trays (450mm width) at SWG-33KV-01."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 2,
            "section": "11kV Room Ladder Trays",
            "raw_text": "Bracket fabricators welded heavy-duty unistrut wall supports and hung the vertical ladder cable rack running up to the 11kV switchboard cubicles (SWG-11KV-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0002",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Erect vertical ladder cable trays and weld structural support brackets at SWG-11KV-01."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 3,
            "section": "MCC-01 Conduit Runs",
            "raw_text": "Electricians bent and threaded 2-inch rigid steel conduits (RGS) connecting MCC-Train A (MCC-TRAIN-A) to local push-button stations.",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0003",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Bend, thread and mount rigid galvanized steel (RGS) conduit runs at MCC-TRAIN-A."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 4,
            "section": "Explosion-Proof Box Sealing",
            "raw_text": "Mounted hazardous-area Ex-d junction boxes and poured Chico sealing compound at MCC-02 room (MCC-TRAIN-B).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0004",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Install explosion-proof Class 1 Div 2 junction boxes and Chico compound seal fittings at MCC-TRAIN-B."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 5,
            "section": "33kV Duct Bank Cable Pull",
            "raw_text": "Winched the 3-core 240 sq mm 33kV high voltage armored cable through the concrete duct bank into the CCR battery equipment room (UPS-BAT-ROOM).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0007",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Pulling 33kV 3-core 240 sq mm MV armored cable through concrete duct bank at UPS-BAT-ROOM."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 6,
            "section": "Lug Crimping",
            "raw_text": "Used 12-ton hydraulic crimper with hex dies to crimp heavy tinned copper lugs onto phase conductors in trench corridor A (TRNCH-ELEC-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0011",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Crimp tinned copper lugs onto power conductors using hydraulic crimping tool at TRNCH-ELEC-01."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 7,
            "section": "33kV Cold-Shrink Terminations",
            "raw_text": "Certified jointer completed 33kV cold-shrink stress cone termination kits on top tier pipe rack cable tray run (TRAY-RACK-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0013",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Making off 33kV high voltage stress cone cold shrink terminations on XLPE cable at TRAY-RACK-01."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 8,
            "section": "Earth Rods & Earth Resistance",
            "raw_text": "Sunk three 3-meter copper-bonded ground rods near ESD panel enclosure (ESD-PNL-01). Fall-of-potential test gave 1.8 ohms, comfortably under the 2.0 ohm limit.",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0023",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Drive copper-bonded ground rods and measure individual soil earth resistance at ESD-PNL-01."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 9,
            "section": "Cadweld Earthing Connections",
            "raw_text": "Completed 8 exothermic thermite Cadweld shots bonding 50x6mm copper tape to perimeter grounding grid at Fire & Gas panel shelter (FGS-PNL-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0024",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Cadweld exothermic bond 50x6mm bare copper ground tape to plant grounding grid at FGS-PNL-01."
        },
        {
            "source_file": "site_diary_electrical_2026-08-16.txt",
            "entry_index": 10,
            "section": "Temporary Dewatering of Fabrication Yard",
            "raw_text": "Emergency callout: Cleared debris and pumped standing storm runoff out of temporary fabrication yard ditch after torrential overnight rain. Took 4 laborers and 1 submersible pump roughly 4 hours.",
            "discipline": "Electrical",
            "expected_activity_id": "unmatched",
            "is_matched": False,
            "rephrasing_type": "deliberate_non_match",
            "notes": "Deliberate non-match: unbudgeted storm water puddle pumping in temporary yard."
        },

        # Report 4 entries
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 1,
            "section": "Cable Trench Covers",
            "raw_text": "Installed precast concrete trench channels and seated removable checkered steel covers along the Emergency Generator pad (FND-EDG-01).",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0025",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Install precast concrete cable trench troughs and removable checkered covers at FND-EDG-01."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 2,
            "section": "Substation Roof Waterproofing",
            "raw_text": "Applied primer and torch-on bituminous waterproofing membrane sheets across the secondary substation roof slab (BLDG-SS-02).",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0036",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Bituminous waterproofing membrane application on substation flat roof slab."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 3,
            "section": "Chemical Dosing Package Setting",
            "raw_text": "Placed the modular chemical injection package (SKID-CHEM-01) onto concrete anchor plinths and aligned hold-down anchor bolts.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0008",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Rig and position modular chemical injection skid onto anchor foundations."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 4,
            "section": "Nitrogen Leak Testing on Fin-Fan Deck",
            "raw_text": "Pressurized fin-fan condenser coils (AC-101) with nitrogen to 7 bar and swabbed Snoop bubble fluid across all flange joints; zero leakage found.",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0025",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Pneumatic line tightness leak test with nitrogen and soapy bubble solution."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 5,
            "section": "Steam Traced Line Insulation",
            "raw_text": "Lagging crew wrapped preformed mineral wool insulation jackets on the overhead steam header (HDR-STM-01).",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0028",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Fitting high-density rockwool / mineral wool insulation shells on steam headers."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 6,
            "section": "Switchgear Cubicle Erection",
            "raw_text": "Erected 11kV vacuum circuit breaker switchgear cubicles and torque-bolted copper busbar links inside the variable frequency drive shelter (VFD-PANEL-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0018",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Erect 11kV vacuum circuit breaker switchgear cubicles and bolt copper busbar joints at VFD-PANEL-01."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 7,
            "section": "Megger Insulation Resistance Testing",
            "raw_text": "Conducted 1000V DC insulation resistance Megger checks on cathodic protection power feed cables (CP-TRU-01); all phases measured >500 Mega-ohms.",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0025",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Perform 5kV / 1kV Megger insulation resistance testing on power feeder cables at CP-TRU-01."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 8,
            "section": "Field Transmitter Calibration",
            "raw_text": "Calibrated pressure transmitters using HART 475 communicator and verified 4-20mA loop signals back to transformer TR-01 monitoring rack (XFMR-33-11KV-01).",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0030",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Install and calibrate field smart pressure and temperature transmitters with HART communicator."
        },
        {
            "source_file": "daily_site_report_multidiscipline_2026-08-19.txt",
            "entry_index": 9,
            "section": "Visitor Viewing Stand Assembly",
            "raw_text": "Carpenters erected a temporary wooden viewing platform and safety barricade for visiting OIL executive management delegation near north gate.",
            "discipline": "Civil",
            "expected_activity_id": "unmatched",
            "is_matched": False,
            "rephrasing_type": "deliberate_non_match",
            "notes": "Deliberate non-match: temporary event staging platform."
        },

        # Spreadsheet 1 entries
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 1,
            "section": "Row 1",
            "raw_text": "Tamped and compacted backfill gravel in 200mm layers around Tank 01 dike retaining walls (BUND-TK-01)",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0008",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Backfilling foundation trenches with approved granular fill in 200mm lifts."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 2,
            "section": "Row 2",
            "raw_text": "Assembled plywood shuttering and heavy steel waler supports for deep foundation pedestals (BLDG-COMP-01)",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0008",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Erect timber and steel panel formwork with bracing for deep pedestal footing."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 3,
            "section": "Row 3",
            "raw_text": "Placed ribbed rubber waterstop profiles across construction cold joints on Train A cracker slab (FND-TK-101)",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0021",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Waterstop strip installation and alignment at cold concrete pour joints."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 4,
            "section": "Row 4",
            "raw_text": "Laid 8-inch solid cement block walls with horizontal bond beams at pipe rack support shelter (STR-PR-101)",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0030",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Lay solid concrete block masonry wall with reinforced concrete bond beams."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 5,
            "section": "Row 5",
            "raw_text": "Set up dual laser alignment sensors on compressor-motor coupling and dialed in hot-alignment offsets for K-102B",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0003",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Precision laser alignment of motor-pump shaft coupling and thermal offset check at K-102B."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 6,
            "section": "Row 6",
            "raw_text": "Checked soft-foot on pump feet using dial gauges and inserted 0.2mm precision SS shims under K-202A",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0004",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Dial indicator soft-foot measurement and precision stainless steel shimming at K-202A."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 7,
            "section": "Row 7",
            "raw_text": "Carried out X-ray radiography and magnetic particle inspection across 14 field butt welds on E-201A/B piping",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0013",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to 100% Non-Destructive Testing (radiographic and magnetic particle) on field welds."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 8,
            "section": "Row 8",
            "raw_text": "Pressurized fin-fan cooler coils (AC-101) with nitrogen gas to 7 bar and brush-tested all threaded connections with Snoop soap liquid",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0025",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Pneumatic line tightness leak test with nitrogen and soapy bubble solution at AC-101."
        },
        {
            "source_file": "daily_progress_log_civil_mechanical_2026-08-17.csv",
            "entry_index": 9,
            "section": "Row 9",
            "raw_text": "Assembled temporary wooden scaffolding and privacy screens for visiting client delegation at south perimeter gate",
            "discipline": "Civil",
            "expected_activity_id": "unmatched",
            "is_matched": False,
            "rephrasing_type": "deliberate_non_match",
            "notes": "Deliberate non-match: temporary visitor privacy screening."
        },

        # Spreadsheet 2 entries
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 1,
            "section": "Row 1",
            "raw_text": "Took Schmidt rebound hammer readings and UPV sound velocity scans on the compressor house columns (BLDG-COMP-02)",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0009",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Post-pour ultrasonic pulse velocity (UPV) and rebound hammer testing."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 2,
            "section": "Row 2",
            "raw_text": "Stood up heavy steel H-columns with 70-ton mobile crane and anchored with temporary wire rope guys on Train A (FND-TK-101)",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0026",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Erect primary structural steel columns and temporary guy-wire support."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 3,
            "section": "Row 3",
            "raw_text": "Tensioned high-strength structural bolts on column base plates and moment connections around vessel FND-V-201",
            "discipline": "Civil",
            "expected_activity_id": "ACT-CIV-0027",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to High-strength friction grip (HSFG) bolt tightening and torque check for FND-V-201."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 4,
            "section": "Row 4",
            "raw_text": "Mounted lube oil skid console, ran stainless steel return lines and tied in the nitrogen accumulator vessel for P-101A",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0006",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Install lube oil console, interconnecting SS tubing, and accumulator vessel at P-101A."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 5,
            "section": "Row 5",
            "raw_text": "Hung variable spring supports beneath fuel gas header (SKID-FG-01) and adjusted turnbuckles to cold design preset position",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0017",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Install variable spring pipe hangers and set cold travel preset stops at SKID-FG-01."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 6,
            "section": "Row 6",
            "raw_text": "Circulated alkaline degreaser and citric acid chemical pickle solution through main lube oil piping loops on HDR-STM-01",
            "discipline": "Mechanical",
            "expected_activity_id": "ACT-MEC-0026",
            "is_matched": True,
            "rephrasing_type": "significant_rephrase",
            "notes": "Maps to Chemical cleaning, degreasing, and citric acid passivation of lube oil lines."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 7,
            "section": "Row 7",
            "raw_text": "Packed intumescent firestop pillows and compound into cable tray wall openings between transformer bay and switchroom (XFMR-33-11KV-01)",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0005",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Apply certified intumescent firestop mortar and pillows at cable wall penetrations at XFMR-33-11KV-01."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 8,
            "section": "Row 8",
            "raw_text": "Landed incoming power feeds and landed control wires onto terminal blocks inside MCC-B breaker cubicles for TRNCH-ELEC-02",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0012",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Terminate power leads and control wiring onto terminal strips inside MCC breaker cubicle at TRNCH-ELEC-02."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 9,
            "section": "Row 9",
            "raw_text": "Assembled steel battery stands, placed individual 2V stationary lead-acid cells, and torqued inter-cell bus links (LIGHT-MAST-01)",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0020",
            "is_matched": True,
            "rephrasing_type": "informal_field_voice",
            "notes": "Maps to Install battery bank racks, mount 2V lead-acid cells, and torque cell interlinks at LIGHT-MAST-01."
        },
        {
            "source_file": "contractor_daily_log_electrical_piping_2026-08-18.csv",
            "entry_index": 10,
            "section": "Row 10",
            "raw_text": "Injected secondary current using Omicron test kit to calibrate phase overcurrent and earth fault protection relays (SWG-33KV-01)",
            "discipline": "Electrical",
            "expected_activity_id": "ACT-ELE-0026",
            "is_matched": True,
            "rephrasing_type": "semantic_paraphrase",
            "notes": "Maps to Secondary current injection testing of numerical protection relays (50/51/51N) at SWG-33KV-01."
        },
    ]
}


def generate_all_reports():
    """Write text reports, CSV spreadsheets, and ground_truth.json to both locations."""
    targets = [SUPABASE_SEED_REPORTS, DATA_REPORTS]

    for target_dir in targets:
        # Write Report 1
        (target_dir / REPORT_1_FILENAME).write_text(REPORT_1_TEXT, encoding="utf-8")
        # Write Report 2
        (target_dir / REPORT_2_FILENAME).write_text(REPORT_2_TEXT, encoding="utf-8")
        # Write Report 3
        (target_dir / REPORT_3_FILENAME).write_text(REPORT_3_TEXT, encoding="utf-8")
        # Write Report 4
        (target_dir / REPORT_4_FILENAME).write_text(REPORT_4_TEXT, encoding="utf-8")

        # Write Spreadsheet 1
        with open(target_dir / SPREADSHEET_1_FILENAME, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["date", "location_note", "activity_note", "status_note"])
            writer.writeheader()
            writer.writerows(SPREADSHEET_1_ROWS)

        # Write Spreadsheet 2
        with open(target_dir / SPREADSHEET_2_FILENAME, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["date", "location_note", "activity_note", "status_note"])
            writer.writeheader()
            writer.writerows(SPREADSHEET_2_ROWS)

        # Dynamically calculate exact metadata counts
        GROUND_TRUTH_DATA["metadata"]["total_entries"] = len(GROUND_TRUTH_DATA["entries"])
        GROUND_TRUTH_DATA["metadata"]["matched_entries"] = sum(1 for e in GROUND_TRUTH_DATA["entries"] if e["is_matched"])
        GROUND_TRUTH_DATA["metadata"]["unmatched_entries"] = sum(1 for e in GROUND_TRUTH_DATA["entries"] if not e["is_matched"])

        # Write Ground Truth JSON
        with open(target_dir / "ground_truth.json", "w", encoding="utf-8") as f:
            json.dump(GROUND_TRUTH_DATA, f, indent=2)

        print(f"[OK] Generated reports and ground_truth.json in: {target_dir}")


if __name__ == "__main__":
    generate_all_reports()
    print("\nGenerated Summary:")
    print("- 4 Free-text Daily Reports (.txt)")
    print("- 2 Daily Progress Spreadsheets (.csv)")
    print("- 1 Benchmark Ground Truth Mapping (ground_truth.json)")
    print(f"- Total evaluation entries: {len(GROUND_TRUTH_DATA['entries'])}")
    print(f"- Matched entries: {sum(1 for e in GROUND_TRUTH_DATA['entries'] if e['is_matched'])}")
    print(f"- Deliberate unmatched entries: {sum(1 for e in GROUND_TRUTH_DATA['entries'] if not e['is_matched'])}")
