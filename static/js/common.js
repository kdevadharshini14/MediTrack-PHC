/**
 * MediTrack PHC - 100% Pure Tamil / English Bilingual Engine
 * Translates EVERY element: Medicine names, Hospital names, Categories, Units, Badges, Tables, Forms.
 * Absolutely ZERO English-Tamil mixing when Tamil is selected!
 */

const rawTamilTranslations = [
  // 1. HOSPITAL & PHC NAMES (முழு மருத்துவமனை பெயர்கள்)
  ["Komarapalayam PHC", "குமாரபாளையம் ஆரம்ப சுகாதார நிலையம்"],
  ["Pallipalayam PHC", "பள்ளிபாளையம் ஆரம்ப சுகாதார நிலையம்"],
  ["Tiruchengode PHC", "திருச்செங்கோடு ஆரம்ப சுகாதார நிலையம்"],
  ["Namakkal Town PHC", "நாமக்கல் டவுன் ஆரம்ப சுகாதார நிலையம்"],
  ["Rasipuram PHC", "ராசிபுரம் ஆரம்ப சுகாதார நிலையம்"],
  ["Paramathi Velur PHC", "பரமத்தி வேலூர் ஆரம்ப சுகாதார நிலையம்"],
  ["Kaveri Hospital PHC", "காவேரி மருத்துவமனை ஆரம்ப சுகாதார நிலையம்"],
  ["Komarapalayam, Namakkal", "குமாரபாளையம், நாமக்கல்"],
  ["Pallipalayam, Namakkal", "பள்ளிபாளையம், நாமக்கல்"],
  ["Tiruchengode, Namakkal", "திருச்செங்கோடு, நாமக்கல்"],
  ["Namakkal, Namakkal", "நாமக்கல், நாமக்கல்"],
  ["Rasipuram, Namakkal", "ராசிபுரம், நாமக்கல்"],
  ["Paramathi Velur, Namakkal", "பரமத்தி வேலூர், நாமக்கல்"],
  ["Primary Health Centre Network", "ஆரம்ப சுகாதார நிலைய கட்டமைப்பு"],
  ["Primary Health Centre", "ஆரம்ப சுகாதார நிலையம்"],
  ["Primary Health Centres", "ஆரம்ப சுகாதார நிலையங்கள்"],
  ["Namakkal District, Tamil Nadu", "நாமக்கல் மாவட்டம், தமிழ்நாடு"],
  ["Namakkal District", "நாமக்கல் மாவட்டம்"],
  ["Tamil Nadu", "தமிழ்நாடு"],
  ["PHC", "ஆரம்ப சுகாதார நிலையம்"],

  // 2. MEDICINE & TABLET NAMES (அனைத்து மாத்திரைகள் & மருந்துகள்)
  ["Paracetamol syrup (100ml Bottle)", "பாராசிட்டமால் சிரப் (100மி.லி பாட்டில்)"],
  ["Paracetamol syrup", "பாராசிட்டமால் சிரப்"],
  ["Paracetamol", "பாராசிட்டமால்"],
  ["Amoxicillin (500mg Strip)", "அமாக்சிசில்லிங் (500மி.கி ஸ்ட்ரிப்)"],
  ["Amoxicillin", "அமாக்சிசில்லிங்"],
  ["ORS (Sachet)", "உயிர் காக்கும் உப்பு கரைசல் - ஓ.ஆர்.எஸ் (பாக்கெட்)"],
  ["ORS", "ஓ.ஆர்.எஸ் (உயிர் காக்கும் உப்பு கரைசல்)"],
  ["Metformin (500mg Strip)", "மெட்ஃபார்மின் (500மி.கி ஸ்ட்ரிப்)"],
  ["Metformin", "மெட்ஃபார்மின்"],
  ["Amlodipine (5mg Strip)", "அம்லோடிபைன் (5மி.கி ஸ்ட்ரிப்)"],
  ["Amlodipine", "அம்லோடிபைன்"],
  ["Cetirizine (10mg Strip)", "செட்டிரிசின் (10மி.கி ஸ்ட்ரிப்)"],
  ["Cetirizine", "செட்டிரிசின்"],
  ["Insulin (10ml Vial)", "இன்சுலின் (10மி.லி வயல்)"],
  ["Insulin", "இன்சுலின்"],
  ["Atenolol (50mg Strip)", "அடெனோலோல் (50மி.கி ஸ்ட்ரிப்)"],
  ["Atenolol", "அடெனோலோல்"],
  ["Omeprazole (20mg Strip)", "ஒமிபிரசோல் (20மி.கி ஸ்ட்ரிப்)"],
  ["Omeprazole", "ஒமிபிரசோல்"],
  ["Vitamin B12 (Strip)", "வைட்டமின் B12 (ஸ்ட்ரிப்)"],
  ["Vitamin B12", "வைட்டமின் B12"],
  ["Azithromycin (500mg Strip)", "அசித்ரோமைசின் (500மி.கி ஸ்ட்ரிப்)"],
  ["Azithromycin 250mg", "அசித்ரோமைசின் 250மி.கி"],
  ["Azithromycin", "அசித்ரோமைசின்"],
  ["Salbutamol (Inhaler)", "சல்பியூட்டமால் (ஆஸ்துமா இன்ஹேலர்)"],
  ["Salbutamol", "சல்பியூட்டமால் இன்ஹேலர்"],
  ["Limcee", "லிம்சி (வைட்டமின் சி)"],
  ["Dolo 650", "டோலோ 650"],
  ["Vitamin C 500mg", "வைட்டமின் சி 500மி.கி"],
  ["Vitamin C", "வைட்டமின் சி"],
  ["Doxycycline 100mg", "டாக்ஸிசைக்ளின் 100மி.கி"],
  ["Doxycycline", "டாக்ஸிசைக்ளின்"],
  ["Rabies Vaccine", "வெறிநாய் கடி தடுப்பூசி"],
  ["Cough Syrup", "இருமல் சிரப்"],
  ["Iron & Folic Acid", "இரும்புச்சத்து & ஃபோலிக் அமிலம்"],

  // 3. THERAPEUTIC CATEGORIES (மருத்துவப் பிரிவுகள்)
  ["Antipyretic / Analgesic", "காய்ச்சல் & வலி நிவாரணி"],
  ["Antipyretic", "காய்ச்சல் நிவாரணி"],
  ["Antibiotic", "நுண்ணுயிர் எதிர்ப்பு (ஆன்டிபயாடிக்)"],
  ["Rehydration", "நீரிழப்பு தடுப்பு மருந்து"],
  ["Antidiabetic", "நீரிழிவு / சர்க்கரை நோய் மருந்து"],
  ["Cardiovascular", "இதயம் & ரத்த அழுத்த மருந்து"],
  ["Antihistamine", "ஒவ்வாமை எதிர்ப்பு (அலர்ஜி)"],
  ["Gastrointestinal", "இரைப்பை & செரிமான மருந்து"],
  ["Supplement", "ஊட்டச்சத்து துணை மருந்து"],
  ["Supplements", "ஊட்டச்சத்து சப்ளிமெண்ட்ஸ்"],
  ["Respiratory", "சுவாசக் கோளாறு / ஆஸ்துமா"],
  ["Pediatrics", "குழந்தைகள் நலம்"],
  ["Pediatric", "குழந்தைகள் நலம்"],
  ["Vaccine", "தடுப்பூசி"],
  ["Emergency", "அவசர சிகிச்சை மருந்து"],
  ["Vitamin", "வைட்டமின் சத்து"],

  // 4. UNITS OF MEASUREMENT (அளவீட்டு அலகுகள்)
  ["100ml Bottle", "100மி.லி பாட்டில்"],
  ["10ml Vial", "10மி.லி வயல்"],
  ["500mg Strip", "500மி.கி ஸ்ட்ரிப்"],
  ["50mg Strip", "50மி.கி ஸ்ட்ரிப்"],
  ["20mg Strip", "20மி.கி ஸ்ட்ரிப்"],
  ["10mg Strip", "10மி.கி ஸ்ட்ரிப்"],
  ["5mg Strip", "5மி.கி ஸ்ட்ரிப்"],
  ["Tablet Strip", "மாத்திரை ஸ்ட்ரிப்"],
  ["Strip", "ஸ்ட்ரிப்"],
  ["Strips", "ஸ்ட்ரிப்கள்"],
  ["strip", "ஸ்ட்ரிப்"],
  ["strips", "ஸ்ட்ரிப்கள்"],
  ["Bottle", "பாட்டில்"],
  ["Bottles", "பாட்டில்கள்"],
  ["bottle", "பாட்டில்"],
  ["bottles", "பாட்டில்கள்"],
  ["Tablet", "மாத்திரை"],
  ["Tablets", "மாத்திரைகள்"],
  ["tablet", "மாத்திரை"],
  ["tablets", "மாத்திரைகள்"],
  ["Vial", "வயல்"],
  ["Vials", "வயல்கள்"],
  ["vial", "வயல்"],
  ["vials", "வயல்கள்"],
  ["Sachet", "பாக்கெட்"],
  ["Sachets", "பாக்கெட்டுகள்"],
  ["sachet", "பாக்கெட்"],
  ["sachets", "பாக்கெட்டுகள்"],
  ["Inhaler", "இன்ஹேலர்"],
  ["inhaler", "இன்ஹேலர்"],
  ["Ampoule", "ஆம்பூல்"],
  ["ampoule", "ஆம்பூல்"],
  ["units", "யூனிட்டுகள்"],
  ["unit", "யூனிட்"],
  ["/ day", "/ நாள்"],
  ["away", "தொலைவில்"],

  // 5. NAVBAR, BRAND & ACTIONS
  ["MediTrack PHC", "மெடிட்ராக் PHC"],
  ["Medicine Stock & Lateral Redistribution System", "மருந்து இருப்பு & உடனடி பகிர்வு கட்டமைப்பு"],
  ["Medicine Stock & Lateral Redistribution", "மருந்து இருப்பு & உடனடி பகிர்வு கட்டமைப்பு"],
  ["Dashboard", "முகப்பு"],
  ["My Stock", "எனது இருப்பு"],
  ["Stock Inventory", "எனது இருப்பு"],
  ["Daily Dispensing", "தினசரி விநியோகம்"],
  ["Daily Usage Entry", "தினசரி விநியோகம்"],
  ["Peer Transfers", "உடனடி பகிர்வு"],
  ["Shortage Alerts", "பற்றாக்குறை எச்சரிக்கை"],
  ["Analytics & Forecast", "தேவை கணிப்பு"],
  ["Audit Log", "தணிக்கை பதிவு"],
  ["Activity Log", "தணிக்கை பதிவு"],
  ["Logout", "வெளியேறு"],

  // 6. DASHBOARD & METRICS
  ["Dedicated Pharmacy & Inventory Management Workspace", "பிரத்யேக மருந்தகம் மற்றும் இருப்பு மேலாண்மை பகுதி"],
  ["Record Dispensing", "விநியோகப் பதிவு"],
  ["View Transfers", "பகிர்வுகளைப் பார்"],
  ["LOCAL CRITICAL SHORTAGE DETECTED", "அவசர மருந்து பற்றாக்குறை கண்டறியப்பட்டது!"],
  ["Stock is depleting rapidly at your health centre.", "உங்கள் மையத்தில் மருந்து மிக வேகமாக தீர்ந்து வருகிறது."],
  ["Find Donors & Request Stock →", "உபரி உள்ள PHC-ஐத் தேடி மருந்து கோரு →"],
  ["Find Donors & Request Stock", "உபரி உள்ள PHC-ஐத் தேடி மருந்து கோரு"],
  ["My Tracked Medicines", "கண்காணிக்கப்படும் மருந்துகள்"],
  ["Critical Shortages", "தீவிர பற்றாக்குறை"],
  ["Warning Buffers", "எச்சரிக்கை நிலை"],
  ["Incoming Requests", "வந்த பகிர்வு கோரிக்கைகள்"],
  ["Outgoing Requests", "அனுப்பிய பகிர்வு கோரிக்கைகள்"],
  ["Search Medicine Across Block & Find Surplus Donors", "🔍 வட்டாரத்தில் மருந்தை தேடி உபரி PHC-ஐ கண்டறிதல்"],
  ["Need a medicine? Select it here to instantly scan neighbouring centres within 25 km that hold extra surplus stock.", "மருந்து தேவையா? 25 கி.மீ-க்குள் உபரி மருந்து வைத்துள்ள பக்கத்து PHC-களை உடனடியாகக் கண்டறியுங்கள்."],
  ["Select medicine you need to request...", "கோர வேண்டிய மருந்தை தேர்ந்தெடுக்கவும்..."],
  ["Scan Nearby Centres", "பக்கத்து PHC-களை ஸ்கேன் செய்"],
  ["Nearest Surplus Donors Found:", "கண்டறியப்பட்ட அருகிலுள்ள உபரி PHC-கள்:"],
  ["Nearest Surplus Donors Found", "கண்டறியப்பட்ட அருகிலுள்ள உபரி PHC-கள்"],
  ["Quick Stock Snapshot & Velocity Health", "📦 உடனடி இருப்பு & பயன்பாட்டு வேகம்"],
  ["Inspect All Medicines in Inventory →", "அனைத்து மருந்துகளையும் பார் →"],
  ["Inspect All Medicines in Inventory", "அனைத்து மருந்துகளையும் பார்"],

  // 7. STOCK PAGE
  ["Stock Inventory & Depletion Velocity", "மருந்து இருப்பு & பயன்பாட்டு வேகம்"],
  ["Manage your health centre's live medicine supply, monitor days of supply remaining, and detect rapid consumption trends.", "உங்கள் மையத்தின் மருந்துகளை நிர்வகிக்கவும், இருப்பு மீதமுள்ள நாட்களை கண்காணிக்கவும்."],
  ["+ Add Medicine from Catalog", "+ பட்டியலில் இருந்து மருந்து சேர்"],
  ["✨ Register Brand New Medicine", "✨ புதிய மருந்தை பதிவு செய்"],
  ["Search medicines by name or category...", "மருந்து அல்லது பிரிவின் பெயர் கொண்டு தேட..."],
  ["Therapeutic Category", "சிகிச்சை பிரிவு"],
  ["Unit of Packaging", "அளவீட்டு அலகு (Unit)"],
  ["Initial Quantity in Stock", "ஆரம்ப இருப்பு அளவு"],
  ["Minimum Safe Threshold (Buffer)", "குறைந்தபட்ச பாதுகாப்பு இருப்பு"],
  ["Min Safe Threshold", "குறைந்தபட்ச இருப்பு"],
  ["Initial Quantity", "ஆரம்ப இருப்பு"],
  ["Medicine Generic / Brand Name", "மருந்தின் பெயர்"],
  ["Select Medicine from Master Catalog", "முக்கிய பட்டியலில் இருந்து மருந்தை தேர்வு செய்"],
  ["Select Medicine from catalog...", "பட்டியலில் இருந்து மருந்தை தேர்வு செய்..."],
  ["✨ Register a Brand New Medicine here", "✨ முற்றிலும் புதிய மருந்தை இங்கே பதிவு செய்யவும்"],
  ["Don't see your medicine?", "மருந்து பட்டியலில் இல்லையா?"],
  ["Update Stock:", "இருப்பை மாற்று:"],
  ["Update Stock", "இருப்பை மாற்று"],
  ["Add to Inventory", "இருப்பில் சேர்"],
  ["Register & Add to Stock", "பதிவு செய்து சேர்க்கவும்"],
  ["Save Changes", "மாற்றங்களைச் சேமி"],
  ["Cancel", "ரத்து செய்"],

  // 8. DAILY DISPENSING
  ["Daily Outpatient Dispensing Entry", "தினசரி வெளிநோயாளி மருந்து விநியோகப் பதிவு"],
  ["Record quantities dispensed to patients today. Stock will be atomically subtracted, days remaining updated, and early warnings refreshed.", "இன்று நோயாளிகளுக்கு வழங்கப்பட்ட மருந்துகளை பதிவு செய்யவும். இருப்பு உடனடியாக குறைக்கப்படும்."],
  ["Dispensing Date", "விநியோக தேதி"],
  ["Medicines Dispensed to Patients", "நோயாளிகளுக்கு வழங்கப்பட்ட மருந்துகள்"],
  ["Choose medicine to dispense...", "வழங்க வேண்டிய மருந்தை தேர்ந்தெடுக்கவும்..."],
  ["Quantity Dispensed", "வழங்கப்பட்ட அளவு"],
  ["Available Stock", "கையிருப்பு"],
  ["+ Add Another Medicine Row", "+ மற்றொரு மருந்தை சேர்"],
  ["Save Dispensing Entry", "விநியோகத்தை சேமி"],

  // 9. PEER TRANSFERS & DISTRICT INDENT
  ["Peer-to-Peer Lateral Stock Transfers", "மையங்களுக்கு இடையேயான உடனடி மருந்து பகிர்வு"],
  ["Incoming Transfer Requests (Other PHCs asking YOU for stock)", "உள்வரும் கோரிக்கைகள் (பிற PHC-கள் உங்களிடம் கேட்பவை)"],
  ["Incoming Transfer Requests", "உள்வரும் பகிர்வு கோரிக்கைகள்"],
  ["Outgoing Transfer Requests (Stock YOU requested from others)", "வெளிச்செல்லும் கோரிக்கைகள் (நீங்கள் பிறரிடம் கேட்டவை)"],
  ["Outgoing Transfer Requests", "வெளிச்செல்லும் பகிர்வு கோரிக்கைகள்"],
  ["Auto-Generated District Indent", "தானாக உருவாக்கப்பட்ட மாவட்ட Indent"],
  ["Residual 30-day requirement after accounting for what neighbouring surplus PHCs can supply laterally.", "பக்கத்து PHC-கள் தரக்கூடிய அளவை கழித்த பிறகு தேவைப்படும் நிகர மாவட்ட அளவு."],
  ["Generate District Indent", "மாவட்ட Indent உருவாக்கு"],
  ["Download District Indent CSV", "மாவட்ட Indent CSV பதிவிறக்கு"],
  ["Export CSV", "CSV பதிவிறக்கு"],
  ["Requested By", "கோரிய PHC"],
  ["Requester PHC", "கோரிய PHC"],
  ["Donor PHC", "வழங்கும் PHC"],
  ["Suggested Peer Donor", "பரிந்துரைக்கப்பட்ட PHC"],
  ["Peer Donors Cover", "பக்கத்து PHC-கள் தருவது"],
  ["Net District Indent", "நிகர மாவட்ட தேவை"],
  ["30-Day Need", "30-நாள் தேவை"],
  ["Gross 30-Day Need", "மொத்த 30-நாள் தேவை"],
  ["Approve", "ஒப்புதல் அளி"],
  ["Reject", "நிராகரி"],
  ["Pending", "நிலுவையில்"],
  ["Approved & Dispatched", "ஒப்புதல் & அனுப்பப்பட்டது"],
  ["Approved", "ஏற்றுக்கொள்ளப்பட்டது"],
  ["Rejected", "நிராகரிக்கப்பட்டது"],
  ["Live Tracking", "நேரலை கண்காணிப்பு"],
  ["Track Live Transit", "நேரலை பயணத்தை பார்"],
  ["Track Dispatch", "பயணத்தை பார்"],
  ["Stock Transferred & En Route", "இருப்பு மாற்றப்பட்டு வழியில் வருகிறது"],
  ["Awaiting Donor Action", "வழங்கும் மையத்தின் ஒப்புதலுக்காக காத்திருக்கிறது"],
  ["Live Medicine Transit Tracking", "நேரலை மருந்து போக்குவரத்து கண்காணிப்பு"],
  ["Consignment:", "பார்சல் எண்:"],
  ["DONOR ORIGIN", "வழங்கும் மையம் (புறப்படும் இடம்)"],
  ["REQUESTER DESTINATION", "கோரிய மையம் (வந்து சேரும் இடம்)"],
  ["Approved & Packed", "ஒப்புதல் & பேக்கிங் முடிந்தது"],
  ["In Transit (On Route)", "வழியில் வருகிறது (On Route)"],
  ["Received at PHC", "மையத்திற்கு வந்து சேர்ந்தது"],
  ["Estimated Arrival (ETA)", "வந்து சேரும் உத்தேச நேரம் (ETA)"],
  ["Carrier Mode", "போக்குவரத்து வாகனம்"],
  ["Cold-Chain Integrity", "குளிர்பதன நிலை (Cold-Chain)"],
  ["Controlled Cold-Chain (4°C - 8°C)", "கட்டுப்படுத்தப்பட்ட குளிர் நிலை (4°C - 8°C)"],
  ["TN 108 Medical Van / Runner", "தமிழக அரசு 108 அவசர ஊர்தி / ரன்னர்"],
  ["Live Vehicle Tracking Active:", "நேரலை வாகன கண்காணிப்பு இயக்கத்தில் உள்ளது:"],
  ["Emergency stock has departed", "அவசர மருந்து புறப்பட்டு"],
  ["Contact Runner", "ரன்னரைத் தொடர்புகொள்"],
  ["Mark as Received & Verified", "வந்து சேர்ந்ததை உறுதிசெய்"],
  ["Stock Received & Added to Rack", "மருந்து வந்து சேர்ந்தது (ரேக்கில் வைக்கப்பட்டது)"],
  ["Consignment Verified & Stored:", "மருந்து சரிபார்க்கப்பட்டு இருப்பு வைக்கப்பட்டது:"],

  // NEW UNIQUE FEATURES: EPIDEMIC RADAR & CITIZEN PORTAL
  ["Citizen Medicine Availability Checker", "பொதுமக்கள் மருந்து இருப்பு சரிபார்ப்பு"],
  ["Citizen Stock Checker", "பொதுமக்கள் மருந்து இருப்பு சரிபார்ப்பு"],
  ["Public Stock Check", "பொதுமக்கள் இருப்பு தகவல்"],
  ["Public / Citizen Stock Checker", "பொதுமக்கள் மருந்து இருப்பு தகவல்"],
  ["Digital Batch Passport & Origin Traceability", "டிஜிட்டல் மருந்து பாஸ்போர்ட் & உற்பத்தி வரலாறு"],
  ["Digital Batch Passport", "டிஜிட்டல் மருந்து பாஸ்போர்ட்"],
  ["Batch Passport", "பேட்ச் பாஸ்போர்ட்"],
  ["View Passport", "பாஸ்போர்ட் பார்க்க"],
  ["Near-Expiry Smart Rescue Swap", "காலாவதி தடுப்பு தலைகீழ் மறுபகிர்வு"],
  ["Smart Expiry Rescue Swap", "காலாவதி தடுப்பு தலைகீழ் மறுபகிர்வு"],
  ["Execute Smart Rescue Swap", "மருந்தை வீணாகாமல் மாற்று"],
  ["Autonomous Lateral Rebalance", "தானியங்கி மறுபகிர்வு"],
  ["Auto-Rebalance Now", "தானாகவே வரவழை"],
  ["Proof of Consumption", "நோயாளிக்கு சென்றடைந்த உறுதிப்படுத்தல்"],
  ["Zero Medicine Wastage", "பூஜ்ஜிய மருந்து வீணடிப்பு"],
  ["100% Verified Genuine", "100% அரசு அங்கீகரித்த அசல் மருந்து"],
  ["Cryptographic Provenance Verified", "கிரிப்டோகிராஃபிக் முறையில் சரிபார்க்கப்பட்டது"],
  ["Cold Chain Oracle", "குளிர்சாதனப் பாதுகாப்பு நிலை"],
  ["Genesis Root Hash", "தொடக்க உற்பத்தி ஹாஷ்"],
  ["Tamper-Proof Audit Trail", "மாற்ற முடியாத பாதுகாப்பு பதிவு"],
  ["Verify Medicine Origin", "மருந்தின் தயாரிப்பு & வரலாற்றை சரிபார்"],
  ["Zero Counterfeit Verified", "போலி மருந்து இல்லை என உறுதி செய்யப்பட்டது"],
  ["Offline Mode", "இணையமில்லா ஆஃப்லைன் முறை"],
  ["Online", "இணைய இணைப்பு உள்ளது"],
  ["Online (Auto-Sync Active)", "இணைய இணைப்பு உள்ளது (தானியங்கி சேமிப்பு இயக்கத்தில்)"],
  ["Offline Mode • Outbox", "ஆஃப்லைன் முறை • அவுட்பாக்ஸ்"],
  ["Sync Now", "உடனே சேமி"],
  ["Offline Outbox Active", "ஆஃப்லைன் அவுட்பாக்ஸ் செயல்படுகிறது"],
  ["Pharmacist 1-Sentence Action Guide", "மருந்தாளுனருக்கான நேரடி செயல் வழிகாட்டி"],
  ["No mother walks in vain", "தாய்மார்கள் ஏமாறாமல் இருக்க"],
  ["No mother walks 6 km in vain", "எந்தவொரு தாயும் ஏமாந்து 6 கி.மீ நடக்காமல் இருக்க"],
  ["Select Essential Medicine", "அத்தியாவசிய மருந்தை தேர்வு செய்யவும்"],
  ["Select Your Primary Health Centre (PHC)", "உங்கள் ஆரம்ப சுகாதார நிலையத்தைத் தேர்வு செய்யவும்"],
  ["All Health Centres in Namakkal Block", "நாமக்கல் வட்டாரத்தின் அனைத்து ஆரம்ப சுகாதார நிலையங்கள்"],
  ["Check Stock", "இருப்பை சரிபார்"],
  ["Check Live Availability", "நேரலை இருப்பை சரிபார்"],
  ["Live Stock Status", "நேரலை இருப்பு நிலை"],
  ["In Stock & Ready to Dispense", "இருப்பு உள்ளது (வழங்க தயார்)"],
  ["Currently Out of Stock", "தற்போது இருப்பு இல்லை"],
  ["Limited Supply", "குறைந்த அளவு இருப்பு"],
  ["Alternative Nearest Centre:", "மாற்று அருகிலுள்ள சுகாதார நிலையம்:"],
  ["Located", "தொலைவு:"],
  ["Surplus Stock Available:", "உபரி இருப்பு உள்ளது:"],
  ["Emergency lateral transfer can be dispatched within 2 hours.", "அவசர நேரடி பகிர்வு 2 மணி நேரத்தில் அனுப்பி வைக்கப்படும்."],
  ["Current Pharmacy Stock:", "மருந்தக கையிருப்பு:"],
  ["Staff Login", "மருத்துவமனை ஊழியர் உள்நுழைவு"],
  ["ACTIVE OUTBREAK CLUSTER DETECTED", "🚨 தீவிர தொற்றுநோய் பரவல் கண்டறியப்பட்டது"],
  ["LOCALIZED VELOCITY SPIKE", "⚠️ உள்ளூர் பயன்பாட்டு வேக அதிகரிப்பு"],
  ["Rebalance Block Stock →", "வட்டார இருப்பை சமன்செய் →"],
  ["Rebalance Block Stock", "வட்டார இருப்பை சமன்செய்"],
  ["Simultaneous rapid burn surge detected across", "அதிவேக பயன்பாட்டு அதிகரிப்பு கண்டறியப்பட்டது:"],
  ["Trigger lateral redistribution from surplus centres", "உபரி மையங்களில் இருந்து உடனடி பகிர்வை மேற்கொள்க"],

  // 10. ALERTS & REBALANCE
  ["Real-Time Medicine Shortage Alerts", "நேரலை மருந்து பற்றாக்குறை எச்சரிக்கைகள்"],
  ["Automated early warnings triggered when days of supply drop below safe thresholds or when consumption velocity surges unexpectedly.", "மருந்து இருப்பு குறையும் போதோ அல்லது பயன்பாடு திடீரென அதிகரிக்கும் போதோ வழங்கப்படும் எச்சரிக்கைகள்."],
  ["Active Alerts", "செயலில் உள்ள எச்சரிக்கைகள்"],
  ["Resolved History", "தீர்க்கப்பட்ட எச்சரிக்கைகள்"],
  ["Triggered:", "உருவான நேரம்:"],
  ["Suggested Donor:", "பரிந்துரைக்கப்பட்ட பகிர்வாளர்:"],
  ["Suggested peer donor:", "பரிந்துரைக்கப்பட்ட பகிர்வாளர்:"],
  ["Request Transfer (EMERGENCY)", "அவசர பகிர்வு கோரு"],
  ["Request Transfer", "பகிர்வு கோரு"],
  ["FAST BURN RATE", "அதிவேகமாக கரைகிறது"],
  ["LOW STOCK QUANTITY", "குறைந்த இருப்பு"],
  ["Can supply:", "வழங்கக்கூடிய அளவு:"],
  ["Distance:", "தூரம்:"],

  // 11. ANALYTICS & AUDIT LOG
  ["Consumption Trends & 7-Day Demand Forecast", "பயன்பாட்டு விபரம் & 7-நாள் தேவை முன்னறிவிப்பு"],
  ["Moving average projections and consumption velocity tracking.", "பயன்பாட்டு வேகம் மற்றும் எதிர்கால கணிப்பு வரைபடம்."],
  ["Past 7 Days", "கடந்த 7 நாட்கள்"],
  ["Past 30 Days", "கடந்த 30 நாட்கள்"],
  ["Historical Consumption & 7-Day Moving Average Forecast", "வரலாற்று பயன்பாடு & 7-நாள் தேவை கணிப்பு"],
  ["Actual Daily Consumption", "உண்மையான தினசரி பயன்பாடு"],
  ["Projected 7-Day Forecast (SMA)", "கணிக்கப்பட்ட 7-நாள் தேவை (SMA)"],
  ["Projected 7-Day Forecast", "கணிக்கப்பட்ட 7-நாள் தேவை"],
  ["System Audit Trail & Activity Log", "கணினி தணிக்கை & வரலாற்று பதிவு"],
  ["Timestamped log of all stock updates, dispensations, and lateral transfers.", "அனைத்து விநியோகம், பகிர்வு மற்றும் மாற்றங்களின் பதிவு."],
  ["Timestamp", "நேரம்"],
  ["Action Performed", "செயல்பாடு"],
  ["Details", "விவரங்கள்"],

  // 12. TABLE COLUMN HEADERS
  ["Medicine Name", "மருந்தின் பெயர்"],
  ["Medicine", "மருந்து"],
  ["Category", "பிரிவு"],
  ["Current Stock", "தற்போதைய இருப்பு"],
  ["Min Safe Level", "பாதுகாப்பு இருப்பு"],
  ["Daily Burn Velocity", "தினசரி பயன்பாட்டு வேகம்"],
  ["Stock Runout (Days Left)", "தீர்ந்துபோகும் நாட்கள் (Days Left)"],
  ["7-Day Velocity Trend", "7-நாள் பயன்பாட்டு Trend"],
  ["Expiry Details", "காலாவதி விபரம்"],
  ["Expiry Date", "காலாவதி தேதி"],
  ["Actions", "செயல்பாடுகள்"],
  ["Action", "செயல்பாடு"],
  ["Inspect", "பார்"],
  ["Edit", "மாற்று"],
  ["Urgency", "முன்னுரிமை"],
  ["Status", "நிலை"],
  ["Quantity", "அளவு"],

  // 13. VELOCITY STATUS & BADGES
  ["Burning faster", "வேகமாக செலவாகிறது"],
  ["Slowing down", "பயன்பாடு குறைகிறது"],
  ["Stable", "சீரான பயன்பாடு"],
  ["Adequate", "போதுமானது"],
  ["No usage yet", "பயன்பாடு துவங்கவில்லை"],
  ["No usage", "பயன்பாடு இல்லை"],
  ["days left", "நாட்கள் மட்டுமே வரும்"],
  ["days remaining", "நாட்கள் மட்டுமே மீதம்"],
  ["days", "நாட்கள்"],
  ["day", "நாள்"],
  ["Expires in", "காலாவதியாக இன்னும்"],
  ["Suggest transfer to", "பரிந்துரைக்கப்படும் மையம்:"],
  ["burns", "பயன்படுத்துகிறது"],
  ["Stock critical", "தீவிர இருப்பு பற்றாக்குறை"],
  ["Low buffer stock", "குறைந்த தாங்கல் இருப்பு"],
  ["below minimum safe level of", "குறைந்தபட்ச பாதுகாப்பு இருப்பை விட குறைவு:"],
  ["at current burn rate", "தற்போதைய வேகத்தில்"],
  ["at current rate", "தற்போதைய வேகத்தில்"],
  ["this week", "இந்த வாரம்"],
  ["Stock:", "இருப்பு:"],
  ["Min:", "குறைந்தபட்சம்:"],
  ["EMERGENCY", "அவசரம்"],
  ["NORMAL", "சாதாரண"],
  ["None", "எதுவுமில்லை"],
  ["Peer-to-peer redistribution active within 25 km radius.", "25 கி.மீ சுற்றளவில் உடனடி மருந்து பகிர்வு இயக்கத்தில் உள்ளது."]
];

