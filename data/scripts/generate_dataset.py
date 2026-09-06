"""
Generate synthetic dataset for ProgressBridge AI (SIH26122):
- supabase/seed/schedule_activities.csv: 750 L5/L6 activities across Civil, Mechanical, Electrical
- data/schedule_activities.csv: Synchronized copy for local scripts
- Includes realistic field engineering phrasing, 10-15% paraphrased variations for semantic matching,
  realistic 6-month project timeline, hierarchical WBS codes, and status distributions.
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

# -------------------------------------------------------------
# Detailed L5/L6 Activity Templates with Semantic Variants
# -------------------------------------------------------------

# Format: (canonical_action, wbs_subcode, phase_offset_weeks, duration_days, [paraphrase_variants])
CIVIL_WORK_PACKAGES = [
    # Earthworks & Substructure (Phase: Weeks 0 - 8)
    (
        "Rough grading and bulk earth excavation down to founding level",
        "1.1.01", 0, 8,
        [
            "Bulk soil excavation and rough site grading to design formation level",
            "Site earthmoving and rough cut excavation to founding elevation",
            "Heavy excavation and leveling of site earthworks down to formation",
        ]
    ),
    (
        "Excavation for foundation footing and equipment plinths",
        "1.1.02", 1, 6,
        [
            "Pit digging and foundation trench excavation for equipment plinth",
            "Excavate foundation footing pit and plinth bases",
            "Soil trenching and pit excavation for structural equipment foundations",
        ]
    ),
    (
        "Subgrade soil compaction and in-situ moisture-density nuclear testing",
        "1.1.03", 1, 4,
        [
            "Subgrade roller compaction with field moisture-density nuclear gauge checks",
            "Vibratory compaction of subgrade soil and in-situ Proctor density testing",
            "Compacting subgrade layer and conducting nuclear density tests",
        ]
    ),
    (
        "Laying and compacting 150mm crushed aggregate base course",
        "1.1.04", 2, 5,
        [
            "Placement and vibrating compaction of 150mm crushed stone sub-base",
            "Spreading 150mm aggregate base course and roller compaction",
            "150mm crushed rock base course installation and grading",
        ]
    ),
    (
        "Slope trimming and placement of stone pitching along stormwater canal",
        "1.1.05", 2, 7,
        [
            "Ditch slope profiling and stone rip-rap pitching for drainage channel",
            "Stone pitching lining and slope batter dressing on stormwater ditch",
            "Trimming canal embankments and laying stone pitching protection",
        ]
    ),
    (
        "Geotextile membrane installation beneath heavy haul road embankment",
        "1.1.06", 2, 4,
        [
            "Laying woven geotextile separation fabric under heavy haul roadway",
            "Haul road subgrade geotextile sheet placement and overlapping",
            "Subgrade geotextile stabilization membrane rollout and pinning",
        ]
    ),
    (
        "Dewatering excavation pit prior to blinding concrete pour",
        "1.1.07", 3, 3,
        [
            "Pumping groundwater and pit dewatering ahead of mud mat concrete",
            "Excavation sump dewatering and mud clearance before blinding",
            "Submersible pump dewatering of foundation pit prior to PCC pour",
        ]
    ),
    (
        "Backfilling foundation trenches with approved granular fill in 200mm lifts",
        "1.1.08", 6, 7,
        [
            "Granular backfill compaction in 200mm layers around foundation footings",
            "Tamping approved structural backfill in 200mm lifts along foundation walls",
            "Layered backfilling and pneumatic tamping around completed concrete bases",
        ]
    ),
    (
        "Plate load bearing capacity testing on compacted formation soil",
        "1.1.09", 2, 3,
        [
            "Conducting static plate load test to confirm allowable soil bearing pressure",
            "Plate bearing test for subsoil settlement and bearing capacity verification",
            "In-situ plate load test on compacted foundation subgrade formation",
        ]
    ),
    (
        "Excavation and trench shoring for underground storm drainage culvert",
        "1.1.10", 3, 6,
        [
            "Drainage trenching with trench box shoring for stormwater concrete culvert",
            "Digging storm drain trench and installing trench sheet safety shoring",
            "Storm sewer trench excavation and structural shoring installation",
        ]
    ),

    # Concrete Foundations & Substructures (Phase: Weeks 3 - 14)
    (
        "Pour 75mm plain cement concrete (PCC) lean blinding mud mat layer",
        "1.2.01", 3, 3,
        [
            "Placing 75mm lean concrete (PCC) blinding bed on excavation base",
            "Casting 75mm lean mix mud mat concrete over subgrade",
            "Pouring unreinforced PCC blinding layer 75mm thickness",
        ]
    ),
    (
        "Erect timber and steel panel formwork with bracing for deep pedestal footing",
        "1.2.02", 4, 6,
        [
            "Assembling and bracing shuttering formwork panels for high foundation pedestal",
            "Formwork shuttering fabrication and diagonal bracing on pedestal footing",
            "Setting up foundation pedestal forms with heavy steel waler supports",
        ]
    ),
    (
        "Fabricate, hoist and fix heavy reinforcement rebar cage (#8 and #10 bars)",
        "1.2.03", 4, 7,
        [
            "Tying and placing high-yield rebar steel cage (#8 & #10 bars) with cover blocks",
            "Fixing reinforcement rebar steel and hoisting main foundation cage",
            "Rebar cage assembly, crane hoisting and secure tying for equipment plinth",
        ]
    ),
    (
        "Install galvanized anchor bolt clusters and template leveling plates",
        "1.2.04", 5, 4,
        [
            "Setting anchor bolt cluster assemblies with steel templates and optical leveling",
            "Galvanized hold-down anchor bolt alignment and template fixing",
            "Positioning foundation anchor bolts with survey checks for equipment mounting",
        ]
    ),
    (
        "Cast grade M35 structural concrete for main foundation slab and plinth",
        "1.2.05", 5, 4,
        [
            "Pouring and vibrating grade M35 ready-mix structural concrete for base slab",
            "M35 structural concrete pour with immersion vibrator consolidation",
            "Placing grade M35 concrete into foundation base and vibratory finishing",
        ]
    ),
    (
        "Apply liquid membrane curing compound and wet hessian burlap covering",
        "1.2.06", 6, 7,
        [
            "Concrete surface curing via membrane compound spray and damp burlap wrap",
            "Wet hessian cloth wrapping and chemical curing compound application",
            "Continuous wet curing and application of curing membrane on green concrete",
        ]
    ),
    (
        "Post-pour ultrasonic pulse velocity (UPV) and rebound hammer testing",
        "1.2.07", 7, 3,
        [
            "Schmidt rebound hammer scan and UPV non-destructive test on hardened concrete",
            "Ultrasonic sound velocity and concrete surface hardness rebound test",
            "Non-destructive testing (UPV & rebound hammer) across concrete plinths",
        ]
    ),
    (
        "Formwork stripping and concrete honeycombing surface patch repair",
        "1.2.08", 6, 4,
        [
            "Striking formwork shutters and non-shrink cosmetic grout touchup",
            "Dismantling shuttering panels and repairing surface blowholes with polymer mortar",
            "Formwork de-shuttering, surface inspection and defect patching",
        ]
    ),
    (
        "Construct reinforced concrete blast-resistant protection wall",
        "1.2.09", 7, 10,
        [
            "Casting reinforced heavy blast containment concrete blast wall",
            "Erecting rebar and pouring high-strength concrete for blast deflector wall",
            "Construction of heavy RC blast mitigation barrier wall",
        ]
    ),
    (
        "Pour monolithic concrete slab with power-float surface hardener finish",
        "1.2.10", 8, 5,
        [
            "Power floating dry-shake quartz hardener onto monolithic concrete floor slab",
            "Monolithic slab pour followed by mechanical power-trowel hardener finishing",
            "Casting wearing floor slab with power-float abrasive-resistant topping",
        ]
    ),
    (
        "Install elastomeric ribbed waterstop seals at cold construction joints",
        "1.2.11", 5, 3,
        [
            "Fixing PVC elastomeric waterstop barrier across concrete construction cold joints",
            "Placing center-bulb rubber waterstop profile at slab joint interface",
            "Waterstop strip installation and alignment at cold concrete pour joints",
        ]
    ),
    (
        "Tie bottom and top rebar mats for retaining bund wall foundation",
        "1.2.12", 6, 5,
        [
            "Tying double-layer rebar reinforcement mesh for tank containment bund wall",
            "Fixing top & bottom rebar mats for containment dike foundation pad",
            "Rebar fixing and tying for reinforced concrete spill bund footing",
        ]
    ),
    (
        "Pour self-compacting concrete (SCC) inside congested pump pedestal",
        "1.2.13", 7, 3,
        [
            "Pumping self-consolidating concrete (SCC) into heavily congested pedestal rebar",
            "Casting high-slump self-compacting concrete around complex rebar embedments",
            "Self-compacting concrete (SCC) placement in dense rebar equipment base",
        ]
    ),
    (
        "Concrete cube sampling and 7-day / 28-day compressive strength lab testing",
        "1.2.14", 7, 3,
        [
            "Laboratory crushing test of concrete test cylinders for 7-day compressive strength",
            "Concrete specimen compression testing and batch quality certification",
            "Crushing concrete sample cubes for 7-day / 28-day strength compliance",
        ]
    ),
    (
        "Install precast concrete cable trench troughs and removable checkered covers",
        "1.2.15", 8, 7,
        [
            "Laying precast concrete trench units and fitting checkered steel cover plates",
            "Setting modular RC cable trench channels and seating trench lid slabs",
            "Precast concrete cable trough alignment, joint sealing and cover installation",
        ]
    ),

    # Superstructure, Structural Steel & Finishes (Phase: Weeks 8 - 20)
    (
        "Erect primary structural steel columns and temporary guy-wire support",
        "1.3.01", 9, 8,
        [
            "Crane lifting and plumbing structural steel main columns with guy ropes",
            "Hoisting heavy steel H-columns and securing with wire rope temp bracing",
            "Standing up main structural steel columns and anchoring to baseplates",
        ]
    ),
    (
        "High-strength friction grip (HSFG) bolt tightening and torque check",
        "1.3.02", 10, 6,
        [
            "Torquing HSFG grade 8.8 / 10.9 structural bolts with calibrated torque wrench",
            "Tensioning high-strength friction grip connection bolts and paint-marking",
            "Calibrated torque verification on structural steel HSFG splice joints",
        ]
    ),
    (
        "Level and pressure-grout column base plates using non-shrink epoxy grout",
        "1.3.03", 11, 4,
        [
            "Pumping high-strength non-shrink epoxy grout beneath column baseplates",
            "Precision leveling and epoxy pressure grouting under steel column base",
            "Under-plate non-shrink grouting and packing for structural columns",
        ]
    ),
    (
        "Lift and bolt secondary transverse steel beams and diagonal cross-bracings",
        "1.3.04", 11, 8,
        [
            "Crane erection of transverse secondary steel beams and diagonal wind ties",
            "Installing cross-bracing steel members and connecting secondary floor beams",
            "Erecting transverse steel frame beams and bolting vertical bracings",
        ]
    ),
    (
        "Lay solid concrete block masonry wall with reinforced concrete bond beams",
        "1.3.05", 12, 9,
        [
            "Building 200mm solid block masonry walls with embedded lintel bond beams",
            "Laying cement masonry unit (CMU) walls with reinforced horizontal tie beams",
            "Masonry wall blockwork construction with mortar joints and bond beam casting",
        ]
    ),
    (
        "Apply two-coat sand-faced cement plaster on external masonry envelope",
        "1.3.06", 14, 7,
        [
            "Two-coat waterproof cement sand plastering on exterior building walls",
            "External sand-face cement rendering application over blockwork",
            "Applying external double-coat cement plaster finish to building envelope",
        ]
    ),
    (
        "Install corrugated galvanized metal deck sheets and shear stud puddle welds",
        "1.3.07", 13, 6,
        [
            "Laying corrugated steel floor decking and welding Nelson shear connectors",
            "Metal profile decking sheet installation with puddle-welded shear studs",
            "Fixing galvanized composite steel floor deck and shooting shear studs",
        ]
    ),
    (
        "Fireproofing application (cementitious intumescent) on structural steel legs",
        "1.3.08", 15, 8,
        [
            "Spray-applied cementitious passive fireproofing on structural steel members",
            "Intumescent fireproof coating application to achieve 2-hour fire rating",
            "Applying structural steel fireproofing insulation encasement",
        ]
    ),
    (
        "Erect overhead crane runway gantry beam and precision align rails",
        "1.3.09", 14, 6,
        [
            "Hoisting overhead travelling crane runway girders and optical rail alignment",
            "EOT crane gantry beam setting and crane rail straightness alignment",
            "Installing overhead crane runway beam and checking span rail gauge",
        ]
    ),
    (
        "Mount industrial louvers and double-leaf fire doors on equipment shelter",
        "1.3.09", 16, 5,
        [
            "Fitting acoustic intake weather louvers and steel fire-rated double doors",
            "Installation of ventilation louvers and 2-hr fire doors on building envelope",
            "Mounting steel equipment shelter louvers and fire-rated emergency exit doors",
        ]
    ),
    (
        "Install perimeter heavy chain-link security fencing with razor wire topping",
        "1.3.10", 17, 8,
        [
            "Fixing galvanized chainlink security fence and triple-strand concertina wire",
            "Erecting boundary fence posts, chain-link fabric and razor wire coils",
            "Perimeter security fence installation with barbed wire extension arms",
        ]
    ),
    (
        "Bituminous waterproofing membrane application on substation flat roof slab",
        "1.3.11", 16, 6,
        [
            "Torch-applied SBS bituminous waterproofing membrane on roof concrete slab",
            "Applying primer and multi-layer torch-on waterproofing sheet on roof deck",
            "Roof elastomeric bitumen waterproofing membrane installation and water test",
        ]
    ),
]

# Format: (canonical_action, wbs_subcode, phase_offset_weeks, duration_days, [paraphrase_variants])
MECH_WORK_PACKAGES = [
    # Static & Rotating Equipment (Phase: Weeks 6 - 18)
    (
        "Rig, crane hoist and set horizontal shell-and-tube heat exchanger onto saddle supports",
        "2.1.01", 6, 5,
        [
            "Heavy crane lifting and setting shell & tube exchanger onto concrete saddles",
            "Hoisting horizontal heat exchanger vessel and landing on foundation pads",
            "Rigging and placement of shell-and-tube heat exchanger on support pedestals",
        ]
    ),
    (
        "Position centrifugal multi-stage crude pump and rough-align baseplate",
        "2.1.02", 7, 4,
        [
            "Setting multi-stage centrifugal pump skid and rough leveling baseplate shims",
            "Centrifugal pump skid rigging, positioning and initial level adjustment",
            "Landing crude oil pump base frame onto foundation plinth and rough leveling",
        ]
    ),
    (
        "Precision laser alignment of motor-pump shaft coupling and thermal offset check",
        "2.1.03", 9, 3,
        [
            "Dual-beam laser shaft alignment and thermal growth offset calibration on pump-motor",
            "Laser coupling alignment and dial gauge runout check on rotating drive shaft",
            "Conducting precision laser coupling alignment to within 0.03mm tolerance",
        ]
    ),
    (
        "Dial indicator soft-foot measurement and precision stainless steel shimming",
        "2.1.04", 8, 3,
        [
            "Soft-foot dial gauge check and inserting SS316 precision shims under machine feet",
            "Measuring equipment foot coplanarity with dial indicators and shimming",
            "Soft-foot tolerance verification and precision shimming of equipment base",
        ]
    ),
    (
        "Uncrate, inspect internals, and mount reciprocating compressor cylinder heads",
        "2.1.05", 10, 6,
        [
            "Internal visual inspection and torque-bolting reciprocating compressor cylinders",
            "Compressor cylinder uncrating, valve cavity inspection and head assembly",
            "Mounting reciprocating compressor heads and torquing tie rods to spec",
        ]
    ),
    (
        "Install lube oil console, interconnecting SS tubing, and accumulator vessel",
        "2.1.06", 11, 6,
        [
            "Rigging lube oil reservoir unit, running SS tubing and tying in bladder accumulator",
            "Lube oil package console placement and stainless interconnecting tubing fitment",
            "Installing auxiliary lube oil system skid, tubing runs and accumulator pot",
        ]
    ),
    (
        "Fit mechanical cartridge seals and connect dual pressurized barrier fluid piping",
        "2.1.07", 12, 4,
        [
            "Mounting tandem mechanical seals and connecting Plan 53B barrier fluid piping",
            "Cartridge mechanical seal installation and API seal flush piping hookup",
            "Fitting dual mechanical face seals and connecting barrier liquid reservoir",
        ]
    ),
    (
        "Rig and position modular chemical injection skid onto anchor foundations",
        "2.1.08", 7, 4,
        [
            "Setting pre-assembled chemical dosing skid package onto anchor bolts",
            "Crane positioning of chemical injection module and anchor bolt securing",
            "Rigging and mounting modular chemical injection package on concrete plinth",
        ]
    ),
    (
        "Assemble air-cooled fin-fan cooler tube bundles, plenums, and belt drive pulleys",
        "2.1.09", 11, 8,
        [
            "Erecting fin-fan cooler heat transfer bundles, fan plenum rings and V-belts",
            "Fin-fan heat exchanger tube bundle assembly and fan belt drive alignment",
            "Mounting finned tube bundles, fan cowls, sheaves and drive motors on cooler deck",
        ]
    ),
    (
        "Mount high-pressure suction pulsation dampener bottle on compressor nozzles",
        "2.1.10", 12, 4,
        [
            "Fitting HP suction pulsation dampening vessel directly to compressor gas flange",
            "Rigging and bolting suction volume bottle dampener onto compressor intake",
            "Installing gas pulsation dampener vessel on reciprocating compressor cylinder",
        ]
    ),
    (
        "Erect vertical contactor column vessel and plumb with optical transit",
        "2.1.11", 8, 6,
        [
            "Dual-crane tandem lift and vertical plumb alignment of gas contactor column",
            "Rigging, uprighting and precision vertical alignment of absorption tower",
            "Hoisting vertical column vessel and checking verticality with theodolite",
        ]
    ),

    # Piping Fabrication, Erection & Bolting (Phase: Weeks 8 - 22)
    (
        "Rig and erect pre-fabricated 12-inch carbon steel schedule 80 pipe spools",
        "2.2.01", 9, 7,
        [
            "Hoisting and fitting 12\" CS Sch 80 pre-fab spool pieces onto pipe rack tier",
            "Erecting heavy 12-inch schedule 80 carbon steel spools along main pipe bridge",
            "Rigging pre-fabricated 12-inch CS process line spools and landing on supports",
        ]
    ),
    (
        "Field fit-up and butt-weld 8-inch stainless steel 316L discharge piping",
        "2.2.02", 10, 6,
        [
            "Joint fit-up, argon purge backing and GTAW butt-welding of 8\" SS316L pipe",
            "Fit-up and full penetration butt weld on 8-inch stainless steel process line",
            "Butt-welding 8\" SS 316L discharge piping joints with internal argon purging",
        ]
    ),
    (
        "TIG root pass and SMAW capping on high-pressure gas header weld joints",
        "2.2.03", 11, 6,
        [
            "GTAW root welding and low-hydrogen SMAW fill/cap on HP gas header line",
            "Welding HP gas piping joints using TIG root and stick electrode capping passes",
            "Executing 6G position TIG root and manual metal arc capping on header spools",
        ]
    ),
    (
        "Install Class 600 gate, globe, and check isolation valves with spiral-wound gaskets",
        "2.2.04", 12, 5,
        [
            "Fitting 600# flanged isolation valves with graphite-filled spiral wound gaskets",
            "Installing Class 600 gate/check valves and inserting new spiral-wound flange seals",
            "Mounting flanged process valves (Class 600) with fresh spiral wound gaskets",
        ]
    ),
    (
        "Controlled cross-pattern torque tightening on 16-inch flange connection (ASME PCC-1)",
        "2.2.05", 13, 4,
        [
            "Torque bolting 16\" flange stud bolts in star pattern per ASME PCC-1 standard",
            "Hydraulic torque tightening of 16-inch raised face flange to PCC-1 guidelines",
            "Tightening 16-inch flange bolts with calibrated torque equipment per ASME PCC-1",
        ]
    ),
    (
        "Install variable spring pipe hangers and set cold travel preset stops",
        "2.2.06", 13, 5,
        [
            "Hanging variable load spring pipe supports and locking cold travel stop pins",
            "Mounting spring hanger assemblies and calibrating cold design position stops",
            "Installing spring canister supports beneath piping and setting cold-load travel",
        ]
    ),
    (
        "Mount PTFE teflon sliding pipe shoes and structural guide clamps along rack tier",
        "2.2.07", 10, 5,
        [
            "Fixing PTFE low-friction sliding shoes and lateral guide clips on pipe rack",
            "Installing Teflon-lined pipe shoes and steel pipe guides across rack beams",
            "Mounting sliding shoe assemblies and guide retainers under process piping",
        ]
    ),
    (
        "Pre-heating and post-weld heat treatment (PWHT) on heavy wall alloy spools",
        "2.2.08", 12, 5,
        [
            "Induction heating pre-heat and ceramic pad PWHT cycle on heavy wall P91/P11 spools",
            "Executing controlled thermal PWHT cycle on thick alloy pipe weld joints",
            "Post-weld heat treatment (PWHT) and temperature chart recording on alloy piping",
        ]
    ),
    (
        "100% Non-Destructive Testing (radiographic and magnetic particle) on field welds",
        "2.2.09", 13, 5,
        [
            "Gamma radiography (RT) and fluorescent magnetic particle inspection (MT) on welds",
            "NDT radiographic film inspection and MPI examination on pressure piping joints",
            "Performing 100% X-ray / gamma NDT and magnetic crack testing on field girth welds",
        ]
    ),
    (
        "Install pneumatic control valve diaphragm actuator and hook up instrument air lines",
        "2.2.10", 14, 4,
        [
            "Mounting air diaphragm actuator on control valve body and bending air tubing",
            "Fitting pneumatic valve actuator, smart positioner and 1/4\" SS air hookup",
            "Actuator mounting, stroke calibration and instrument air tubing connection",
        ]
    ),
    (
        "Route and clamp 1/2-inch stainless steel instrument tubing from orifice tapping",
        "2.2.11", 14, 5,
        [
            "Bending and tray-clamping 1/2\" SS 316 impulse lines from orifice flange taps",
            "Running 1/2-inch seamless SS instrument impulse tubing to differential transmitter",
            "Installing and clamping 1/2\" instrument tubing runs from primary tap root valves",
        ]
    ),
    (
        "Erect steam jacketed piping spools and connect thermal fluid jump-overs",
        "2.2.12", 15, 6,
        [
            "Fitting double-wall steam jacketed pipe spools and welding jumper lines",
            "Erecting jacketed sulphur line and connecting steam trace jump-over loops",
            "Installing jacketed process pipe and testing internal core pipe integrity",
        ]
    ),

    # Pressure Testing, Flushing & Insulation (Phase: Weeks 14 - 24)
    (
        "Hydrostatic pressure test on piping spool assembly at 1.5x design pressure",
        "2.3.01", 16, 4,
        [
            "Hydro-testing piping test loop to 150% rated design pressure with 2-hr hold",
            "Conducting 1.5x design pressure water hydrotest and checking for pressure drops",
            "Filling, venting and hydrostatically pressurizing piping package to 1.5x design",
        ]
    ),
    (
        "Pneumatic line tightness leak test with nitrogen and soapy bubble solution",
        "2.3.02", 17, 3,
        [
            "Pressurizing piping package with nitrogen to 7 bar and Snoop bubble leak testing",
            "Pneumatic line tightness testing using nitrogen gas and foaming leak detector",
            "Nitrogen gas leak test and bubble inspection on all mechanical flange joints",
        ]
    ),
    (
        "Chemical cleaning, degreasing, and citric acid passivation of lube oil lines",
        "2.3.03", 18, 5,
        [
            "Recirculating alkaline degreaser and citric acid pickle flush through lube piping",
            "Lube oil system chemical flush, degreasing wash and passivation treatment",
            "Chemical pickling and passivation of stainless steel lube oil circulation loop",
        ]
    ),
    (
        "High-velocity dry air blowing and particle witness cloth cleanliness inspection",
        "2.3.04", 18, 3,
        [
            "Dry compressed air line blowing with target cloth impingement verification",
            "High-speed air purging of process header with white witness flannel check",
            "Air blowing piping header lines until witness target shows zero particulate",
        ]
    ),
    (
        "Install mineral wool preformed thermal insulation on high-temperature steam line",
        "2.3.05", 19, 6,
        [
            "Fitting high-density rockwool / mineral wool insulation shells on steam headers",
            "Applying preformed mineral wool thermal lagging on high-temp steam piping",
            "Thermal insulation installation with mineral wool blankets on hot service pipe",
        ]
    ),
    (
        "Wrap and rivet aluminum weatherproofing cladding jacketing over insulated spools",
        "2.3.06", 20, 6,
        [
            "Banding embossed aluminum sheet cladding and sealing jacketing overlaps",
            "Installing aluminum weatherproofing jacketing with stainless pop rivets",
            "Applying protective aluminum metal cladding over pipe insulation lagging",
        ]
    ),
    (
        "Apply cellular glass cold insulation and vapor barrier mastic on chilled piping",
        "2.3.07", 20, 5,
        [
            "Fitting Foamglas cold insulation segments and applying vapor barrier elastomeric mastic",
            "Cellular glass cryogenic insulation install with zero-permeance vapor seal",
            "Installing rigid cellular glass insulation and multi-coat vapor barrier coating",
        ]
    ),
    (
        "Flange insulation kit (dielectric gasket & sleeves) installation for cathodic protection",
        "2.3.08", 17, 3,
        [
            "Fitting dielectric isolation gasket, insulating sleeves and washers on flange",
            "Installing cathodic protection insulating flange kit and checking electrical isolation",
            "Mounting dielectric flange isolation set and verifying zero electrical continuity",
        ]
    ),
]

# Format: (canonical_action, wbs_subcode, phase_offset_weeks, duration_days, [paraphrase_variants])
ELEC_WORK_PACKAGES = [
    # Cable Containment, Raceways & Conduits (Phase: Weeks 8 - 18)
    (
        "Install heavy-duty perforated galvanized steel cable trays (450mm width)",
        "3.1.01", 8, 7,
        [
            "Fixing 450mm wide perforated hot-dip galvanized cable tray runs on trapeze hangers",
            "Mounting galvanized perforated cable trays (450mm) and connecting coupler plates",
            "Installing 450mm HDG cable containment trays with splice plate hardware",
        ]
    ),
    (
        "Erect vertical ladder cable trays and weld structural support brackets",
        "3.1.02", 9, 6,
        [
            "Welding unistrut brackets and hanging vertical ladder-type cable riser trays",
            "Installing vertical ladder cable racking and fabricating cantilever supports",
            "Mounting vertical cable ladder raceway and bolting structural wall brackets",
        ]
    ),
    (
        "Bend, thread and mount rigid galvanized steel (RGS) conduit runs",
        "3.1.03", 10, 6,
        [
            "Field bending and threading 2\" heavy wall RGS electrical conduit lines",
            "Installing rigid galvanized steel (RGS) conduits with explosion-proof unions",
            "Running threaded RGS conduit lines and mounting saddle clamps to structure",
        ]
    ),
    (
        "Install explosion-proof Class 1 Div 2 junction boxes and Chico compound seal fittings",
        "3.1.04", 11, 5,
        [
            "Mounting hazardous-area Ex-d terminal enclosures and pouring Chico sealing compound",
            "Bolting explosion-proof junction boxes and filling conduit seal-offs with resin",
            "Installing Class 1 Div 2 certified terminal boxes with seal fittings and compound",
        ]
    ),
    (
        "Apply certified intumescent firestop mortar and pillows at cable wall penetrations",
        "3.1.05", 14, 4,
        [
            "Sealing cable tray transit wall openings with 2-hour intumescent firestop mortar",
            "Packing intumescent fire-rated pillows and mastic into cable wall penetrations",
            "Installing firestop barrier transit frames and intumescent compound at wall breaches",
        ]
    ),
    (
        "Mount heavy stainless steel cable cleats and strapping on vertical riser tray runs",
        "3.1.06", 12, 5,
        [
            "Fixing trefoil and single SS cable cleats on vertical riser ladder trays",
            "Fastening stainless steel short-circuit rated cable cleats on riser racks",
            "Installing heavy-duty cable clamping cleats along vertical cable riser runs",
        ]
    ),

    # Cable Pulling, Glanding & Termination (Phase: Weeks 12 - 22)
    (
        "Pull 3-core 240 sq mm 33kV copper armored power cable through trench and duct bank",
        "3.2.01", 12, 7,
        [
            "Winch hauling 3C x 240mm2 33kV XLPE armored power feeder into outdoor trench",
            "Pulling 33kV 3-core 240 sq mm MV armored cable through concrete duct bank",
            "Hauling 33kV high-voltage power cable (3x240 sq mm) using motorized winch rollers",
        ]
    ),
    (
        "Pull 4-core 95 sq mm 415V low voltage power feed to motor control panel",
        "3.2.02", 13, 5,
        [
            "Pulling 4C x 95mm2 415V LT armored supply cable from MCC to field motor",
            "Hauling and laying 4-core 95 sq mm low voltage power feeder in cable tray",
            "Routing 415V 4C-95sqmm copper power supply cable into local drive panel",
        ]
    ),
    (
        "Pull multi-pair overall screened signal instrumentation cable to DCS rack",
        "3.2.03", 14, 6,
        [
            "Hauling multi-pair shielded twisted-pair (STP) analog instrument cable to DCS",
            "Pulling 12-pair overall screened instrumentation cable to control room rack",
            "Running multi-core screened signal cable through cable trays to marshalling cabinet",
        ]
    ),
    (
        "Cable dressing, stripping outer sheath and glanding using double-compression glands",
        "3.2.04", 15, 6,
        [
            "Dressing armored cables into panels and making off nickel-plated double-compression glands",
            "Cable armor stripping, sheath dressing and fitting brass Ex-d double compression glands",
            "Terminating cable outer armor into double-compression weatherproof glands",
        ]
    ),
    (
        "Crimp tinned copper lugs onto power conductors using hydraulic crimping tool",
        "3.2.05", 15, 4,
        [
            "Hydraulic hex-die crimping of heavy-duty tinned copper lugs onto phase leads",
            "Crimping tinned copper terminal lugs on power feeder cable cores",
            "Pressing compression terminal lugs on power conductor ends using hydraulic tool",
        ]
    ),
    (
        "Terminate power leads and control wiring onto terminal strips inside MCC breaker cubicle",
        "3.2.06", 16, 5,
        [
            "Landing power conductors and ferruled control wires on MCC starter terminal blocks",
            "Wiring motor power leads and auxiliary control interlocks inside MCC compartment",
            "Terminating phase tails and numbered control wiring inside switchgear cubicle",
        ]
    ),
    (
        "Install stress cone terminations and cold shrink kits on 33kV XLPE cables",
        "3.2.07", 16, 4,
        [
            "Fitting 33kV cold-shrink stress relief termination kits on high-voltage cable ends",
            "Making off 33kV high voltage stress cone cold shrink terminations on XLPE cable",
            "Installing MV cold shrink indoor termination kits and grounding screen shields",
        ]
    ),
    (
        "Point-to-point ring-out continuity verification and wire ferrule alphanumeric check",
        "3.2.08", 17, 4,
        [
            "Conducting loop continuity ring-out and cross-checking wire sleeve ferrule tags",
            "Point-to-point wire check and verification against electrical schematic drawings",
            "Electrical wire ring-out testing and ferrule labeling confirmation across terminals",
        ]
    ),
    (
        "Terminate emergency trip push button interconnecting loop cable to ESD panel",
        "3.2.09", 17, 3,
        [
            "Wiring field emergency shutdown (ESD) push-button loop directly to safety PLC",
            "Terminating field ESD trip button contacts onto failsafe emergency panel strip",
            "Hooking up field emergency stop circuit wiring to central ESD logic rack",
        ]
    ),
    (
        "Pull DC battery backup supply cables from rack to UPS inverter cabinet",
        "3.2.10", 15, 4,
        [
            "Hauling heavy DC battery bank feed cables into uninterrupted power supply (UPS)",
            "Pulling DC positive/negative power supply cables from battery room to inverter",
            "Routing heavy-gauge DC battery supply conductors into main UPS cabinet",
        ]
    ),

    # Switchgear, Transformers & Commissioning (Phase: Weeks 14 - 24)
    (
        "Unload, position, and anchor 33/11kV oil-immersed power transformer onto concrete pad",
        "3.3.01", 14, 5,
        [
            "Rigging and skidding 33/11kV mineral oil transformer onto foundation plinth",
            "Positioning main 33/11kV power transformer on foundation and tightening hold-down bolts",
            "Landing oil-cooled step-down transformer onto embed plates and securing anchors",
        ]
    ),
    (
        "Erect 11kV vacuum circuit breaker switchgear cubicles and bolt copper busbar joints",
        "3.3.02", 15, 6,
        [
            "Assembling 11kV VCB switchboard lineup and torque-bolting main copper busbar links",
            "Installing 11kV vacuum switchgear panels and connecting internal busbar splices",
            "Setting 11kV metal-clad switchgear lineup and bolting phase busbar joints",
        ]
    ),
    (
        "Torque check and mark all internal phase busbar bolted connections with torque seal",
        "3.3.03", 16, 4,
        [
            "Calibrated torque verification and torque-seal paint marking on all busbar joints",
            "Torque checking switchgear bus joints and applying witness paint marks",
            "Checking busbar bolt torque with calibrated tool and applying torque stripe lacquer",
        ]
    ),
    (
        "Install battery bank racks, mount 2V lead-acid cells, and torque cell interlinks",
        "3.3.04", 16, 5,
        [
            "Assembling seismic battery stands, placing 2V flooded cells and bolting lead links",
            "Mounting 2V stationary battery cells on tier racks and torquing terminal straps",
            "Erecting DC battery room racking, placing cells and applying anti-corrosion paste",
        ]
    ),
    (
        "Position and bolt Low Voltage Motor Control Center (MCC) panel suite on floor channels",
        "3.3.05", 15, 6,
        [
            "Rigging and anchoring LV MCC switchboard assembly onto embedded floor channels",
            "Positioning low voltage MCC panel enclosure and tack-welding base channel irons",
            "Setting multi-tier LV Motor Control Center lineup over cable cellar opening",
        ]
    ),
    (
        "Install variable speed drive (VFD) cabinets and wire internal bypass contactors",
        "3.3.06", 17, 5,
        [
            "Erecting VFD drive enclosure cubicles and wiring motor bypass contactor circuits",
            "Mounting VFD drive panels and terminating power input/output bypass links",
            "Installing variable frequency drive units and wiring internal control logic",
        ]
    ),
    (
        "Drive copper-bonded ground rods and measure individual soil earth resistance",
        "3.3.07", 10, 4,
        [
            "Driving 3-meter copper-clad earth rods and testing resistance with 3-pole tester",
            "Sinking copper-bonded grounding electrodes and taking fall-of-potential readings",
            "Installing grounding rods and measuring individual pit ground resistance",
        ]
    ),
    (
        "Cadweld exothermic bond 50x6mm bare copper ground tape to plant grounding grid",
        "3.3.08", 11, 5,
        [
            "Thermite Cadweld exothermic welding of 50x6mm copper tape to perimeter ground loop",
            "Executing exothermic Cadweld connections between ground tape and main earth grid",
            "Cadwelding bare copper earthing ribbon to buried earthing mesh conductors",
        ]
    ),
    (
        "Perform 5kV / 1kV Megger insulation resistance testing on power feeder cables",
        "3.3.09", 18, 3,
        [
            "Megger insulation resistance testing (5kV/1kV DC) on phase-to-phase and phase-to-earth",
            "Insulation resistance Megger diagnostic testing on all power cable cores",
            "Conducting high voltage Megger test on power cables and logging insulation values",
        ]
    ),
    (
        "Secondary current injection testing of numerical protection relays (50/51/51N)",
        "3.3.10", 19, 4,
        [
            "Testing micro-processor protection relays with Omicron secondary current injection",
            "Calibrating overcurrent and earth fault protection curves using test injection kit",
            "Injecting secondary current to verify 50/51/51N protection relay trip timing",
        ]
    ),
    (
        "Transformer turns ratio (TTR), vector group, and winding resistance diagnostic testing",
        "3.3.11", 19, 4,
        [
            "Conducting TTR ratio test, winding resistance and vector phase angle diagnostics",
            "Transformer diagnostic tests: turns ratio, DC winding resistance and insulation PF",
            "Testing power transformer turns ratio, magnetizing current and vector group",
        ]
    ),
    (
        "High potential (Hi-Pot) DC / VLF withstand dielectric test on 33kV MV cable run",
        "3.3.12", 20, 3,
        [
            "Very Low Frequency (VLF) Hi-Pot dielectric withstand test on 33kV cable cores",
            "Performing 0.1Hz VLF high-voltage dielectric proof test on 33kV feeder",
            "Hi-Pot dielectric overpotential test on 33kV medium voltage cable circuit",
        ]
    ),
    (
        "Mount and wire LED floodlight luminaires on 25m high-mast yard lighting tower",
        "3.3.13", 21, 5,
        [
            "Installing multi-directional LED floodlight fixtures on high mast lighting ring",
            "Mounting high-efficiency LED luminaires and connecting trailing power harness",
            "Fixing LED flood lamps on high mast tower headframe and aiming lighting beams",
        ]
    ),
    (
        "Install and calibrate field smart pressure and temperature transmitters with HART communicator",
        "3.3.14", 21, 5,
        [
            "Field calibration and 4-20mA loop trimming of smart transmitters using HART 475",
            "Mounting pressure/temp transmitters on pipe stanchions and verifying HART ranges",
            "Installing field process transmitters, tagging and performing 5-point HART check",
        ]
    ),
    (
        "Cold loop check and signal verification between field instruments and DCS I/O cards",
        "3.3.15", 22, 6,
        [
            "End-to-end loop checking from field sensor terminals to central DCS operator screen",
            "Injecting 4-20mA simulated signals to verify DCS graphic display and alarm trips",
            "Full loop test and signal path validation from field transmitter to DCS console",
        ]
    ),
]


def generate_activities():
    """Generate 750 realistic construction activities across Civil, Mechanical, and Electrical."""
    activities = []
    base_project_start = date(2026, 6, 1)  # 6-month timeline: June 1, 2026 -> end of November 2026

    discipline_configs = [
        ("Civil", "ACT-CIV-", "1", CIVIL_LOCATIONS, CIVIL_WORK_PACKAGES, 250),
        ("Mechanical", "ACT-MEC-", "2", MECH_LOCATIONS, MECH_WORK_PACKAGES, 250),
        ("Electrical", "ACT-ELE-", "3", ELEC_LOCATIONS, ELEC_WORK_PACKAGES, 250),
    ]

    total_generated = 0

    for disc_name, prefix, disc_code, loc_list, work_pkg_list, target_count in discipline_configs:
        num_pkgs = len(work_pkg_list)
        num_locs = len(loc_list)

        for i in range(1, target_count + 1):
            act_id = f"{prefix}{i:04d}"
            pkg_idx = (i - 1) % num_pkgs
            loc_idx = (i - 1 + (i // num_pkgs)) % num_locs

            loc_name, asset_tag, zone = loc_list[loc_idx]
            canonical_task, wbs_sub, phase_offset_weeks, duration_days, variants = work_pkg_list[pkg_idx]

            # Generate hierarchical L5/L6 WBS Code: e.g. 1.2.04.15
            wbs_code = f"{disc_code}.{wbs_sub}.{((i - 1) % 50) + 1:02d}"

            # Phrasing variation logic:
            # Approx 10-15% of entries get distinct semantic paraphrases (shuffled order, field jargon, different sentence structure)
            # The remaining ~85-90% follow natural standard field descriptions.
            is_paraphrase_candidate = (i % 7 == 0) or (i % 13 == 0)  # ~15%

            if is_paraphrase_candidate and variants:
                chosen_variant = variants[(i + loc_idx) % len(variants)]
                # Add natural context tags
                style_roll = i % 3
                if style_roll == 0:
                    description = f"{chosen_variant} - {loc_name} ({asset_tag})"
                elif style_roll == 1:
                    description = f"{chosen_variant} at {asset_tag}, {zone}"
                else:
                    description = f"{chosen_variant} [{loc_name}]"
            else:
                # Standard clear engineering formats
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
            # Each package has a base phase_offset_weeks, plus slight staggering based on index
            stagger_days = ((i * 3) % 21) - 5  # -5 to +15 days stagger
            week_start_offset = phase_offset_weeks * 7 + stagger_days
            # Clamp between day 0 and day 165
            start_day_offset = max(0, min(165, week_start_offset))

            duration = max(2, min(24, duration_days + ((i % 5) - 2)))
            planned_start = base_project_start + timedelta(days=start_day_offset)
            planned_end = planned_start + timedelta(days=duration)

            # Assign realistic status based on schedule progression:
            # Assume simulation reference date is around mid-August 2026 (day ~75 of 180)
            # Activities finishing before day 60: mostly COMPLETED
            if planned_end <= date(2026, 8, 10):
                # Early activities
                if i % 11 == 0:
                    status = "DELAYED"
                else:
                    status = "COMPLETED"
            elif planned_start <= date(2026, 8, 25) <= planned_end:
                # Current active window
                if i % 5 == 0:
                    status = "DELAYED"
                elif i % 4 == 0:
                    status = "COMPLETED"
                else:
                    status = "IN_PROGRESS"
            elif planned_start > date(2026, 8, 25):
                # Future activities
                if i % 17 == 0:
                    status = "DELAYED"  # Pre-requisite delayed
                else:
                    status = "NOT_STARTED"
            else:
                if i % 6 == 0:
                    status = "DELAYED"
                else:
                    status = "IN_PROGRESS"

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
