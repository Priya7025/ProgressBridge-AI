"""
Generate synthetic dataset for ProgressBridge AI (SIH26122):
- supabase/seed/schedule_activities.csv: 890 L5/L6 activities across Civil, Mechanical, Electrical, Piping, Instrumentation, HSE
- data/schedule_activities.csv: Synchronized copy for local scripts
- Includes realistic field engineering phrasing, 10-15% paraphrased variations for semantic matching,
  realistic 6-month project timeline, hierarchical WBS codes, and status distributions.
- Matches PRD Section 21 & 22 demo cases including PIP-2458 (Erect Line 24-XX).
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

# Fix seed for reproducible, high-quality generation
random.seed(42)

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
SUPABASE_SEED_DIR = WORKSPACE_ROOT / "supabase" / "seed"
DATA_DIR = WORKSPACE_ROOT / "data"
REPORTS_DIR = DATA_DIR / "sample_reports"

SUPABASE_SEED_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# Master Engineering Definitions: Locations & Assets
# -------------------------------------------------------------

CIVIL_LOCATIONS = [
    ("Process Train A - Cracker Area", "FND-TK-101", "Zone A"),
    ("Process Train B - Reforming Unit", "FND-V-201", "Zone B"),
    ("Main Pipe Rack Corridor - Grid A to G", "STR-PR-101", "Rack Corridor"),
    ("Main Pipe Rack Corridor - Grid H to M", "STR-PR-102", "Rack Corridor"),
    ("Cooling Tower Basin Area", "CT-BASIN-01", "Utilities Zone"),
    ("Substation SS-01 Yard", "BLDG-SS-01", "Substation Yard"),
    ("Secondary Substation SS-02", "BLDG-SS-02", "Substation Yard"),
    ("Compressor House Bay 1-3", "BLDG-COMP-01", "Compressor Area"),
    ("Compressor House Bay 4-6", "BLDG-COMP-02", "Compressor Area"),
    ("Crude Oil Storage Tank Farm 01", "BUND-TK-01", "Tank Farm East"),
    ("Crude Oil Storage Tank Farm 02", "BUND-TK-02", "Tank Farm West"),
    ("Central Control Room (CCR) Building", "BLDG-CCR", "Admin & Control Area"),
    ("Effluent Treatment Plant Basin", "ETP-BASIN-01", "Offsites"),
    ("Flare Knock-Out Area", "FND-KO-DRUM", "Flare Area"),
    ("Product Loading Gantry", "GANTRY-01", "Logistics Yard"),
    ("Utility Air & Nitrogen Yard", "FND-UTL-01", "Utilities Zone"),
    ("Perimeter Fence Line - Sector North", "SEC-FENCE-N", "Perimeter"),
    ("Perimeter Fence Line - Sector South", "SEC-FENCE-S", "Perimeter"),
    ("Plant Stormwater Main Culvert", "DRAIN-CULV-01", "Drainage Network"),
    ("Demineralized Water Storage Area", "FND-DM-TK01", "Water Treatment"),
    ("Firewater Reservoir Tank Pad", "FND-FW-TK01", "Fire Safety Area"),
    ("Transformer Bay Blast Walls", "WALL-BLAST-01", "Transformer Yard"),
    ("Raw Water Intake Pump Pit", "FND-RW-PIT01", "Intake Area"),
    ("Boiler Feedwater Treatment Shed", "BLDG-BFW-01", "Utilities Zone"),
    ("Emergency Generator Enclosure Pad", "FND-EDG-01", "Power House"),
]

MECH_LOCATIONS = [
    ("Process Train A - HP Separation Unit", "V-101", "Process Area 1"),
    ("Process Train A - Booster Compression Bay", "K-102A", "Compression Area"),
    ("Process Train A - Booster Compression Standby", "K-102B", "Compression Area"),
    ("Process Train B - LP Compression Bay", "K-202A", "Compression Area"),
    ("Process Train B - LP Compression Bay 2", "K-202B", "Compression Area"),
    ("Crude Charge Pump Station", "P-101A", "Pump Bay 1"),
    ("Crude Charge Pump Station - Standby", "P-101B", "Pump Bay 1"),
    ("Boiler Feedwater Multi-Stage Pumps", "P-201A/B", "Pump Bay 2"),
    ("Cooling Water Circulation Station", "CW-PUMP-02", "Utilities Pump Station"),
    ("Fire Water Main Diesel Pump Skid", "FW-PUMP-01", "Fire Pump House"),
    ("Main Pipe Rack Corridor - Tier 1", "PR-TIER-01", "Rack Corridor"),
    ("Main Pipe Rack Corridor - Tier 2", "PR-TIER-02", "Rack Corridor"),
    ("Heat Exchanger Battery - South", "E-201A/B", "Exchanger Bank"),
    ("Heat Exchanger Battery - North", "E-202A/B", "Exchanger Bank"),
    ("Air Cooled Fin-Fan Condenser Deck", "AC-101", "Top Deck Structure"),
    ("Tank Farm Manifold Area", "MANIFOLD-TF01", "Tank Farm East"),
    ("Fuel Gas Conditioning Skid", "SKID-FG-01", "Fuel Gas Area"),
    ("Instrument Air & Nitrogen Generator Skid", "SKID-IA-01", "Air Separation Unit"),
    ("Effluent Treatment Clarifier Skid", "ETP-SKID-01", "Offsites"),
    ("Flare Knock-Out & Seal Drum Station", "V-401", "Flare Area"),
    ("Slug Catcher Inlet Header", "SLUG-CATCH-01", "Inlet Receiving"),
    ("Chemical Injection Package Area", "SKID-CHEM-01", "Dosing Skid"),
    ("Product Metering & Prover Loop Skids", "SKID-METER-01", "Metering Station"),
    ("Overhead Steam Distribution Header", "HDR-STM-01", "Steam Network"),
    ("Amine Gas Sweetening Contactor Column", "C-301", "Treating Unit"),
]

ELEC_LOCATIONS = [
    ("Main Substation 33kV Switchgear Room", "SWG-33KV-01", "Substation 01"),
    ("Main Substation 11kV Switchgear Room", "SWG-11KV-01", "Substation 01"),
    ("Motor Control Center Room - MCC-01", "MCC-TRAIN-A", "Substation 01"),
    ("Motor Control Center Room - MCC-02", "MCC-TRAIN-B", "Substation 02"),
    ("Outdoor Transformer Yard - TR-01 Bay", "XFMR-33-11KV-01", "Transformer Yard"),
    ("Outdoor Transformer Yard - TR-02 Bay", "XFMR-11-0.4KV-01", "Transformer Yard"),
    ("Central Control Room - UPS & Battery Room", "UPS-BAT-ROOM", "CCR Annex"),
    ("Field Auxiliary Room (FAR-01)", "FAR-01", "Field Satellite"),
    ("Field Auxiliary Room (FAR-02)", "FAR-02", "Field Satellite"),
    ("Compressor Local Control Panel Area", "LCP-COMP-01", "Compressor Shelter"),
    ("Process Train A - Cable Trench Corridor", "TRNCH-ELEC-01", "Process Area 1"),
    ("Process Train B - Cable Trench Corridor", "TRNCH-ELEC-02", "Process Area 2"),
    ("Pipe Rack Cable Tray Level - Top Tier", "TRAY-RACK-01", "Rack Corridor"),
    ("Tank Farm Lighting & Earthing Perimeter", "ELEC-TF-01", "Tank Farm Area"),
    ("Cooling Water MCC Sub-Station", "MCC-CW-01", "Utilities Substation"),
    ("Product Dispatch Gantry Area", "ELEC-GANTRY-01", "Loading Area"),
    ("Emergency Diesel Generator Enclosure", "EDG-GEN-01", "Generator Room"),
    ("Variable Frequency Drive (VFD) Enclosure", "VFD-PANEL-01", "Power House"),
    ("Offsites Chemical Injection Shelter", "ELEC-SKID-01", "Offsites"),
    ("Plant High-Mast Yard Lighting Towers", "LIGHT-MAST-01", "Yard Lighting"),
    ("Instrument Earthing & Grounding Well Area", "EARTH-PIT-01", "Perimeter Grounding"),
    ("DCS Marshalling & System Cabinet Room", "DCS-CAB-01", "Control Building"),
    ("ESD Emergency Shutdown System Panel", "ESD-PNL-01", "Control Building"),
    ("Fire & Gas Detection (F&G) System Panel", "FGS-PNL-01", "Control Building"),
    ("Cathodic Protection Transformer Rectifier Unit", "CP-TRU-01", "Corrosion Station"),
]

PIPING_LOCATIONS = [
    ("North Unit - Process Train A", "Line 24-XX", "North Unit"),
    ("South Unit - Reforming Area", "Line 18-B", "South Unit"),
    ("Main Pipe Rack Corridor - Tier 1", "Line 36-CS-101", "Rack Corridor"),
    ("Main Pipe Rack Corridor - Tier 2", "Line 24-CS-102", "Rack Corridor"),
    ("Crude Distillation Column Unit", "Line 30-CDU-01", "Distillation Area"),
    ("Flare Header Knockout Network", "Line 42-FL-201", "Flare Area"),
    ("Overhead Superheated Steam Header", "Line 12-STM-301", "Steam Network"),
    ("Acid Gas Amine Contactor Tie-In", "Line 08-AG-401", "Treating Unit"),
    ("Cooling Water Supply/Return Loop", "Line 28-CW-501", "Utilities Zone"),
    ("Boiler Feedwater HP Discharge Line", "Line 06-BFW-601", "Boiler Area"),
    ("Hydrocarbon Slop Oil Drain Header", "Line 04-SL-701", "Tank Farm Area"),
    ("Demineralized Water Distribution Line", "Line 10-DM-801", "Water Treatment"),
    ("Methanol Injection High-Pressure Tubing", "Line 02-ME-901", "Dosing Skid"),
    ("Fuel Gas Supply & Conditioning Loop", "Line 14-FG-102", "Fuel Gas Area"),
    ("Amine Regeneration Bottoms Line", "Line 16-AM-202", "Treating Unit"),
    ("Wet Gas Compressor Suction Header", "Line 20-CG-302", "Compressor Bay"),
    ("Effluent Transfer Pipeline", "Line 12-ET-402", "Offsites"),
    ("Crude Tank Farm Loading Manifold", "Line 24-TF-502", "Tank Farm East"),
    ("Firewater Ring Main Header Sector East", "Line 16-FW-602", "Fire Safety Area"),
    ("LPG Storage Mounded Bullet Tie-In", "Line 08-LP-702", "LPG Area"),
]

INST_LOCATIONS = [
    ("Central Control Room (CCR) Marshalling Cabinets", "DCS-MARSH-01", "Control Building"),
    ("Field Auxiliary Room FAR-01", "FAR-PNL-01", "Field Satellite"),
    ("Process Train A - Instrument Stanchion Corridor", "INST-TRAIN-A", "Process Area 1"),
    ("Tank Farm East Radar Level Gauge Network", "LT-TK-101", "Tank Farm East"),
    ("Booster Compressor Anti-Surge Control Station", "ASV-K102", "Compressor Area"),
    ("Emergency Shutdown System (ESD) Logic Rack", "ESD-SYS-01", "Control Building"),
    ("Plant Wide Optical Flame Detector Ring", "FGS-DET-01", "Safety Perimeter"),
    ("Flare Stack Ultrasonic Gas Flow Meter Skid", "FT-FL-401", "Flare Area"),
    ("Process Analyzer Fast-Loop Conditioning House", "ANALYZER-SH-01", "Analyzer House"),
    ("Boiler Steam Drum Differential Level Transmitter Rack", "LT-STM-201", "Utilities Zone"),
]

HSE_LOCATIONS = [
    ("Plant Firewater Ring Main Hydrant Post Grid", "HYDRANT-POST-01", "Fire Safety Area"),
    ("Sector North Emergency Evacuation Assembly Point", "EAP-NORTH-01", "Perimeter"),
    ("Process Area Safety Shower & Emergency Eyewash Stations", "SS-EW-01", "Process Area 1"),
    ("Hazardous Chemical Storage Drum Containment Area", "HAZMAT-YARD-01", "Chemical Storage"),
    ("Perimeter Flare Radiation Barrier Exclusion Zone", "FLARE-RAD-ZONE", "Flare Perimeter"),
    ("Main 33kV Transformer Deluge Foam/Water Spray Skids", "DELUGE-XFMR-01", "Transformer Yard"),
    ("Compressor House High-Expansion Foam Fire Suppression Skid", "FOAM-SKID-01", "Compressor Shelter"),
    ("Heavy Equipment Laydown Scaffolding Erection Zone", "SCAFF-ZONE-A", "Laydown Yard"),
    ("Process Train A Confined Space Vessel Manways", "CSE-VESSEL-101", "Process Area 1"),
    ("Radiography Non-Destructive Testing Exclusion Barrier", "NDT-RAD-EXCL", "Process Area 2"),
]

# -------------------------------------------------------------
# Detailed L5/L6 Activity Templates with Semantic Variants
# -------------------------------------------------------------

CIVIL_WORK_PACKAGES = [
    (
        "Rough grading and bulk earth excavation down to founding level",
        "1.01", 0, 8,
        [
            "Bulk soil excavation and rough site grading to design formation level",
            "Site earthmoving and rough cut excavation to founding elevation",
            "Heavy excavation and leveling of site earthworks down to formation",
        ]
    ),
    (
        "Excavation for foundation footing and equipment plinths",
        "1.02", 1, 6,
        [
            "Pit digging and foundation trench excavation for equipment plinth",
            "Excavate foundation footing pit and plinth bases",
            "Soil trenching and pit excavation for structural equipment foundations",
        ]
    ),
    (
        "Subgrade soil compaction and in-situ moisture-density nuclear testing",
        "1.03", 1, 4,
        [
            "Subgrade roller compaction with field moisture-density nuclear gauge checks",
            "Vibratory compaction of subgrade soil and in-situ Proctor density testing",
            "Compacting subgrade layer and conducting nuclear density tests",
        ]
    ),
    (
        "Laying and compacting 150mm crushed aggregate base course",
        "1.04", 2, 5,
        [
            "Spreading, grading, and compacting 150mm graded stone base course",
            "Placement and rolling of 150mm crushed rock foundation sub-base",
            "150mm aggregate base spreading and vibratory roller compaction",
        ]
    ),
    (
        "Slope trimming and placement of stone pitching along stormwater canal",
        "1.05", 2, 6,
        [
            "Side slope dressing and dry stone pitching lining for drainage ditch",
            "Embankment slope trimming and rip-rap stone pitching placement",
            "Trimming canal bank and installing stone pitching erosion protection",
        ]
    ),
    (
        "Geotextile membrane installation beneath heavy haul road embankment",
        "1.06", 3, 3,
        [
            "Laying non-woven geotextile separation fabric under access road base",
            "Spreading woven stabilization geotextile sheet across subgrade",
            "Installing subsurface separation geotextile membrane for haul road",
        ]
    ),
    (
        "Excavation sump dewatering and mud clearance before blinding",
        "1.07", 3, 3,
        [
            "Pumping out ponded ground water and removing soft sludge from foundation pit",
            "Sump pump dewatering and mucking out foundation excavation bed",
            "Pit dewatering and manual clearing of silt layer prior to mud mat",
        ]
    ),
    (
        "Backfilling foundation trenches with approved granular fill in 200mm lifts",
        "1.08", 4, 7,
        [
            "Layered trench backfilling with granular soil and plate compactor passes",
            "Placement of granular backfill in 200mm compacted layers around footings",
            "Compacting select backfill material in 200mm lifts along foundation walls",
        ]
    ),
    (
        "Plate load bearing capacity testing on compacted formation soil",
        "1.09", 4, 2,
        [
            "Static plate load test to verify subgrade allowable bearing pressure",
            "Conducting in-situ plate bearing test on compacted earth formation",
            "Plate bearing capacity verification test using hydraulic reaction jack",
        ]
    ),
    (
        "Excavation and trench shoring for underground storm drainage culvert",
        "1.10", 5, 6,
        [
            "Trenching and installing hydraulic shoring boxes for storm water pipe run",
            "Culvert trench excavation with steel trench shield safety shoring",
            "Digging deep drainage trench and placing aluminum trench shoring panels",
        ]
    ),
    (
        "Pour 75mm plain cement concrete (PCC) lean blinding mud mat layer",
        "2.01", 5, 3,
        [
            "Placing 75mm lean concrete blinding slab on prepared excavation bottom",
            "Casting 75mm PCC mud mat substrate prior to structural reinforcement",
            "Pouring lean concrete blinding layer over compacted earth sub-base",
        ]
    ),
    (
        "Erect timber and steel panel formwork with bracing for deep pedestal footing",
        "2.02", 6, 6,
        [
            "Assembling and bracing modular steel-ply formwork for heavy plinth",
            "Fixing vertical shuttering panels and tie rods for pedestal foundation",
            "Installing side formwork panels and diagonal steel pipe bracing for footings",
        ]
    ),
    (
        "Fixing reinforcement rebar steel and hoisting main foundation cage",
        "2.03", 7, 7,
        [
            "Tying high-yield deformed steel rebar cage and crane-lifting into pit",
            "Cutting, bending, and placing bottom/top structural rebar mats for footing",
            "Positioning prefabricated rebar reinforcement cage on concrete cover spacers",
        ]
    ),
    (
        "Setting anchor bolt cluster assemblies with steel templates and optical leveling",
        "2.04", 8, 4,
        [
            "Aligning and fixing foundation anchor bolts using laser level and wooden jigs",
            "Securing galvanized foundation hold-down bolts with positioning template frame",
            "Setting foundation bolt groups to design elevation using precision total station",
        ]
    ),
    (
        "Cast grade M35 structural concrete for main foundation slab and plinth",
        "2.05", 9, 5,
        [
            "Pumping and vibrating grade M35 ready-mix concrete into foundation formwork",
            "Pouring heavy structural concrete with high-frequency immersion vibrators",
            "Monolithic concrete placement for main equipment foundation slab",
        ]
    ),
    (
        "Apply liquid membrane curing compound and wet hessian burlap covering",
        "2.06", 10, 4,
        [
            "Spraying acrylic curing compound and maintaining damp hessian blanket wrap",
            "Applying resin curing sealant and water ponding on green concrete slab",
            "Covering poured concrete with wet burlap rolls for continuous hydration curing",
        ]
    ),
    (
        "Post-pour ultrasonic pulse velocity (UPV) and rebound hammer testing",
        "2.07", 10, 3,
        [
            "Non-destructive testing of hardened concrete using Schmidt hammer and UPV scan",
            "Conducting UPV acoustic velocity and Swiss rebound hammer testing on plinths",
            "Testing concrete uniformity and surface hardness via ultrasonic pulse velocity",
        ]
    ),
    (
        "Formwork stripping and concrete honeycombing surface patch repair",
        "2.08", 11, 4,
        [
            "Dismantling pedestal shuttering panels and applying non-shrink repair grout",
            "Stripping formwork forms and patching surface air voids with epoxy mortar",
            "De-shuttering foundation sides and finishing exposed concrete surfaces",
        ]
    ),
    (
        "Construct reinforced concrete blast-resistant protection wall",
        "2.09", 12, 10,
        [
            "Casting 300mm thick heavy reinforced concrete blast containment barrier",
            "Formwork, rebar fixing and pour for reinforced concrete blast-proof enclosure",
            "Building structural reinforced concrete protective blast barrier wall",
        ]
    ),
    (
        "Compressive strength crushing test on 7-day and 28-day concrete cube samples",
        "2.10", 12, 2,
        [
            "Lab hydraulic press crushing of 150mm concrete test cubes for compressive rating",
            "Testing 7/28 day concrete cube breaking strength in accordance with ASTM C39",
            "Compressive load testing of cured concrete cylinder samples in testing laboratory",
        ]
    ),
]

MECH_WORK_PACKAGES = [
    (
        "Rig, crane hoist and set horizontal shell-and-tube heat exchanger onto saddle supports",
        "1.01", 6, 5,
        [
            "Mobile crane rigging and lowering shell-and-tube exchanger onto anchor saddles",
            "Hoisting and setting horizontal heat exchanger vessel onto concrete plinths",
            "Crane lift and positioning of process heat exchanger on structural saddle supports",
        ]
    ),
    (
        "Position centrifugal multi-stage crude pump and rough-align baseplate",
        "1.02", 7, 4,
        [
            "Setting multi-stage crude charge pump skid onto foundation plinth",
            "Lifting and rough shimming centrifugal crude oil pump baseplate",
            "Rigging and lowering pump skid onto equipment pad with machinist levels",
        ]
    ),
    (
        "Precision laser alignment of motor-pump shaft coupling and thermal offset check",
        "1.03", 8, 3,
        [
            "Dialing in laser shaft alignment on motor-pump coupling within 0.05mm tolerance",
            "Laser alignment verification and thermal growth calculation on drive coupling",
            "Aligning pump and driver shafts using dual laser optical sensor heads",
        ]
    ),
    (
        "Dial indicator soft-foot measurement and precision stainless steel shimming",
        "1.04", 8, 2,
        [
            "Checking machine frame soft foot with 0.01mm dial gauge and inserting SS shims",
            "Soft-foot elimination on pump skid feet using precision stainless shims",
            "Measuring and correcting equipment foot flatness and angular soft foot",
        ]
    ),
    (
        "Non-shrink epoxy grouting under heavy rotating equipment baseplate",
        "1.05", 9, 4,
        [
            "Mixing and pouring high-strength three-component epoxy grout under pump soleplate",
            "Placing flowable epoxy machinery grout beneath compressor base frame",
            "Epoxy pressure grouting under equipment baseplate with headbox technique",
        ]
    ),
    (
        "Install lube oil console, interconnecting SS tubing, and accumulator vessel",
        "1.06", 10, 5,
        [
            "Mounting auxiliary lube oil skid, routing 316SS tubing and connecting filters",
            "Installing compressor lube oil supply package and nitrogen bladder accumulator",
            "Assembling rotating equipment forced lubrication console and stainless piping",
        ]
    ),
    (
        "Torque-tighten foundation anchor bolts using calibrated hydraulic torque wrench",
        "1.07", 10, 3,
        [
            "Final torqueing of heavy foundation hold-down bolts to specified torque value",
            "Hydraulic torque tightening of machine base anchor studs in cross pattern",
            "Tightening equipment anchor nuts to target preload with hydraulic torque wrench",
        ]
    ),
    (
        "Rig and position modular chemical injection skid onto anchor foundations",
        "1.08", 11, 4,
        [
            "Crane setting of packaged chemical dosing skid on concrete pad",
            "Hoisting and bolting down modular chemical injection package skid",
            "Lifting chemical injection skid and bolting to foundation anchor inserts",
        ]
    ),
    (
        "Install and bolt Class 600 flanged isolation gate valves and check valves",
        "1.09", 12, 4,
        [
            "Mounting Class 600 cast steel gate valves and swing check valves in pipe line",
            "Bolting up high-pressure isolation and non-return valves with spiral-wound gaskets",
            "Installing flanged gate/check valves and torque-tightening flange studs",
        ]
    ),
    (
        "Lube oil flushing of rotating equipment bearings and 5-micron patch test",
        "1.10", 13, 4,
        [
            "Circulating hot flushing oil through bearing lines until ISO 4406 cleanliness met",
            "High-velocity oil flush of machine lubrication circuit and Millipore patch check",
            "Flushing compressor lube system with external pump cart and checking mesh screens",
        ]
    ),
]

ELEC_WORK_PACKAGES = [
    (
        "Install heavy-duty perforated galvanized steel cable trays (450mm width)",
        "1.01", 6, 6,
        [
            "Mounting 450mm hot-dip galvanized perforated cable trays on trapeze supports",
            "Erecting galvanized steel cable raceway channels and fitting splice plates",
            "Fixing 450mm perforated electrical cable trays along overhead support steel",
        ]
    ),
    (
        "Erect vertical ladder cable trays and weld structural support brackets",
        "1.02", 7, 5,
        [
            "Installing heavy-duty ladder-type cable trays on substation riser walls",
            "Welding Unistrut support brackets and fixing vertical cable ladder runs",
            "Mounting vertical ladder cable trays with heavy duty clamping brackets",
        ]
    ),
    (
        "Bend, thread and mount rigid galvanized steel (RGS) conduit runs",
        "1.03", 8, 5,
        [
            "Field bending 2-inch RGS rigid steel conduits and securing with strut clamps",
            "Threading and installing heavy-wall galvanized steel conduit raceways",
            "Routing rigid metal conduit (RMC) runs with explosion-proof union fittings",
        ]
    ),
    (
        "Install explosion-proof Class 1 Div 2 junction boxes and Chico compound seal fittings",
        "1.04", 9, 4,
        [
            "Mounting hazardous-area Ex-d junction boxes and pouring Chico EY sealing compound",
            "Fixing certified explosion-proof terminal enclosures and packing barrier seals",
            "Installing flameproof junction boxes and potting cable seals with Chico fiber/compound",
        ]
    ),
    (
        "Apply certified intumescent firestop mortar and pillows at cable wall penetrations",
        "1.05", 10, 3,
        [
            "Packing cable transit openings with intumescent firestop pillows and mastic sealant",
            "Installing 2-hour fire-rated cable penetration seals using intumescent mortar",
            "Sealing substation wall cable penetrations with certified firestop elastomer foam",
        ]
    ),
    (
        "Pulling 33kV 3-core 240 sq mm MV armored cable through concrete duct bank",
        "1.06", 11, 6,
        [
            "Winched pulling of 33kV XLPE insulated armored power feeder into duct bank",
            "Cable puller winching 33kV 3C x 240mm2 copper armored cable through conduits",
            "Installing 33kV high-voltage underground feeder cable into reinforced duct runs",
        ]
    ),
    (
        "Crimp tinned copper lugs onto power conductors using hydraulic crimping tool",
        "1.07", 12, 4,
        [
            "Hydraulic hex-die crimping of heavy tinned copper compression terminals on cables",
            "Crimping cable lug connectors on large phase conductors with 12-ton tool",
            "Terminating power cable cores with hydraulic compression barrel lugs",
        ]
    ),
    (
        "Making off 33kV high voltage stress cone cold shrink terminations on XLPE cable",
        "1.08", 13, 5,
        [
            "Assembling 33kV cold-shrink stress control termination kits on MV feeder cores",
            "Installing cold-shrink outdoor stress cone terminations on 33kV XLPE cables",
            "Terminating 33kV high-voltage shielded cable ends with cold shrink kits",
        ]
    ),
    (
        "Erect 11kV vacuum circuit breaker switchgear cubicles and bolt copper busbar joints",
        "1.09", 14, 6,
        [
            "Positioning 11kV VCB switchgear lineup and torque-bolting main copper busbars",
            "Setting indoor medium-voltage switchboard panels and linking busbar sections",
            "Rigging and bolting 11kV metal-clad vacuum breaker panels in switchgear room",
        ]
    ),
    (
        "Perform 5kV / 1kV Megger insulation resistance testing on power feeder cables",
        "1.10", 15, 3,
        [
            "Megger insulation resistance testing of MV and LV cables up to 5000V DC",
            "Testing conductor-to-conductor and phase-to-ground insulation resistance with Megger",
            "Measuring dielectric resistance on power cables using calibrated Megohmmeter",
        ]
    ),
]

PIPING_WORK_PACKAGES = [
    (
        "Spool pre-fabrication, bevelling and dimensional check in site workshop",
        "1.01", 4, 8,
        [
            "Shop fabrication, edge bevelling, and fit-up inspection of carbon steel pipe spools",
            "Pre-fabricating heavy-wall pipe spools and verifying spool dimensions against isometric",
            "Cutting, beveling, and workshop tacking of process piping isometric spools",
        ]
    ),
    (
        "Rig, crane hoist and erect pre-fabricated carbon steel process pipe spools",
        "1.02", 6, 7,
        [
            "Crane lifting and positioning pre-fab pipe spools onto pipe rack steel structure",
            "Rigging and hoisting carbon steel spool assemblies onto pipe rack support tiers",
            "Lifting and aligning prefabricated piping sections on structural rack bents",
        ]
    ),
    (
        "Spool fit-up, root pass TIG welding and hot-pass low hydrogen filling",
        "1.03", 7, 6,
        [
            "GTAW root welding followed by SMAW low-hydrogen hot and filler passes on pipe joint",
            "Pipe butt joint alignment, argon backing purge, and multi-pass field welding",
            "Fitting up pipe bevels, root TIG weld run, and heavy filler weld deposit",
        ]
    ),
    (
        "Rig and erect process pipe spools and install structural guide supports",
        "1.04", 11, 4,
        [
            "Rig and erect process line spools and lock pipe guide shoes",
            "Erecting carbon steel pipe spools onto rack support beams",
            "Hoisting and setting piping run with temporary drift alignment pins",
        ]
    ),
    (
        "Fabricate carbon steel spools in fabrication shop",
        "1.05", 5, 6,
        [
            "Shop welding and cutting of carbon steel pipe spools according to isometric",
            "Pre-fabrication and dimensional check of spool components in shop",
            "Fabricating piping sections and welding flanged spool assemblies",
        ]
    ),
    (
        "Full penetration butt welding on heavy-wall alloy process piping",
        "1.06", 8, 7,
        [
            "Executing full penetration groove welds on P91/P22 alloy piping with preheating",
            "Multi-pass high-pressure butt welding on thick-wall chrome-moly alloy lines",
            "Alloy process line field welding with calibrated induction preheat coils",
        ]
    ),
    (
        "Controlled electric resistance Post-Weld Heat Treatment (PWHT) and chart recording",
        "1.07", 9, 4,
        [
            "Performing localized ceramic heating pad PWHT with 12-point temperature logging",
            "Post-weld heat treatment stress relieving on pipe joints with continuous recorder",
            "Controlled thermal soaking and cool-down PWHT on heavy alloy pipe welds",
        ]
    ),
    (
        "100% Radiographic Testing (RT) and Phase Array Ultrasonic Testing (PAUT) on pipe field welds",
        "1.08", 10, 5,
        [
            "Gamma radiography examination and PAUT ultrasonic volumetric inspection of butt welds",
            "Non-destructive NDT inspection (radiography & ultrasonic scans) on piping weld joints",
            "Shooting industrial radiographic films on field circumferential pipe welds",
        ]
    ),
    (
        "Install variable spring pipe hangers, constant load supports, and PTFE sliding guide shoes",
        "1.09", 11, 5,
        [
            "Mounting variable spring canisters and adjusting turnbuckles to cold load preset",
            "Fitting PTFE Teflon sliding pipe shoes and structural stop guides beneath lines",
            "Installing constant-effort spring hangers and setting travel lock pins",
        ]
    ),
    (
        "Flange bolt-up, gasket placement, and multi-stage torque tensioning per ASME PCC-1",
        "1.10", 12, 4,
        [
            "Cross-pattern torque tightening of Class 300/600 raised-face flanges with spiral gaskets",
            "Hydraulic stud tensioning and star-pattern bolt torqueing in compliance with ASME PCC-1",
            "Fitting flexitallic spiral wound gaskets and tightening flange studs to torque spec",
        ]
    ),
    (
        "High-pressure hydrostatic pressure test of completed piping test pack",
        "1.11", 13, 3,
        [
            "Filling, venting, and pressurizing piping circuit to 1.5x design rating with clean water",
            "Hydrotesting piping test package to proof test pressure and holding for 2-hour inspection",
            "Hydrostatic pressure test on piping spool package with calibrated digital deadweight tester",
        ]
    ),
    (
        "Dewatering, dry compressed air blowing, and line reinstatement after hydrotest",
        "1.12", 14, 3,
        [
            "Draining hydrotest water, pigging, and high-velocity oil-free air drying of piping lines",
            "Line dewatering, dry air blowing to -40°C dewpoint, and replacing temporary test blinds",
            "Reinstating permanent gaskets, orifice plates, and control valves post-hydrotest",
        ]
    ),
    (
        "Chemical degreasing, acid pickling, and citric passivation of stainless steel lines",
        "1.13", 14, 5,
        [
            "Circulating alkaline degreaser and citric acid pickle solution through SS pipe loops",
            "Chemical cleaning, pickling, and passivation of stainless steel process piping",
            "Flushing pipe loop with passivating solution and performing ferricyanide wipe test",
        ]
    ),
    (
        "Pneumatic leak testing with 95/5 Nitrogen-Helium tracer gas and detector sniffing",
        "1.14", 15, 3,
        [
            "Pressurizing line with N2/He tracer gas mixture and sniffing flanged joints for leaks",
            "Pneumatic tightness testing with nitrogen and mass spectrometer helium detector",
            "Tracer gas leak search across all mechanical flanged and threaded connections",
        ]
    ),
    (
        "Cold tie-in golden weld fit-up and final non-destructive examination",
        "1.15", 16, 4,
        [
            "Golden tie-in weld fit-up on live unit battery limit and 100% PAUT/TOFD inspection",
            "Executing tie-in golden weld between new unit header and existing plant manifold",
            "Precision bevel fit-up for tie-in weld and non-destructive surface / volumetric checks",
        ]
    ),
    (
        "Install in-line process check valves, ball valves, and safety relief valves (PSV)",
        "1.16", 17, 5,
        [
            "Mounting flanged ball valves, wafer check valves, and certified pressure relief valves",
            "Rigging and bolting heavy in-line process valves with tested spiral gaskets",
            "Installing flanged pressure safety relief valves (PSV) and bolting discharge tailpipes",
        ]
    ),
]

INST_WORK_PACKAGES = [
    (
        "Install and calibrate field smart pressure and differential transmitters with HART 475",
        "1.01", 14, 5,
        [
            "Field 5-point calibration and 4-20mA loop verification of smart pressure transmitters",
            "Mounting differential pressure transmitters on 2-inch stanchions and trimming HART loops",
            "Installing smart process transmitters, setting LRV/URV spans and zero-point calibration",
        ]
    ),
    (
        "Bend, lay and pressure-test 1/2-inch 316SS instrument impulse tubing runs",
        "1.02", 15, 6,
        [
            "Precision bending of 1/2-inch stainless steel tubing and Swagelok compression fittings",
            "Installing 316SS instrument impulse lines from root valves to 5-valve manifolds",
            "Routing instrument tubing on angle trays and hydrotesting tubing at 1.5x design",
        ]
    ),
    (
        "Route, dress, and land multi-pair instrument signal cables inside DCS marshalling cabinet",
        "1.03", 16, 5,
        [
            "Glanding, ferrule dressing, and landing shielded twisted pair cables on DCS terminal strips",
            "Terminating instrument multi-core cables and connecting shield drain wires in cabinet",
            "Dressing wiring bundles and landing analog input signals onto marshalling terminals",
        ]
    ),
    (
        "Mount and optical-align triple IR (IR3) flame detectors and toxic H2S sensors",
        "1.04", 17, 4,
        [
            "Installing multi-spectrum IR3 flame sensors and aiming optical field of view",
            "Mounting toxic H2S electrochemical gas detectors and conducting zero/span bump gas check",
            "Fixing optical flame detector heads with swivel brackets and testing with test lamp",
        ]
    ),
    (
        "Control valve actuator mounting, smart positioner auto-tune, and stroke signature test",
        "1.05", 18, 4,
        [
            "Mounting pneumatic diaphragm actuator, auto-tuning smart digital valve controller",
            "Calibrating control valve smart positioner and recording dynamic step-response curve",
            "Stroking pneumatic control valve 0-100% and testing fail-safe spring return speed",
        ]
    ),
    (
        "Install guided-wave radar level gauges on tank stilling wells and configure dielectric constants",
        "1.06", 18, 5,
        [
            "Mounting high-frequency radar level transmitters on tank nozzles and configuring echo curve",
            "Installing guided wave level probe and suppressing false echo reflections in stilling pipe",
            "Flange mounting radar tank level gauge and validating 4-20mA output against dip tape",
        ]
    ),
    (
        "Cold loop check and signal verification between field instruments and DCS I/O cards",
        "1.07", 19, 6,
        [
            "Simulating 4-20mA signals at field transmitters and verifying DCS graphics and alarm trips",
            "End-to-end cold loop check from field transmitter terminals to control room operator screen",
            "Loop checking analog/digital channels from field junction box to DCS I/O module",
        ]
    ),
    (
        "Emergency Shutdown (ESD) interlock trip loop validation and solenoid drop test",
        "1.08", 20, 4,
        [
            "Testing 24VDC ESD solenoid valves and verifying emergency shutdown trip interlock logic",
            "Executing functional trip test of Safety Instrumented System (SIS) logic interlocks",
            "De-energizing ESD trip coils to verify fast-acting emergency shutdown valve closure",
        ]
    ),
    (
        "Install and calibrate ultrasonic custody transfer flow metering skids",
        "1.09", 21, 5,
        [
            "Mounting multi-path ultrasonic flowmeters and wiring flow computer telemetry racks",
            "Calibrating acoustic transducers on custody transfer meter loop and checking zero flow",
            "Installing ultrasonic gas/liquid metering skid and verifying digital communication link",
        ]
    ),
    (
        "Continuous emission monitoring system (CEMS) probe installation and calibration gas span check",
        "1.10", 22, 5,
        [
            "Installing heated sampling probe on stack nozzle and conducting span gas zero/span check",
            "Mounting stack gas analyzer sampling system and validating NOx/SO2 optical sensors",
            "Connecting heated sample line and running EPA audit calibration gases through CEMS",
        ]
    ),
]

HSE_WORK_PACKAGES = [
    (
        "Install firewater post hydrants, landing valves, and perform hydrostatic flow rate testing",
        "1.01", 6, 5,
        [
            "Bolting up cast-iron wet barrel fire hydrants and measuring discharge flow and static head",
            "Installing 4-inch underground fire hydrant standpipes and conducting Pitot tube flow tests",
            "Mounting firewater hydrant assemblies, hose cabinets, and performing full-pressure flush",
        ]
    ),
    (
        "Plumb and test emergency safety showers, eyewashes, and audio-visual flow alarm switches",
        "1.02", 8, 4,
        [
            "Connecting potable supply to combination safety shower/eyewash and testing flow switches",
            "Plumbing stainless steel emergency eye wash station and verifying warm water delivery",
            "Testing safety shower flow rate (75 L/min) and verifying audible alarm siren activation",
        ]
    ),
    (
        "Install automatic deluge valve skid, trim piping, and test pilot detection line response",
        "1.03", 10, 5,
        [
            "Erecting transformer deluge water spray skid, resetting clapper valve and testing trip pilot",
            "Mounting high-velocity water deluge spray nozzles and testing automatic solenoid actuation",
            "Hydrotesting deluge trim piping and conducting dry pneumatic trip test on deluge system",
        ]
    ),
    (
        "Erect, inspect, and certify tube-and-coupler scaffolding with daily green scaffold tag audits",
        "1.04", 4, 12,
        [
            "Assembling modular heavy-duty steel scaffolding and issuing Scafftag safety certificates",
            "Erecting working access scaffolds with toe-boards, double handrails, and ladder gates",
            "Performing weekly structural scaffold safety inspections and signing green inspection tags",
        ]
    ),
    (
        "Perform continuous 4-gas atmospheric monitoring and issue Confined Space Entry permits",
        "1.05", 8, 14,
        [
            "Conducting multi-gas (O2, LEL, H2S, CO) sniffer tests at vessel manways and issuing PTW",
            "Pre-entry atmospheric gas testing of column vessel and logging gas levels every 2 hours",
            "Operating continuous multi-gas suction monitors for authorized confined space workers",
        ]
    ),
    (
        "Survey radiation dose rates and set up physical barricading for gamma NDE radiography",
        "1.06", 11, 4,
        [
            "Setting up flashing radiation warning beacons, yellow rope barricades and Geiger surveys",
            "Establishing controlled radiation exclusion zone (2.5 uSv/h boundary) for Iridium-192 NDT",
            "Conducting gamma radiography boundary radiation sweeps with calibrated survey meters",
        ]
    ),
    (
        "Install wind socks, illuminated evacuation route maps, and solar emergency beacon lighting",
        "1.07", 12, 4,
        [
            "Mounting illuminated aviation wind socks on mast poles and installing muster point signs",
            "Erecting reflective plant evacuation route signage and photoluminescent muster markers",
            "Installing solar-powered emergency strobe beacons and weather-resistant evacuation maps",
        ]
    ),
    (
        "Inspection and hydrostatic leak testing of hazardous chemical bund secondary containment liners",
        "1.08", 13, 5,
        [
            "Testing chemical bund secondary containment HDPE geomembrane with spark leak detector",
            "Water retention testing of acid dosing bund containment and checking sumps for seepage",
            "Inspecting chemical-resistant epoxy bund coating and conducting 24-hr hydrostatic water hold",
        ]
    ),
    (
        "Install high-expansion foam proportioner skid, bladder tank, and perform foam pour test",
        "1.09", 15, 6,
        [
            "Positioning AFFF foam concentrate bladder tank, ratio controller, and testing foam quality",
            "Mounting foam generator headers and conducting discharge pour test into containment area",
            "Commissioning balanced pressure foam proportioning skid with water-foam solution tests",
        ]
    ),
    (
        "Setup self-contained breathing apparatus (SCBA) cascade manifold bank and cylinder recharge station",
        "1.10", 16, 4,
        [
            "Installing 300-bar high-pressure breathable air cascade cylinders and breathing air lines",
            "Setting up emergency escape breathing apparatus (EEBA) muster boxes and pressure gauges",
            "Testing compressed breathing air quality (CGA Grade D) on mobile SCBA refill manifold",
        ]
    ),
]


def generate_activities():
    """
    Generate 890 realistic construction activities across all 6 PRD-defined disciplines:
    - Civil (200 activities: ACT-CIV-0001 to ACT-CIV-0200)
    - Mechanical (200 activities: ACT-MEC-0001 to ACT-MEC-0200)
    - Electrical (200 activities: ACT-ELE-0001 to ACT-ELE-0200)
    - Piping (180 activities: PIP-2401 to PIP-2580, including PIP-2458 Erect Line 24-XX)
    - Instrumentation (60 activities: ACT-INS-0001 to ACT-INS-0060)
    - HSE (50 activities: ACT-HSE-0001 to ACT-HSE-0050)
    """
    activities = []
    base_project_start = date(2026, 6, 1)  # 6-month timeline: June 1, 2026 -> end of November 2026

    discipline_configs = [
        ("Civil", "ACT-CIV-", "1", CIVIL_LOCATIONS, CIVIL_WORK_PACKAGES, 200, 1),
        ("Mechanical", "ACT-MEC-", "2", MECH_LOCATIONS, MECH_WORK_PACKAGES, 200, 1),
        ("Electrical", "ACT-ELE-", "3", ELEC_LOCATIONS, ELEC_WORK_PACKAGES, 200, 1),
        ("Piping", "PIP-", "4", PIPING_LOCATIONS, PIPING_WORK_PACKAGES, 180, 2401),
        ("Instrumentation", "ACT-INS-", "5", INST_LOCATIONS, INST_WORK_PACKAGES, 60, 1),
        ("HSE", "ACT-HSE-", "6", HSE_LOCATIONS, HSE_WORK_PACKAGES, 50, 1),
    ]

    total_generated = 0

    for disc_name, prefix, disc_code, loc_list, work_pkg_list, target_count, start_offset in discipline_configs:
        num_pkgs = len(work_pkg_list)
        num_locs = len(loc_list)

        for i in range(1, target_count + 1):
            raw_id_num = start_offset + (i - 1)
            act_id = f"{prefix}{raw_id_num:04d}"

            pkg_idx = (i - 1) % num_pkgs
            loc_idx = (i - 1 + (i // num_pkgs)) % num_locs

            loc_name, asset_tag, zone = loc_list[loc_idx]
            canonical_task, wbs_sub, phase_offset_weeks, duration_days, variants = work_pkg_list[pkg_idx]

            # Generate hierarchical L5/L6 WBS Code: e.g. 1.1.04.15
            wbs_code = f"{disc_code}.{wbs_sub}.{((i - 1) % 50) + 1:02d}"

            # Phrasing variation logic:
            # Approx 10-15% of entries get distinct semantic paraphrases
            is_paraphrase_candidate = (i % 7 == 0) or (i % 13 == 0)

            if is_paraphrase_candidate and variants:
                chosen_variant = variants[(i + loc_idx) % len(variants)]
                style_roll = i % 3
                if style_roll == 0:
                    description = f"{chosen_variant} - {loc_name} ({asset_tag})"
                elif style_roll == 1:
                    description = f"{chosen_variant} at {asset_tag}, {zone}"
                else:
                    description = f"{chosen_variant} [{loc_name}]"
            else:
                style_roll = (i + loc_idx) % 4
                if style_roll == 0:
                    description = f"{canonical_task} for {asset_tag} at {loc_name}"
                elif style_roll == 1:
                    description = f"{canonical_task} - {loc_name} ({asset_tag})"
                elif style_roll == 2:
                    description = f"{canonical_task} at {loc_name} ({zone})"
                else:
                    description = f"{canonical_task} ({asset_tag}, {loc_name})"

            # Spread dates realistically across a 6-month (26 weeks) timeline
            stagger_days = ((i * 3) % 21) - 5
            week_start_offset = phase_offset_weeks * 7 + stagger_days
            start_day_offset = max(0, min(165, week_start_offset))

            duration = max(2, min(24, duration_days + ((i % 5) - 2)))
            planned_start = base_project_start + timedelta(days=start_day_offset)
            planned_end = planned_start + timedelta(days=duration)

            # Assign realistic status based on schedule progression:
            if planned_end <= date(2026, 8, 10):
                status = "DELAYED" if (i % 11 == 0) else "COMPLETED"
            elif planned_start <= date(2026, 8, 25) <= planned_end:
                if i % 5 == 0:
                    status = "DELAYED"
                elif i % 4 == 0:
                    status = "COMPLETED"
                else:
                    status = "IN_PROGRESS"
            elif planned_start > date(2026, 8, 25):
                status = "DELAYED" if (i % 17 == 0) else "NOT_STARTED"
            else:
                status = "DELAYED" if (i % 6 == 0) else "IN_PROGRESS"

            # PRD Section 22 Headline Demo Cases:
            if act_id == "PIP-2458":
                description = "Erect Line 24-XX"
                loc_name = "North Unit - Process Train A"
                asset_tag = "Line 24-XX"
                planned_start = date(2026, 8, 20)
                planned_end = date(2026, 8, 23)
                status = "IN_PROGRESS"
                wbs_code = "4.1.04.58"
            elif act_id == "PIP-2512":
                description = "Fabricate Line 24-XX"
                loc_name = "North Unit - Process Train A"
                asset_tag = "Line 24-XX"
                planned_start = date(2026, 8, 1)
                planned_end = date(2026, 8, 15)
                status = "COMPLETED"
                wbs_code = "4.1.05.12"
            elif act_id == "PIP-2544":
                description = "Hydrotest Line 24-XX"
                loc_name = "North Unit - Process Train A"
                asset_tag = "Line 24-XX"
                planned_start = date(2026, 8, 26)
                planned_end = date(2026, 8, 29)
                status = "NOT_STARTED"
                wbs_code = "4.1.11.44"

            activities.append({
                "activity_id": act_id,
                "discipline": disc_name,
                "description": description,
                "location": loc_name,
                "asset": asset_tag,
                "planned_start_date": planned_start.strftime("%Y-%m-%d"),
                "planned_end_date": planned_end.strftime("%Y-%m-%d"),
                "status": status,
                "wbs_code": wbs_code,
            })
            total_generated += 1

    return activities


def write_csv_files(activities):
    """Write schedule_activities.csv to both supabase/seed/ and data/."""
    fieldnames = [
        "activity_id",
        "discipline",
        "description",
        "location",
        "asset",
        "planned_start_date",
        "planned_end_date",
        "status",
        "wbs_code",
    ]

    seed_file = SUPABASE_SEED_DIR / "schedule_activities.csv"
    data_file = DATA_DIR / "schedule_activities.csv"

    for target_path in [seed_file, data_file]:
        with open(target_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(activities)
        print(f"[OK] Wrote {len(activities)} activities to {target_path}")


if __name__ == "__main__":
    activities = generate_activities()
    write_csv_files(activities)
    print("\nSummary of generated dataset:")
    print(f"- Total activities: {len(activities)}")
    by_disc = {}
    by_status = {}
    for a in activities:
        by_disc[a['discipline']] = by_disc.get(a['discipline'], 0) + 1
        by_status[a['status']] = by_status.get(a['status'], 0) + 1
    print(f"- Disciplines: {by_disc}")
    print(f"- Statuses: {by_status}")