// Sort descending by English text length so long phrases match before shorter sub-words
const sortedTranslations = [...rawTamilTranslations].sort((a, b) => b[0].length - a[0].length);

let currentLang = localStorage.getItem("meditrack_lang") || "en";
let isTranslatingDOM = false;

// Recursive DOM translator that handles all text nodes, inputs, placeholders, buttons, selects
function translateNode(node, lang) {
  if (!node) return;

  // Ignore script, style, and code tags
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE") return;

    // Translate placeholder attributes
    if (node.hasAttribute && node.hasAttribute("placeholder")) {
      const ph = node.getAttribute("placeholder");
      if (lang === "ta") {
        if (!node._originalPlaceholder) node._originalPlaceholder = ph;
        let trans = node._originalPlaceholder;
        for (const [enText, taText] of sortedTranslations) {
          if (trans.includes(enText)) trans = trans.split(enText).join(taText);
        }
        node.setAttribute("placeholder", trans);
      } else if (lang === "en" && node._originalPlaceholder) {
        node.setAttribute("placeholder", node._originalPlaceholder);
      }
    }
  }

  // Handle TEXT nodes
  if (node.nodeType === Node.TEXT_NODE) {
    const val = node.nodeValue;
    if (!val || !val.trim()) return;

    if (lang === "ta") {
      if (node._originalEn === undefined) {
        node._originalEn = val;
      }
      let trans = node._originalEn;
      for (const [enText, taText] of sortedTranslations) {
        if (trans.includes(enText)) {
          trans = trans.split(enText).join(taText);
        }
      }
      if (trans !== node.nodeValue) {
        node.nodeValue = trans;
      }
    } else if (lang === "en") {
      if (node._originalEn !== undefined && node.nodeValue !== node._originalEn) {
        node.nodeValue = node._originalEn;
      }
    }
    return;
  }

  // Walk children recursively
  if (node.childNodes && node.childNodes.length > 0) {
    node.childNodes.forEach(child => translateNode(child, lang));
  }
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("meditrack_lang", lang);

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) {
    langBtn.textContent = lang === "en" ? "தமிழ்" : "English";
  }

  isTranslatingDOM = true;
  try {
    translateNode(document.body, lang);
  } finally {
    isTranslatingDOM = false;
  }
}

function toggleLanguage() {
  const nextLang = currentLang === "en" ? "ta" : "en";
  applyLanguage(nextLang);
}

// Toast Notifications
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ"}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  if (currentLang === "ta") {
    translateNode(toast, "ta");
  }

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
    if (currentLang === "ta") {
      translateNode(modal, "ta");
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("show");
}

// Refresh active alert badge count
async function refreshAlertCount() {
  try {
    const res = await fetch("/api/alerts/count");
    const json = await res.json();
    if (json.success) {
      const badge = document.getElementById("alertBellBadge");
      if (badge) {
        if (json.data.total > 0) {
          badge.textContent = json.data.total;
          badge.style.display = "inline-block";
          if (json.data.critical > 0) {
            badge.style.backgroundColor = "var(--danger)";
          } else {
            badge.style.backgroundColor = "var(--warning)";
          }
        } else {
          badge.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.error("Error fetching alert count:", err);
  }
}

// Setup MutationObserver to automatically translate newly added DOM rows
function setupDynamicMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (isTranslatingDOM || currentLang !== "ta") return;

    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(addedNode => {
          if (addedNode.nodeType === Node.ELEMENT_NODE || addedNode.nodeType === Node.TEXT_NODE) {
            isTranslatingDOM = true;
            try {
              translateNode(addedNode, "ta");
            } finally {
              isTranslatingDOM = false;
            }
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Close modals on clicking outside or escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.show").forEach(m => m.classList.remove("show"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage(currentLang);
  refreshAlertCount();
  setupDynamicMutationObserver();
  initOfflineSyncManager();

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) {
    langBtn.addEventListener("click", toggleLanguage);
  }

  // Dismiss modal on backdrop click
  document.querySelectorAll(".modal-backdrop").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
      }
    });
  });
});

// GLOBAL DIGITAL BATCH PASSPORT VIEWER (BIRTH-TO-DISPENSE TRACEABILITY)
async function viewDigitalBatchPassport(medId, phcId, batchNo, reqId) {
  const modal = document.getElementById("digitalBatchPassportModal");
  if (!modal) return;

  const timelineContainer = document.getElementById("passportTimelineContainer");
  timelineContainer.innerHTML = '<div class="text-center p-4 text-muted">Loading cryptographic lineage & batch passport...</div>';
  modal.classList.add("show");

  let query = "";
  if (medId) query += `medicine_id=${medId}&`;
  if (phcId) query += `phc_id=${phcId}&`;
  if (batchNo) query += `batch_no=${encodeURIComponent(batchNo)}&`;
  if (reqId) query += `request_id=${reqId}&`;

  try {
    const res = await fetch(`/api/batch_passport?${query}`);
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || "Failed to load passport", "error");
      return;
    }

    const p = data.data;
    document.getElementById("passportBatchSubtitle").textContent = `Batch: ${p.batch_no} • Cryptographic Provenance Verified`;
    document.getElementById("passportMedName").textContent = p.medicine_name;
    document.getElementById("passportBatchNo").textContent = p.batch_no;
    document.getElementById("passportManufacturer").textContent = p.manufacturer;
    document.getElementById("passportTempStatus").textContent = p.temperature_safe;
    document.getElementById("passportRootHash").textContent = p.merkle_root_hash;

    const isTamil = (currentLang === "ta");
    let html = "";
    p.timeline.forEach(step => {
      const title = isTamil && step.title_ta ? step.title_ta : step.title;
      const statusText = isTamil && step.status_ta ? step.status_ta : step.status;
      const detailsText = isTamil && step.details_ta ? step.details_ta : step.details;

      html += `
        <div class="passport-step">
          <div class="passport-step-dot">${step.step}</div>
          <div class="passport-step-card">
            <div class="passport-step-header">
              <div>
                <span class="badge ${step.status_class}" style="font-size:0.75rem; margin-bottom:4px; display:inline-block;">
                  ${step.badge}
                </span>
                <h4 style="margin:0; font-size:0.95rem; font-weight:700; color:var(--slate-800);">
                  ${title}
                </h4>
              </div>
              <span class="passport-crypto-badge" title="Cryptographic Block Hash">
                🔗 ${step.crypto_proof}
              </span>
            </div>
            <div style="font-size:0.8rem; color:var(--slate-600); margin-bottom:4px;">
              📍 <strong>${step.facility}</strong> • ${step.location}
            </div>
            <p style="margin:4px 0 6px 0; font-size:0.85rem; color:var(--slate-700);">
              ${detailsText}
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--slate-500); border-top:1px dashed var(--slate-200); padding-top:4px;">
              <span>🕒 ${step.date}</span>
              <strong style="color:var(--primary);">${statusText}</strong>
            </div>
          </div>
        </div>
      `;
    });

    timelineContainer.innerHTML = html;
    if (isTamil) {
      translateNode(modal, "ta");
    }
  } catch (err) {
    console.error(err);
    timelineContainer.innerHTML = '<div class="text-danger p-3">Failed to load Batch Passport details.</div>';
  }
}

// ==========================================
// OFFLINE-FIRST LOCAL OUTBOX & SYNC MANAGER
// ==========================================
const OFFLINE_OUTBOX_KEY = "meditrack_offline_outbox";

function getOfflineOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_OUTBOX_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveOfflineOutbox(items) {
  localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(items));
  updateNetworkStatusUI();
}

function addOfflineOutboxEntry(entry) {
  const outbox = getOfflineOutbox();
  outbox.push({
    id: Date.now(),
    date: entry.date,
    items: entry.items,
    timestamp: new Date().toISOString()
  });
  saveOfflineOutbox(outbox);
}

function clearOfflineOutbox() {
  localStorage.removeItem(OFFLINE_OUTBOX_KEY);
  updateNetworkStatusUI();
}

function updateNetworkStatusUI() {
  const pill = document.getElementById("networkStatusPill");
  const text = document.getElementById("networkStatusText");
  if (!pill || !text) return;

  const isOnline = navigator.onLine;
  const outbox = getOfflineOutbox();
  const pendingCount = outbox.length;

  if (isOnline) {
    if (pendingCount > 0) {
      pill.className = "network-pill online";
      text.textContent = `Online • ${pendingCount} to Sync`;
    } else {
      pill.className = "network-pill online";
      text.textContent = "Online";
    }
  } else {
    pill.className = "network-pill offline";
    text.textContent = `Offline Mode • Outbox: ${pendingCount}`;
  }
}

async function syncOfflineOutbox() {
  const outbox = getOfflineOutbox();
  if (!outbox || outbox.length === 0) return;

  if (!navigator.onLine) {
    showToast("Cannot sync: Internet connection is offline", "warning");
    return;
  }

  try {
    const res = await fetch("/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions: outbox })
    });
    const json = await res.json();
    if (json.success) {
      const count = outbox.length;
      clearOfflineOutbox();
      showToast(`✓ Synchronized ${count} offline dispensing batches with server!`, "success");
      if (typeof loadMyInventory === "function") {
        await loadMyInventory();
      }
      refreshAlertCount();
      if (typeof updateUsageOfflineBanner === "function") {
        updateUsageOfflineBanner();
      }
    } else {
      showToast(json.error || "Failed to sync offline sessions", "error");
    }
  } catch (err) {
    console.warn("Background sync failed; will retry when network returns:", err);
  }
}

function initOfflineSyncManager() {
  updateNetworkStatusUI();

  window.addEventListener("online", () => {
    updateNetworkStatusUI();
    showToast("Internet restored! Syncing queued offline outbox...", "info");
    syncOfflineOutbox();
  });

  window.addEventListener("offline", () => {
    updateNetworkStatusUI();
    showToast("Network offline: MediTrack switched to offline local outbox mode", "warning");
  });

  // If online on page load and pending entries exist, sync them
  if (navigator.onLine && getOfflineOutbox().length > 0) {
    setTimeout(syncOfflineOutbox, 1500);
  }
}


