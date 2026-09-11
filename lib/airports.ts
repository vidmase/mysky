export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  coordinates?: [number, number];
}

export const europeanAirports: Airport[] = [
  // Austria
  { iata: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", coordinates: [16.5697, 48.1102] },
  { iata: "INN", name: "Innsbruck", city: "Innsbruck", country: "Austria", coordinates: [11.3438, 47.2602] },
  { iata: "SZG", name: "Salzburg", city: "Salzburg", country: "Austria", coordinates: [13.0033, 47.7933] },
  { iata: "GRZ", name: "Graz", city: "Graz", country: "Austria", coordinates: [15.4395, 46.9911] },
  { iata: "LNZ", name: "Linz", city: "Linz", country: "Austria", coordinates: [14.1856, 48.2332] },

  // Belgium
  { iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium", coordinates: [4.4836, 50.9014] },
  { iata: "CRL", name: "Brussels South Charleroi", city: "Charleroi", country: "Belgium", coordinates: [4.4518, 50.4591] },
  { iata: "ANR", name: "Antwerp", city: "Antwerp", country: "Belgium", coordinates: [4.4633, 51.1894] },
  { iata: "LGG", name: "Liège", city: "Liège", country: "Belgium", coordinates: [5.4431, 50.6374] },
  { iata: "OST", name: "Ostend-Bruges", city: "Ostend", country: "Belgium", coordinates: [2.8622, 51.1989] },

  // Bulgaria
  { iata: "SOF", name: "Sofia", city: "Sofia", country: "Bulgaria", coordinates: [23.4114, 42.6967] },
  { iata: "VAR", name: "Varna", city: "Varna", country: "Bulgaria", coordinates: [27.8251, 43.2321] },
  { iata: "BOJ", name: "Burgas", city: "Burgas", country: "Bulgaria", coordinates: [27.5151, 42.5690] },
  { iata: "PDV", name: "Plovdiv", city: "Plovdiv", country: "Bulgaria", coordinates: [24.8508, 42.0678] },

  // Croatia
  { iata: "ZAG", name: "Zagreb", city: "Zagreb", country: "Croatia", coordinates: [16.0687, 45.7429] },
  { iata: "SPU", name: "Split", city: "Split", country: "Croatia", coordinates: [16.2980, 43.5389] },
  { iata: "DBV", name: "Dubrovnik", city: "Dubrovnik", country: "Croatia", coordinates: [18.2681, 42.5614] },
  { iata: "ZAD", name: "Zadar", city: "Zadar", country: "Croatia", coordinates: [15.3467, 44.1082] },
  { iata: "RJK", name: "Rijeka", city: "Rijeka", country: "Croatia", coordinates: [14.5703, 45.2167] },

  // Cyprus
  { iata: "LCA", name: "Larnaca", city: "Larnaca", country: "Cyprus", coordinates: [33.6249, 34.8751] },
  { iata: "PFO", name: "Paphos", city: "Paphos", country: "Cyprus", coordinates: [32.4867, 34.7178] },
  { iata: "ECN", name: "Ercan", city: "Nicosia", country: "Cyprus", coordinates: [33.5000, 35.1547] },

  // Czech Republic
  { iata: "PRG", name: "Václav Havel Prague", city: "Prague", country: "Czech Republic", coordinates: [14.2632, 50.1008] },
  { iata: "BRQ", name: "Brno", city: "Brno", country: "Czech Republic", coordinates: [16.6947, 49.1513] },
  { iata: "OSR", name: "Ostrava", city: "Ostrava", country: "Czech Republic", coordinates: [18.1111, 49.6963] },
  { iata: "KLV", name: "Karlovy Vary", city: "Karlovy Vary", country: "Czech Republic", coordinates: [12.9149, 50.2027] },

  // Denmark
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "Denmark", coordinates: [12.6561, 55.6180] },
  { iata: "BLL", name: "Billund", city: "Billund", country: "Denmark", coordinates: [9.1517, 55.7403] },
  { iata: "AAL", name: "Aalborg", city: "Aalborg", country: "Denmark", coordinates: [9.8492, 57.0927] },
  { iata: "AAR", name: "Aarhus", city: "Aarhus", country: "Denmark", coordinates: [10.6190, 56.3000] },

  // Estonia
  { iata: "TLL", name: "Tallinn", city: "Tallinn", country: "Estonia", coordinates: [24.8327, 59.4133] },
  { iata: "TAY", name: "Tartu", city: "Tartu", country: "Estonia", coordinates: [26.6900, 58.3075] },
  { iata: "EPU", name: "Pärnu", city: "Pärnu", country: "Estonia", coordinates: [24.4725, 58.4189] },

  // Finland
  { iata: "HEL", name: "Helsinki Vantaa", city: "Helsinki", country: "Finland", coordinates: [24.9633, 60.3172] },
  { iata: "TMP", name: "Tampere", city: "Tampere", country: "Finland", coordinates: [23.6237, 61.4141] },
  { iata: "TKU", name: "Turku", city: "Turku", country: "Finland", coordinates: [22.2628, 60.5141] },
  { iata: "OUL", name: "Oulu", city: "Oulu", country: "Finland", coordinates: [25.3546, 64.9301] },

  // France
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", coordinates: [2.5479, 49.0097] },
  { iata: "ORY", name: "Orly", city: "Paris", country: "France", coordinates: [2.3794, 48.7262] },
  { iata: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France", coordinates: [7.2150, 43.6584] },
  { iata: "LYS", name: "Lyon-Saint Exupéry", city: "Lyon", country: "France", coordinates: [5.0811, 45.7256] },
  { iata: "MRS", name: "Marseille Provence", city: "Marseille", country: "France", coordinates: [5.2145, 43.4392] },
  { iata: "TLS", name: "Toulouse-Blagnac", city: "Toulouse", country: "France", coordinates: [1.3674, 43.6293] },

  // Germany
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany", coordinates: [8.5622, 50.0379] },
  { iata: "MUC", name: "Munich", city: "Munich", country: "Germany", coordinates: [11.7861, 48.3537] },
  { iata: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", coordinates: [13.5033, 52.3667] },
  { iata: "DUS", name: "Düsseldorf", city: "Düsseldorf", country: "Germany", coordinates: [6.7668, 51.2895] },
  { iata: "HAM", name: "Hamburg", city: "Hamburg", country: "Germany", coordinates: [9.9883, 53.6304] },
  { iata: "CGN", name: "Cologne Bonn", city: "Cologne", country: "Germany", coordinates: [7.1427, 50.8658] },

  // Greece
  { iata: "ATH", name: "Athens", city: "Athens", country: "Greece", coordinates: [23.9445, 37.9364] },
  { iata: "HER", name: "Heraklion", city: "Heraklion", country: "Greece", coordinates: [25.1717, 35.3397] },
  { iata: "RHO", name: "Rhodes", city: "Rhodes", country: "Greece", coordinates: [28.0862, 36.4054] },
  { iata: "SKG", name: "Thessaloniki", city: "Thessaloniki", country: "Greece", coordinates: [22.9710, 40.5197] },
  { iata: "CFU", name: "Corfu", city: "Corfu", country: "Greece", coordinates: [19.9117, 39.6020] },

  // Hungary
  { iata: "BUD", name: "Budapest Ferenc Liszt", city: "Budapest", country: "Hungary", coordinates: [19.2556, 47.4298] },
  { iata: "DEB", name: "Debrecen", city: "Debrecen", country: "Hungary", coordinates: [21.6152, 47.4890] },
  { iata: "SOB", name: "Sármellék", city: "Balaton", country: "Hungary", coordinates: [17.1590, 46.6863] },

  // Ireland
  { iata: "DUB", name: "Dublin", city: "Dublin", country: "Ireland", coordinates: [-6.2499, 53.4213] },
  { iata: "SNN", name: "Shannon", city: "Shannon", country: "Ireland", coordinates: [-8.9245, 52.7019] },
  { iata: "ORK", name: "Cork", city: "Cork", country: "Ireland", coordinates: [-8.4914, 51.8413] },
  { iata: "NOC", name: "Ireland West", city: "Knock", country: "Ireland", coordinates: [-8.8189, 53.9103] },

  // Italy
  { iata: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy", coordinates: [12.2389, 41.8003] },
  { iata: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy", coordinates: [8.7124, 45.6301] },
  { iata: "VCE", name: "Venice Marco Polo", city: "Venice", country: "Italy", coordinates: [12.3519, 45.5053] },
  { iata: "NAP", name: "Naples", city: "Naples", country: "Italy", coordinates: [14.2908, 40.8847] },
  { iata: "BGY", name: "Milan Bergamo", city: "Milan", country: "Italy", coordinates: [9.7040, 45.6739] },
  { iata: "PSA", name: "Pisa", city: "Pisa", country: "Italy", coordinates: [10.3927, 43.6838] },

  // Latvia
  { iata: "RIX", name: "Riga", city: "Riga", country: "Latvia", coordinates: [23.9710, 56.9236] },
  { iata: "LPX", name: "Liepāja", city: "Liepāja", country: "Latvia", coordinates: [21.0442, 56.5175] },
  { iata: "VNT", name: "Ventspils", city: "Ventspils", country: "Latvia", coordinates: [21.5442, 57.3578] },

  // Lithuania
  { iata: "VNO", name: "Vilnius", city: "Vilnius", country: "Lithuania", coordinates: [25.2858, 54.6341] },
  { iata: "KUN", name: "Kaunas", city: "Kaunas", country: "Lithuania", coordinates: [24.0847, 54.9639] },
  { iata: "PLQ", name: "Palanga", city: "Palanga", country: "Lithuania", coordinates: [21.0939, 55.9733] },

  // Luxembourg
  { iata: "LUX", name: "Luxembourg", city: "Luxembourg", country: "Luxembourg", coordinates: [6.2044, 49.6233] },

  // Malta
  { iata: "MLA", name: "Malta", city: "Valletta", country: "Malta", coordinates: [14.4842, 35.8575] },

  // Netherlands
  { iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", coordinates: [4.7642, 52.3086] },
  { iata: "RTM", name: "Rotterdam The Hague", city: "Rotterdam", country: "Netherlands", coordinates: [4.4371, 51.9569] },
  { iata: "EIN", name: "Eindhoven", city: "Eindhoven", country: "Netherlands", coordinates: [5.3747, 51.4500] },
  { iata: "GRQ", name: "Groningen", city: "Groningen", country: "Netherlands", coordinates: [6.5792, 53.1197] },

  // Poland
  { iata: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland", coordinates: [20.9678, 52.1657] },
  { iata: "KRK", name: "Kraków", city: "Kraków", country: "Poland", coordinates: [19.7848, 50.0777] },
  { iata: "GDN", name: "Gdańsk", city: "Gdańsk", country: "Poland", coordinates: [18.4662, 54.3776] },
  { iata: "WRO", name: "Wrocław", city: "Wrocław", country: "Poland", coordinates: [16.8825, 51.1027] },
  { iata: "POZ", name: "Poznań", city: "Poznań", country: "Poland", coordinates: [16.8263, 52.4211] },

  // Portugal
  { iata: "LIS", name: "Lisbon", city: "Lisbon", country: "Portugal", coordinates: [-9.1359, 38.7742] },
  { iata: "OPO", name: "Porto", city: "Porto", country: "Portugal", coordinates: [-8.6814, 41.2481] },
  { iata: "FAO", name: "Faro", city: "Faro", country: "Portugal", coordinates: [-7.9672, 37.0144] },
  { iata: "PDL", name: "Ponta Delgada", city: "Ponta Delgada", country: "Portugal", coordinates: [-25.6978, 37.7412] },
  { iata: "FNC", name: "Funchal", city: "Funchal", country: "Portugal", coordinates: [-16.7781, 32.6942] },

  // Romania
  { iata: "OTP", name: "Bucharest Henri Coandă", city: "Bucharest", country: "Romania", coordinates: [26.0850, 44.5711] },
  { iata: "CLJ", name: "Cluj-Napoca", city: "Cluj-Napoca", country: "Romania", coordinates: [23.6861, 46.7852] },
  { iata: "IAS", name: "Iași", city: "Iași", country: "Romania", coordinates: [27.6206, 47.1785] },
  { iata: "TGM", name: "Târgu Mureș", city: "Târgu Mureș", country: "Romania", coordinates: [24.4125, 46.4677] },

  // Slovakia
  { iata: "BTS", name: "Bratislava", city: "Bratislava", country: "Slovakia", coordinates: [17.2127, 48.1702] },
  { iata: "KSC", name: "Košice", city: "Košice", country: "Slovakia", coordinates: [21.2411, 48.6631] },
  { iata: "PZY", name: "Piešťany", city: "Piešťany", country: "Slovakia", coordinates: [17.8283, 48.6250] },

  // Slovenia
  { iata: "LJU", name: "Ljubljana", city: "Ljubljana", country: "Slovenia", coordinates: [14.4576, 46.2237] },
  { iata: "MBX", name: "Maribor", city: "Maribor", country: "Slovenia", coordinates: [15.6819, 46.4798] },
  { iata: "POW", name: "Portorož", city: "Portorož", country: "Slovenia", coordinates: [13.6147, 45.4733] },

  // Spain
  { iata: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain", coordinates: [-3.5673, 40.4983] },
  { iata: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain", coordinates: [2.0785, 41.2971] },
  { iata: "PMI", name: "Palma de Mallorca", city: "Palma", country: "Spain", coordinates: [2.7386, 39.5517] },
  { iata: "ALC", name: "Alicante", city: "Alicante", country: "Spain", coordinates: [-0.5556, 38.2822] },
  { iata: "AGP", name: "Málaga", city: "Málaga", country: "Spain", coordinates: [-4.4989, 36.6749] },
  { iata: "IBZ", name: "Ibiza", city: "Ibiza", country: "Spain", coordinates: [1.3733, 38.8728] },

  // Sweden
  { iata: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", coordinates: [17.9186, 59.6519] },
  { iata: "GOT", name: "Gothenburg Landvetter", city: "Gothenburg", country: "Sweden", coordinates: [12.2797, 57.6628] },
  { iata: "MMX", name: "Malmö", city: "Malmö", country: "Sweden", coordinates: [13.3760, 55.5361] },
  { iata: "UME", name: "Umeå", city: "Umeå", country: "Sweden", coordinates: [20.2828, 63.7917] },
  { iata: "LLA", name: "Luleå", city: "Luleå", country: "Sweden", coordinates: [22.1219, 65.5438] },

  // United Kingdom
  { iata: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", coordinates: [-0.4614, 51.4700] },
  { iata: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom", coordinates: [-0.1821, 51.1537] },
  { iata: "STN", name: "London Stansted", city: "London", country: "United Kingdom", coordinates: [0.2389, 51.8860] },
  { iata: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom", coordinates: [-2.2750, 53.3537] },
  { iata: "EDI", name: "Edinburgh", city: "Edinburgh", country: "United Kingdom", coordinates: [-3.3725, 55.9500] },
  { iata: "BHX", name: "Birmingham", city: "Birmingham", country: "United Kingdom", coordinates: [-1.7483, 52.4539] },
  { iata: "BRS", name: "Bristol", city: "Bristol", country: "United Kingdom", coordinates: [-2.7191, 51.3827] },
  { iata: "NCL", name: "Newcastle", city: "Newcastle", country: "United Kingdom", coordinates: [-1.6917, 55.0375] },

  // Egypt
  {
    iata: 'CAI',
    name: 'Cairo International Airport',
    city: 'Cairo',
    country: 'Egypt',
    coordinates: [31.4056, 30.1119]
  },
  {
    iata: 'HRG',
    name: 'Hurghada International Airport',
    city: 'Hurghada',
    country: 'Egypt',
    coordinates: [33.7995, 27.1783]
  },
  {
    iata: 'SSH',
    name: 'Sharm El Sheikh International Airport',
    city: 'Sharm El Sheikh',
    country: 'Egypt',
    coordinates: [34.3964, 27.9773]
  },
  {
    iata: 'LXR',
    name: 'Luxor International Airport',
    city: 'Luxor',
    country: 'Egypt',
    coordinates: [32.7033, 25.6710]
  },
  {
    iata: 'ALY',
    name: 'Alexandria El Nouzha',
    city: 'Alexandria',
    country: 'Egypt',
    coordinates: [29.9493, 31.1839]
  },
  {
    iata: 'ASW',
    name: 'Aswan International Airport',
    city: 'Aswan',
    country: 'Egypt',
    coordinates: [32.8250, 23.9644]
  },

  // Non-EU European Countries
  // Iceland
  { iata: "KEF", name: "Keflavík", city: "Reykjavík", country: "Iceland", coordinates: [-22.6056, 63.9850] },
  { iata: "AEY", name: "Akureyri", city: "Akureyri", country: "Iceland", coordinates: [-18.0724, 65.6600] },
  { iata: "EGS", name: "Egilsstaðir", city: "Egilsstaðir", country: "Iceland", coordinates: [-14.4014, 65.2833] },

  // Norway
  { iata: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "Norway", coordinates: [11.1004, 60.1939] },
  { iata: "BGO", name: "Bergen", city: "Bergen", country: "Norway", coordinates: [5.2183, 60.2934] },
  { iata: "TRD", name: "Trondheim", city: "Trondheim", country: "Norway", coordinates: [10.9242, 63.4578] },
  { iata: "TOS", name: "Tromsø", city: "Tromsø", country: "Norway", coordinates: [18.9189, 69.6833] },
  { iata: "SVG", name: "Stavanger", city: "Stavanger", country: "Norway", coordinates: [5.6378, 58.8767] },

  // Switzerland
  { iata: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland", coordinates: [8.5482, 47.4647] },
  { iata: "GVA", name: "Geneva", city: "Geneva", country: "Switzerland", coordinates: [6.1092, 46.2370] },
  { iata: "BSL", name: "Basel Mulhouse", city: "Basel", country: "Switzerland", coordinates: [7.5297, 47.5989] },
  { iata: "LUG", name: "Lugano", city: "Lugano", country: "Switzerland", coordinates: [8.9606, 46.0042] },
  { iata: "BRN", name: "Bern", city: "Bern", country: "Switzerland", coordinates: [7.4969, 46.9141] },
];


/** Major airports outside the original Europe-focused list */
const additionalAirports: Airport[] = [
  // More UK / Ireland
  { iata: "LTN", name: "London Luton", city: "London", country: "United Kingdom", coordinates: [-0.3683, 51.8747] },
  { iata: "LCY", name: "London City", city: "London", country: "United Kingdom", coordinates: [0.0553, 51.5053] },
  { iata: "SEN", name: "London Southend", city: "London", country: "United Kingdom", coordinates: [0.6956, 51.5714] },
  { iata: "GLA", name: "Glasgow", city: "Glasgow", country: "United Kingdom", coordinates: [-4.4331, 55.8719] },
  { iata: "ABZ", name: "Aberdeen", city: "Aberdeen", country: "United Kingdom", coordinates: [-2.1978, 57.2019] },
  { iata: "BFS", name: "Belfast International", city: "Belfast", country: "United Kingdom", coordinates: [-6.2158, 54.6575] },
  { iata: "BHD", name: "Belfast City", city: "Belfast", country: "United Kingdom", coordinates: [-5.8725, 54.6181] },
  { iata: "CWL", name: "Cardiff", city: "Cardiff", country: "United Kingdom", coordinates: [-3.3433, 51.3967] },
  { iata: "LPL", name: "Liverpool John Lennon", city: "Liverpool", country: "United Kingdom", coordinates: [-2.8497, 53.3336] },
  { iata: "LBA", name: "Leeds Bradford", city: "Leeds", country: "United Kingdom", coordinates: [-1.6606, 53.8659] },
  { iata: "EMA", name: "East Midlands", city: "Nottingham", country: "United Kingdom", coordinates: [-1.3281, 52.8311] },
  { iata: "SOU", name: "Southampton", city: "Southampton", country: "United Kingdom", coordinates: [-1.3568, 50.9503] },
  { iata: "EXT", name: "Exeter", city: "Exeter", country: "United Kingdom", coordinates: [-3.4139, 50.7344] },
  { iata: "NWI", name: "Norwich", city: "Norwich", country: "United Kingdom", coordinates: [1.2828, 52.6758] },
  { iata: "INV", name: "Inverness", city: "Inverness", country: "United Kingdom", coordinates: [-4.0475, 57.5425] },
  { iata: "JER", name: "Jersey", city: "Jersey", country: "United Kingdom", coordinates: [-2.1955, 49.2079] },
  { iata: "GCI", name: "Guernsey", city: "Guernsey", country: "United Kingdom", coordinates: [-2.6019, 49.4350] },
  { iata: "IOM", name: "Isle of Man", city: "Douglas", country: "United Kingdom", coordinates: [-4.6279, 54.0833] },

  // More Europe
  { iata: "ATH", name: "Athens", city: "Athens", country: "Greece", coordinates: [23.9445, 37.9364] },
  { iata: "SKG", name: "Thessaloniki", city: "Thessaloniki", country: "Greece", coordinates: [22.9709, 40.5197] },
  { iata: "HER", name: "Heraklion", city: "Heraklion", country: "Greece", coordinates: [25.1803, 35.3397] },
  { iata: "RHO", name: "Rhodes", city: "Rhodes", country: "Greece", coordinates: [28.0862, 36.4054] },
  { iata: "JMK", name: "Mykonos", city: "Mykonos", country: "Greece", coordinates: [25.3481, 37.4351] },
  { iata: "JTR", name: "Santorini", city: "Santorini", country: "Greece", coordinates: [25.4611, 36.3992] },
  { iata: "CHQ", name: "Chania", city: "Chania", country: "Greece", coordinates: [24.1497, 35.5317] },
  { iata: "ZTH", name: "Zakynthos", city: "Zakynthos", country: "Greece", coordinates: [20.8843, 37.7509] },
  { iata: "KGS", name: "Kos", city: "Kos", country: "Greece", coordinates: [27.0917, 36.7933] },
  { iata: "JSI", name: "Skiathos", city: "Skiathos", country: "Greece", coordinates: [23.5036, 39.1771] },

  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", coordinates: [28.7519, 41.2753] },
  { iata: "SAW", name: "Istanbul Sabiha Gökçen", city: "Istanbul", country: "Turkey", coordinates: [29.3092, 40.8986] },
  { iata: "AYT", name: "Antalya", city: "Antalya", country: "Turkey", coordinates: [30.8005, 36.8987] },
  { iata: "ADB", name: "Izmir Adnan Menderes", city: "Izmir", country: "Turkey", coordinates: [27.1570, 38.2924] },
  { iata: "ESB", name: "Ankara Esenboğa", city: "Ankara", country: "Turkey", coordinates: [32.9951, 40.1281] },
  { iata: "BJV", name: "Bodrum Milas", city: "Bodrum", country: "Turkey", coordinates: [27.6697, 37.2506] },
  { iata: "DLM", name: "Dalaman", city: "Dalaman", country: "Turkey", coordinates: [28.7925, 36.7131] },
  { iata: "TZX", name: "Trabzon", city: "Trabzon", country: "Turkey", coordinates: [39.7897, 40.9951] },

  { iata: "SVO", name: "Moscow Sheremetyevo", city: "Moscow", country: "Russia", coordinates: [37.4146, 55.9726] },
  { iata: "DME", name: "Moscow Domodedovo", city: "Moscow", country: "Russia", coordinates: [37.9063, 55.4088] },
  { iata: "VKO", name: "Moscow Vnukovo", city: "Moscow", country: "Russia", coordinates: [37.2615, 55.5915] },
  { iata: "LED", name: "Saint Petersburg Pulkovo", city: "Saint Petersburg", country: "Russia", coordinates: [30.2625, 59.8003] },

  { iata: "KBP", name: "Kyiv Boryspil", city: "Kyiv", country: "Ukraine", coordinates: [30.8947, 50.3450] },
  { iata: "IEV", name: "Kyiv Zhuliany", city: "Kyiv", country: "Ukraine", coordinates: [30.4519, 50.4017] },
  { iata: "ODS", name: "Odesa", city: "Odesa", country: "Ukraine", coordinates: [30.6765, 46.4268] },
  { iata: "LWO", name: "Lviv", city: "Lviv", country: "Ukraine", coordinates: [23.9561, 49.8125] },

  { iata: "MSQ", name: "Minsk", city: "Minsk", country: "Belarus", coordinates: [28.0307, 53.8825] },
  { iata: "KIV", name: "Chișinău", city: "Chișinău", country: "Moldova", coordinates: [28.9308, 46.9277] },
  { iata: "TIA", name: "Tirana", city: "Tirana", country: "Albania", coordinates: [19.7206, 41.4147] },
  { iata: "SKP", name: "Skopje", city: "Skopje", country: "North Macedonia", coordinates: [21.6217, 41.9616] },
  { iata: "SJJ", name: "Sarajevo", city: "Sarajevo", country: "Bosnia and Herzegovina", coordinates: [18.3315, 43.8246] },
  { iata: "TGD", name: "Podgorica", city: "Podgorica", country: "Montenegro", coordinates: [19.2519, 42.3594] },
  { iata: "TIV", name: "Tivat", city: "Tivat", country: "Montenegro", coordinates: [18.7233, 42.4047] },
  { iata: "PRN", name: "Pristina", city: "Pristina", country: "Kosovo", coordinates: [21.0358, 42.5728] },
  { iata: "BEG", name: "Belgrade Nikola Tesla", city: "Belgrade", country: "Serbia", coordinates: [20.3092, 44.8184] },
  { iata: "INI", name: "Niš", city: "Niš", country: "Serbia", coordinates: [21.8537, 43.3373] },

  { iata: "BUD", name: "Budapest", city: "Budapest", country: "Hungary", coordinates: [19.2556, 47.4369] },
  { iata: "DEB", name: "Debrecen", city: "Debrecen", country: "Hungary", coordinates: [21.6153, 47.4889] },
  { iata: "PRG", name: "Prague Václav Havel", city: "Prague", country: "Czechia", coordinates: [14.2600, 50.1008] },
  { iata: "BRQ", name: "Brno", city: "Brno", country: "Czechia", coordinates: [16.6944, 49.1513] },
  { iata: "VIE", name: "Vienna", city: "Vienna", country: "Austria", coordinates: [16.5697, 48.1103] },
  { iata: "SZG", name: "Salzburg", city: "Salzburg", country: "Austria", coordinates: [13.0043, 47.7933] },
  { iata: "INN", name: "Innsbruck", city: "Innsbruck", country: "Austria", coordinates: [11.3440, 47.2602] },
  { iata: "GRZ", name: "Graz", city: "Graz", country: "Austria", coordinates: [15.4395, 46.9911] },

  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "Denmark", coordinates: [12.6561, 55.6180] },
  { iata: "BLL", name: "Billund", city: "Billund", country: "Denmark", coordinates: [9.1517, 55.7403] },
  { iata: "AAL", name: "Aalborg", city: "Aalborg", country: "Denmark", coordinates: [9.8492, 57.0928] },
  { iata: "HEL", name: "Helsinki Vantaa", city: "Helsinki", country: "Finland", coordinates: [24.9633, 60.3172] },
  { iata: "TMP", name: "Tampere", city: "Tampere", country: "Finland", coordinates: [23.5878, 61.4141] },
  { iata: "OUL", name: "Oulu", city: "Oulu", country: "Finland", coordinates: [25.3546, 64.9301] },
  { iata: "TLL", name: "Tallinn", city: "Tallinn", country: "Estonia", coordinates: [24.8328, 59.4133] },

  { iata: "DUB", name: "Dublin", city: "Dublin", country: "Ireland", coordinates: [-6.2701, 53.4213] },
  { iata: "ORK", name: "Cork", city: "Cork", country: "Ireland", coordinates: [-8.4911, 51.8413] },
  { iata: "SNN", name: "Shannon", city: "Shannon", country: "Ireland", coordinates: [-8.9248, 52.7020] },
  { iata: "KIR", name: "Kerry", city: "Kerry", country: "Ireland", coordinates: [-9.5238, 52.1809] },

  { iata: "DUS", name: "Düsseldorf", city: "Düsseldorf", country: "Germany", coordinates: [6.7668, 51.2895] },
  { iata: "CGN", name: "Cologne Bonn", city: "Cologne", country: "Germany", coordinates: [7.1427, 50.8659] },
  { iata: "STR", name: "Stuttgart", city: "Stuttgart", country: "Germany", coordinates: [9.2219, 48.6899] },
  { iata: "HAJ", name: "Hannover", city: "Hannover", country: "Germany", coordinates: [9.6851, 52.4611] },
  { iata: "NUE", name: "Nuremberg", city: "Nuremberg", country: "Germany", coordinates: [11.0781, 49.4987] },
  { iata: "LEJ", name: "Leipzig Halle", city: "Leipzig", country: "Germany", coordinates: [12.2364, 51.4239] },
  { iata: "DRS", name: "Dresden", city: "Dresden", country: "Germany", coordinates: [13.7672, 51.1328] },
  { iata: "FMO", name: "Münster Osnabrück", city: "Münster", country: "Germany", coordinates: [7.6848, 52.1346] },
  { iata: "DTM", name: "Dortmund", city: "Dortmund", country: "Germany", coordinates: [7.6122, 51.5183] },
  { iata: "BRE", name: "Bremen", city: "Bremen", country: "Germany", coordinates: [8.7867, 53.0475] },
  { iata: "HHN", name: "Frankfurt Hahn", city: "Hahn", country: "Germany", coordinates: [7.2639, 49.9487] },
  { iata: "NRN", name: "Weeze", city: "Weeze", country: "Germany", coordinates: [6.1500, 51.6024] },
  { iata: "FKB", name: "Karlsruhe Baden-Baden", city: "Karlsruhe", country: "Germany", coordinates: [8.0805, 48.7793] },
  { iata: "SCN", name: "Saarbrücken", city: "Saarbrücken", country: "Germany", coordinates: [7.1095, 49.2146] },
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany", coordinates: [8.5622, 50.0379] },
  { iata: "MUC", name: "Munich", city: "Munich", country: "Germany", coordinates: [11.7861, 48.3538] },
  { iata: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", coordinates: [13.5033, 52.3667] },
  { iata: "HAM", name: "Hamburg", city: "Hamburg", country: "Germany", coordinates: [9.9882, 53.6304] },

  { iata: "ORY", name: "Paris Orly", city: "Paris", country: "France", coordinates: [2.3656, 48.7233] },
  { iata: "BVA", name: "Paris Beauvais", city: "Paris", country: "France", coordinates: [2.1128, 49.4544] },
  { iata: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France", coordinates: [7.2159, 43.6584] },
  { iata: "LYS", name: "Lyon Saint-Exupéry", city: "Lyon", country: "France", coordinates: [5.0908, 45.7256] },
  { iata: "MRS", name: "Marseille Provence", city: "Marseille", country: "France", coordinates: [5.2145, 43.4393] },
  { iata: "TLS", name: "Toulouse Blagnac", city: "Toulouse", country: "France", coordinates: [1.3678, 43.6293] },
  { iata: "BOD", name: "Bordeaux", city: "Bordeaux", country: "France", coordinates: [-0.7156, 44.8283] },
  { iata: "NTE", name: "Nantes Atlantique", city: "Nantes", country: "France", coordinates: [-1.6078, 47.1532] },
  { iata: "SXB", name: "Strasbourg", city: "Strasbourg", country: "France", coordinates: [7.6282, 48.5383] },
  { iata: "MPL", name: "Montpellier", city: "Montpellier", country: "France", coordinates: [3.9630, 43.5762] },
  { iata: "BIQ", name: "Biarritz", city: "Biarritz", country: "France", coordinates: [-1.5233, 43.4684] },
  { iata: "RNS", name: "Rennes", city: "Rennes", country: "France", coordinates: [-1.7347, 48.0695] },
  { iata: "LIL", name: "Lille", city: "Lille", country: "France", coordinates: [3.1548, 50.5619] },

  { iata: "LIN", name: "Milan Linate", city: "Milan", country: "Italy", coordinates: [9.2767, 45.4451] },
  { iata: "CIA", name: "Rome Ciampino", city: "Rome", country: "Italy", coordinates: [12.5949, 41.7994] },
  { iata: "BLQ", name: "Bologna", city: "Bologna", country: "Italy", coordinates: [11.2887, 44.5354] },
  { iata: "FLR", name: "Florence", city: "Florence", country: "Italy", coordinates: [11.2051, 43.8100] },
  { iata: "TRN", name: "Turin", city: "Turin", country: "Italy", coordinates: [7.6497, 45.2008] },
  { iata: "VRN", name: "Verona", city: "Verona", country: "Italy", coordinates: [10.8885, 45.3957] },
  { iata: "CTA", name: "Catania", city: "Catania", country: "Italy", coordinates: [15.0664, 37.4668] },
  { iata: "PMO", name: "Palermo", city: "Palermo", country: "Italy", coordinates: [13.1330, 38.1810] },
  { iata: "BRI", name: "Bari", city: "Bari", country: "Italy", coordinates: [16.7606, 41.1389] },
  { iata: "BDS", name: "Brindisi", city: "Brindisi", country: "Italy", coordinates: [17.9472, 40.6576] },
  { iata: "CAG", name: "Cagliari", city: "Cagliari", country: "Italy", coordinates: [9.0543, 39.2515] },
  { iata: "OLB", name: "Olbia", city: "Olbia", country: "Italy", coordinates: [9.5147, 40.8987] },
  { iata: "GOA", name: "Genoa", city: "Genoa", country: "Italy", coordinates: [8.8375, 44.4133] },
  { iata: "TRS", name: "Trieste", city: "Trieste", country: "Italy", coordinates: [13.4722, 45.8275] },
  { iata: "AOI", name: "Ancona", city: "Ancona", country: "Italy", coordinates: [13.3622, 43.6163] },
  { iata: "SUF", name: "Lamezia Terme", city: "Lamezia Terme", country: "Italy", coordinates: [16.2423, 38.9054] },

  { iata: "VLC", name: "Valencia", city: "Valencia", country: "Spain", coordinates: [-0.4816, 39.4893] },
  { iata: "SVQ", name: "Seville", city: "Seville", country: "Spain", coordinates: [-5.8931, 37.4180] },
  { iata: "BIO", name: "Bilbao", city: "Bilbao", country: "Spain", coordinates: [-2.9106, 43.3011] },
  { iata: "TFN", name: "Tenerife North", city: "Tenerife", country: "Spain", coordinates: [-16.3415, 28.4827] },
  { iata: "TFS", name: "Tenerife South", city: "Tenerife", country: "Spain", coordinates: [-16.5725, 28.0445] },
  { iata: "LPA", name: "Gran Canaria", city: "Las Palmas", country: "Spain", coordinates: [-15.3866, 27.9319] },
  { iata: "ACE", name: "Lanzarote", city: "Lanzarote", country: "Spain", coordinates: [-13.6052, 28.9455] },
  { iata: "FUE", name: "Fuerteventura", city: "Fuerteventura", country: "Spain", coordinates: [-13.8638, 28.4527] },
  { iata: "SPC", name: "La Palma", city: "La Palma", country: "Spain", coordinates: [-17.7556, 28.6265] },
  { iata: "MAH", name: "Menorca", city: "Menorca", country: "Spain", coordinates: [4.2186, 39.8626] },
  { iata: "SCQ", name: "Santiago de Compostela", city: "Santiago", country: "Spain", coordinates: [-8.4151, 42.8963] },
  { iata: "OVD", name: "Asturias", city: "Oviedo", country: "Spain", coordinates: [-6.0489, 43.5636] },
  { iata: "XRY", name: "Jerez", city: "Jerez", country: "Spain", coordinates: [-6.0601, 36.7446] },
  { iata: "GRO", name: "Girona", city: "Girona", country: "Spain", coordinates: [2.7605, 41.9000] },
  { iata: "REU", name: "Reus", city: "Reus", country: "Spain", coordinates: [1.1672, 41.1474] },

  { iata: "WMI", name: "Warsaw Modlin", city: "Warsaw", country: "Poland", coordinates: [20.6518, 52.4511] },
  { iata: "KTW", name: "Katowice", city: "Katowice", country: "Poland", coordinates: [19.0800, 50.4743] },
  { iata: "RZE", name: "Rzeszów", city: "Rzeszów", country: "Poland", coordinates: [22.0189, 50.1100] },
  { iata: "LUZ", name: "Lublin", city: "Lublin", country: "Poland", coordinates: [22.7136, 51.2403] },
  { iata: "SZZ", name: "Szczecin", city: "Szczecin", country: "Poland", coordinates: [14.9022, 53.5847] },
  { iata: "BZG", name: "Bydgoszcz", city: "Bydgoszcz", country: "Poland", coordinates: [17.9775, 53.0968] },

  { iata: "BBU", name: "Bucharest Băneasa", city: "Bucharest", country: "Romania", coordinates: [26.1021, 44.5032] },
  { iata: "TSR", name: "Timișoara", city: "Timișoara", country: "Romania", coordinates: [21.3379, 45.8099] },
  { iata: "SBZ", name: "Sibiu", city: "Sibiu", country: "Romania", coordinates: [24.0913, 45.7856] },
  { iata: "CND", name: "Constanța", city: "Constanța", country: "Romania", coordinates: [28.4883, 44.3621] },

  { iata: "SOF", name: "Sofia", city: "Sofia", country: "Bulgaria", coordinates: [23.4114, 42.6952] },
  { iata: "VAR", name: "Varna", city: "Varna", country: "Bulgaria", coordinates: [27.8251, 43.2321] },
  { iata: "BOJ", name: "Burgas", city: "Burgas", country: "Bulgaria", coordinates: [27.5152, 42.5697] },

  { iata: "ZAG", name: "Zagreb", city: "Zagreb", country: "Croatia", coordinates: [16.0688, 45.7429] },
  { iata: "SPU", name: "Split", city: "Split", country: "Croatia", coordinates: [16.2980, 43.5389] },
  { iata: "DBV", name: "Dubrovnik", city: "Dubrovnik", country: "Croatia", coordinates: [18.2682, 42.5614] },
  { iata: "ZAD", name: "Zadar", city: "Zadar", country: "Croatia", coordinates: [15.3467, 44.1083] },
  { iata: "PUY", name: "Pula", city: "Pula", country: "Croatia", coordinates: [13.9222, 44.8935] },

  { iata: "BTS", name: "Bratislava", city: "Bratislava", country: "Slovakia", coordinates: [17.2127, 48.1702] },
  { iata: "CRL", name: "Brussels Charleroi", city: "Charleroi", country: "Belgium", coordinates: [4.4538, 50.4592] },
  { iata: "ANR", name: "Antwerp", city: "Antwerp", country: "Belgium", coordinates: [4.4603, 51.1894] },
  { iata: "LGG", name: "Liège", city: "Liège", country: "Belgium", coordinates: [5.4433, 50.6374] },

  { iata: "LCA", name: "Larnaca", city: "Larnaca", country: "Cyprus", coordinates: [33.6249, 34.8751] },
  { iata: "ECN", name: "Ercan", city: "Nicosia", country: "Cyprus", coordinates: [33.4961, 35.1547] },

  // Middle East
  { iata: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", coordinates: [55.3644, 25.2532] },
  { iata: "DWC", name: "Dubai Al Maktoum", city: "Dubai", country: "United Arab Emirates", coordinates: [55.1714, 24.8964] },
  { iata: "AUH", name: "Abu Dhabi", city: "Abu Dhabi", country: "United Arab Emirates", coordinates: [54.6511, 24.4330] },
  { iata: "SHJ", name: "Sharjah", city: "Sharjah", country: "United Arab Emirates", coordinates: [55.5172, 25.3286] },
  { iata: "DOH", name: "Doha Hamad", city: "Doha", country: "Qatar", coordinates: [51.6081, 25.2731] },
  { iata: "RUH", name: "Riyadh King Khalid", city: "Riyadh", country: "Saudi Arabia", coordinates: [46.6988, 24.9576] },
  { iata: "JED", name: "Jeddah King Abdulaziz", city: "Jeddah", country: "Saudi Arabia", coordinates: [39.1565, 21.6796] },
  { iata: "DMM", name: "Dammam King Fahd", city: "Dammam", country: "Saudi Arabia", coordinates: [49.7979, 26.4712] },
  { iata: "MED", name: "Madinah", city: "Madinah", country: "Saudi Arabia", coordinates: [39.7051, 24.5534] },
  { iata: "MCT", name: "Muscat", city: "Muscat", country: "Oman", coordinates: [58.2844, 23.5933] },
  { iata: "BAH", name: "Bahrain", city: "Manama", country: "Bahrain", coordinates: [50.6336, 26.2708] },
  { iata: "KWI", name: "Kuwait", city: "Kuwait City", country: "Kuwait", coordinates: [47.9689, 29.2266] },
  { iata: "AMM", name: "Amman Queen Alia", city: "Amman", country: "Jordan", coordinates: [35.9932, 31.7226] },
  { iata: "BGW", name: "Baghdad", city: "Baghdad", country: "Iraq", coordinates: [44.2346, 33.2625] },
  { iata: "EBL", name: "Erbil", city: "Erbil", country: "Iraq", coordinates: [43.9632, 36.2376] },
  { iata: "BEY", name: "Beirut", city: "Beirut", country: "Lebanon", coordinates: [35.4883, 33.8209] },
  { iata: "TLV", name: "Tel Aviv Ben Gurion", city: "Tel Aviv", country: "Israel", coordinates: [34.8867, 32.0114] },
  { iata: "ETH", name: "Eilat Ramon", city: "Eilat", country: "Israel", coordinates: [35.0114, 29.7237] },
  { iata: "THR", name: "Tehran Mehrabad", city: "Tehran", country: "Iran", coordinates: [51.3134, 35.6892] },
  { iata: "IKA", name: "Tehran Imam Khomeini", city: "Tehran", country: "Iran", coordinates: [51.1522, 35.4161] },

  // Africa
  { iata: "HBE", name: "Alexandria Borg El Arab", city: "Alexandria", country: "Egypt", coordinates: [29.6925, 30.9177] },
  { iata: "JNB", name: "Johannesburg OR Tambo", city: "Johannesburg", country: "South Africa", coordinates: [28.2460, -26.1392] },
  { iata: "CPT", name: "Cape Town", city: "Cape Town", country: "South Africa", coordinates: [18.6017, -33.9648] },
  { iata: "DUR", name: "Durban King Shaka", city: "Durban", country: "South Africa", coordinates: [31.1197, -29.6144] },
  { iata: "NBO", name: "Nairobi Jomo Kenyatta", city: "Nairobi", country: "Kenya", coordinates: [36.9275, -1.3192] },
  { iata: "MBA", name: "Mombasa", city: "Mombasa", country: "Kenya", coordinates: [39.5947, -4.0348] },
  { iata: "ADD", name: "Addis Ababa Bole", city: "Addis Ababa", country: "Ethiopia", coordinates: [38.7993, 8.9779] },
  { iata: "DAR", name: "Dar es Salaam", city: "Dar es Salaam", country: "Tanzania", coordinates: [39.2026, -6.8781] },
  { iata: "ZNZ", name: "Zanzibar", city: "Zanzibar", country: "Tanzania", coordinates: [39.2249, -6.2220] },
  { iata: "LOS", name: "Lagos Murtala Muhammed", city: "Lagos", country: "Nigeria", coordinates: [3.3212, 6.5774] },
  { iata: "ABV", name: "Abuja", city: "Abuja", country: "Nigeria", coordinates: [7.2631, 9.0068] },
  { iata: "ACC", name: "Accra Kotoka", city: "Accra", country: "Ghana", coordinates: [-0.1668, 5.6052] },
  { iata: "CMN", name: "Casablanca Mohammed V", city: "Casablanca", country: "Morocco", coordinates: [-7.58997, 33.3675] },
  { iata: "RAK", name: "Marrakech Menara", city: "Marrakech", country: "Morocco", coordinates: [-8.0363, 31.6069] },
  { iata: "AGA", name: "Agadir", city: "Agadir", country: "Morocco", coordinates: [-9.4131, 30.3250] },
  { iata: "FEZ", name: "Fes", city: "Fes", country: "Morocco", coordinates: [-4.97796, 33.9273] },
  { iata: "TNG", name: "Tangier", city: "Tangier", country: "Morocco", coordinates: [-5.9169, 35.7269] },
  { iata: "TUN", name: "Tunis Carthage", city: "Tunis", country: "Tunisia", coordinates: [10.2272, 36.8510] },
  { iata: "MIR", name: "Monastir", city: "Monastir", country: "Tunisia", coordinates: [10.7547, 35.7581] },
  { iata: "ALG", name: "Algiers Houari Boumediene", city: "Algiers", country: "Algeria", coordinates: [3.2170, 36.6910] },
  { iata: "ORN", name: "Oran", city: "Oran", country: "Algeria", coordinates: [-0.6063, 35.6239] },
  { iata: "TIP", name: "Tripoli Mitiga", city: "Tripoli", country: "Libya", coordinates: [13.1593, 32.8941] },
  { iata: "MRU", name: "Mauritius SSR", city: "Port Louis", country: "Mauritius", coordinates: [57.6836, -20.4302] },
  { iata: "SEZ", name: "Seychelles", city: "Mahé", country: "Seychelles", coordinates: [55.5218, -4.6743] },
  { iata: "DSS", name: "Dakar Blaise Diagne", city: "Dakar", country: "Senegal", coordinates: [-17.0733, 14.6700] },
  { iata: "DKR", name: "Dakar Léopold Sédar Senghor", city: "Dakar", country: "Senegal", coordinates: [-17.4902, 14.7397] },

  // Asia
  { iata: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", coordinates: [139.7798, 35.5494] },
  { iata: "NRT", name: "Tokyo Narita", city: "Tokyo", country: "Japan", coordinates: [140.3929, 35.7647] },
  { iata: "KIX", name: "Osaka Kansai", city: "Osaka", country: "Japan", coordinates: [135.2440, 34.4347] },
  { iata: "ITM", name: "Osaka Itami", city: "Osaka", country: "Japan", coordinates: [135.4382, 34.7855] },
  { iata: "CTS", name: "Sapporo New Chitose", city: "Sapporo", country: "Japan", coordinates: [141.6923, 42.7752] },
  { iata: "FUK", name: "Fukuoka", city: "Fukuoka", country: "Japan", coordinates: [130.4510, 33.5859] },
  { iata: "NGO", name: "Nagoya Chubu", city: "Nagoya", country: "Japan", coordinates: [136.8054, 34.8584] },
  { iata: "OKA", name: "Okinawa Naha", city: "Naha", country: "Japan", coordinates: [127.6494, 26.1958] },

  { iata: "ICN", name: "Seoul Incheon", city: "Seoul", country: "South Korea", coordinates: [126.4505, 37.4602] },
  { iata: "GMP", name: "Seoul Gimpo", city: "Seoul", country: "South Korea", coordinates: [126.7906, 37.5583] },
  { iata: "PUS", name: "Busan Gimhae", city: "Busan", country: "South Korea", coordinates: [128.9382, 35.1795] },

  { iata: "PEK", name: "Beijing Capital", city: "Beijing", country: "China", coordinates: [116.5975, 40.0801] },
  { iata: "PKX", name: "Beijing Daxing", city: "Beijing", country: "China", coordinates: [116.4100, 39.5098] },
  { iata: "PVG", name: "Shanghai Pudong", city: "Shanghai", country: "China", coordinates: [121.8083, 31.1443] },
  { iata: "SHA", name: "Shanghai Hongqiao", city: "Shanghai", country: "China", coordinates: [121.3363, 31.1979] },
  { iata: "CAN", name: "Guangzhou Baiyun", city: "Guangzhou", country: "China", coordinates: [113.2988, 23.3924] },
  { iata: "SZX", name: "Shenzhen Bao'an", city: "Shenzhen", country: "China", coordinates: [113.8100, 22.6394] },
  { iata: "CTU", name: "Chengdu Shuangliu", city: "Chengdu", country: "China", coordinates: [103.9470, 30.5785] },
  { iata: "TFU", name: "Chengdu Tianfu", city: "Chengdu", country: "China", coordinates: [104.4410, 30.3125] },
  { iata: "HGH", name: "Hangzhou Xiaoshan", city: "Hangzhou", country: "China", coordinates: [120.4340, 30.2295] },
  { iata: "XIY", name: "Xi'an Xianyang", city: "Xi'an", country: "China", coordinates: [108.7516, 34.4471] },
  { iata: "CKG", name: "Chongqing Jiangbei", city: "Chongqing", country: "China", coordinates: [106.6417, 29.7192] },
  { iata: "KMG", name: "Kunming Changshui", city: "Kunming", country: "China", coordinates: [102.9292, 25.1019] },
  { iata: "XMN", name: "Xiamen Gaoqi", city: "Xiamen", country: "China", coordinates: [118.1270, 24.5440] },
  { iata: "HKG", name: "Hong Kong", city: "Hong Kong", country: "Hong Kong", coordinates: [113.9145, 22.3080] },
  { iata: "MFM", name: "Macau", city: "Macau", country: "Macau", coordinates: [113.5760, 22.1496] },
  { iata: "TPE", name: "Taipei Taoyuan", city: "Taipei", country: "Taiwan", coordinates: [121.2328, 25.0777] },
  { iata: "TSA", name: "Taipei Songshan", city: "Taipei", country: "Taiwan", coordinates: [121.5519, 25.0697] },
  { iata: "KHH", name: "Kaohsiung", city: "Kaohsiung", country: "Taiwan", coordinates: [120.3500, 22.5771] },

  { iata: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", coordinates: [103.9915, 1.3644] },
  { iata: "KUL", name: "Kuala Lumpur", city: "Kuala Lumpur", country: "Malaysia", coordinates: [101.7100, 2.7456] },
  { iata: "BKI", name: "Kota Kinabalu", city: "Kota Kinabalu", country: "Malaysia", coordinates: [116.0510, 5.9372] },
  { iata: "PEN", name: "Penang", city: "Penang", country: "Malaysia", coordinates: [100.2760, 5.2971] },
  { iata: "BKK", name: "Bangkok Suvarnabhumi", city: "Bangkok", country: "Thailand", coordinates: [100.7501, 13.6900] },
  { iata: "DMK", name: "Bangkok Don Mueang", city: "Bangkok", country: "Thailand", coordinates: [100.6060, 13.9126] },
  { iata: "HKT", name: "Phuket", city: "Phuket", country: "Thailand", coordinates: [98.3165, 8.1132] },
  { iata: "CNX", name: "Chiang Mai", city: "Chiang Mai", country: "Thailand", coordinates: [98.9628, 18.7668] },
  { iata: "USM", name: "Koh Samui", city: "Koh Samui", country: "Thailand", coordinates: [100.0623, 9.5478] },
  { iata: "SGN", name: "Ho Chi Minh City", city: "Ho Chi Minh City", country: "Vietnam", coordinates: [106.6519, 10.8188] },
  { iata: "HAN", name: "Hanoi Noi Bai", city: "Hanoi", country: "Vietnam", coordinates: [105.8040, 21.2212] },
  { iata: "DAD", name: "Da Nang", city: "Da Nang", country: "Vietnam", coordinates: [108.2022, 16.0439] },
  { iata: "CGK", name: "Jakarta Soekarno-Hatta", city: "Jakarta", country: "Indonesia", coordinates: [106.6559, -6.1256] },
  { iata: "DPS", name: "Bali Denpasar", city: "Denpasar", country: "Indonesia", coordinates: [115.1667, -8.7482] },
  { iata: "SUB", name: "Surabaya", city: "Surabaya", country: "Indonesia", coordinates: [112.7870, -7.3798] },
  { iata: "MNL", name: "Manila Ninoy Aquino", city: "Manila", country: "Philippines", coordinates: [121.0198, 14.5086] },
  { iata: "CEB", name: "Cebu", city: "Cebu", country: "Philippines", coordinates: [123.9780, 10.3075] },
  { iata: "RGN", name: "Yangon", city: "Yangon", country: "Myanmar", coordinates: [96.1332, 16.9073] },
  { iata: "PNH", name: "Phnom Penh", city: "Phnom Penh", country: "Cambodia", coordinates: [104.8440, 11.5465] },
  { iata: "REP", name: "Siem Reap", city: "Siem Reap", country: "Cambodia", coordinates: [103.8130, 13.4107] },
  { iata: "VTE", name: "Vientiane", city: "Vientiane", country: "Laos", coordinates: [102.5630, 17.9883] },

  { iata: "DEL", name: "Delhi Indira Gandhi", city: "Delhi", country: "India", coordinates: [77.1031, 28.5562] },
  { iata: "BOM", name: "Mumbai Chhatrapati Shivaji", city: "Mumbai", country: "India", coordinates: [72.8679, 19.0896] },
  { iata: "BLR", name: "Bengaluru Kempegowda", city: "Bengaluru", country: "India", coordinates: [77.7060, 13.1989] },
  { iata: "MAA", name: "Chennai", city: "Chennai", country: "India", coordinates: [80.1692, 12.9941] },
  { iata: "HYD", name: "Hyderabad", city: "Hyderabad", country: "India", coordinates: [78.4299, 17.2313] },
  { iata: "CCU", name: "Kolkata", city: "Kolkata", country: "India", coordinates: [88.4467, 22.6547] },
  { iata: "GOI", name: "Goa Dabolim", city: "Goa", country: "India", coordinates: [73.8317, 15.3808] },
  { iata: "GOX", name: "Goa Mopa", city: "Goa", country: "India", coordinates: [73.8730, 15.7440] },
  { iata: "COK", name: "Kochi", city: "Kochi", country: "India", coordinates: [76.4019, 10.1520] },
  { iata: "AMD", name: "Ahmedabad", city: "Ahmedabad", country: "India", coordinates: [72.6347, 23.0772] },
  { iata: "PNQ", name: "Pune", city: "Pune", country: "India", coordinates: [73.9197, 18.5822] },
  { iata: "JAI", name: "Jaipur", city: "Jaipur", country: "India", coordinates: [75.8011, 26.8242] },
  { iata: "ATQ", name: "Amritsar", city: "Amritsar", country: "India", coordinates: [74.7973, 31.7096] },

  { iata: "CMB", name: "Colombo Bandaranaike", city: "Colombo", country: "Sri Lanka", coordinates: [79.8841, 7.1808] },
  { iata: "MLE", name: "Malé", city: "Malé", country: "Maldives", coordinates: [73.5291, 4.1918] },
  { iata: "KTM", name: "Kathmandu Tribhuvan", city: "Kathmandu", country: "Nepal", coordinates: [85.3591, 27.6966] },
  { iata: "DAC", name: "Dhaka Hazrat Shahjalal", city: "Dhaka", country: "Bangladesh", coordinates: [90.3978, 23.8433] },
  { iata: "ISB", name: "Islamabad", city: "Islamabad", country: "Pakistan", coordinates: [72.8258, 33.5607] },
  { iata: "KHI", name: "Karachi Jinnah", city: "Karachi", country: "Pakistan", coordinates: [67.1608, 24.9065] },
  { iata: "LHE", name: "Lahore", city: "Lahore", country: "Pakistan", coordinates: [74.4036, 31.5216] },
  { iata: "ALA", name: "Almaty", city: "Almaty", country: "Kazakhstan", coordinates: [77.0405, 43.3521] },
  { iata: "NQZ", name: "Astana", city: "Astana", country: "Kazakhstan", coordinates: [71.4669, 51.0222] },
  { iata: "TAS", name: "Tashkent", city: "Tashkent", country: "Uzbekistan", coordinates: [69.2812, 41.2579] },
  { iata: "FRU", name: "Bishkek", city: "Bishkek", country: "Kyrgyzstan", coordinates: [74.4776, 43.0613] },
  { iata: "GYD", name: "Baku Heydar Aliyev", city: "Baku", country: "Azerbaijan", coordinates: [50.0467, 40.4675] },
  { iata: "TBS", name: "Tbilisi", city: "Tbilisi", country: "Georgia", coordinates: [44.9547, 41.6692] },
  { iata: "EVN", name: "Yerevan Zvartnots", city: "Yerevan", country: "Armenia", coordinates: [44.3959, 40.1473] },

  // Oceania
  { iata: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", coordinates: [151.1770, -33.9399] },
  { iata: "MEL", name: "Melbourne", city: "Melbourne", country: "Australia", coordinates: [144.8430, -37.6733] },
  { iata: "BNE", name: "Brisbane", city: "Brisbane", country: "Australia", coordinates: [153.1170, -27.3842] },
  { iata: "PER", name: "Perth", city: "Perth", country: "Australia", coordinates: [115.9670, -31.9403] },
  { iata: "ADL", name: "Adelaide", city: "Adelaide", country: "Australia", coordinates: [138.5310, -34.9450] },
  { iata: "CBR", name: "Canberra", city: "Canberra", country: "Australia", coordinates: [149.1950, -35.3069] },
  { iata: "OOL", name: "Gold Coast", city: "Gold Coast", country: "Australia", coordinates: [153.5050, -28.1644] },
  { iata: "CNS", name: "Cairns", city: "Cairns", country: "Australia", coordinates: [145.7550, -16.8858] },
  { iata: "HBA", name: "Hobart", city: "Hobart", country: "Australia", coordinates: [147.5100, -42.8361] },
  { iata: "DRW", name: "Darwin", city: "Darwin", country: "Australia", coordinates: [130.8770, -12.4147] },
  { iata: "AKL", name: "Auckland", city: "Auckland", country: "New Zealand", coordinates: [174.7920, -37.0082] },
  { iata: "WLG", name: "Wellington", city: "Wellington", country: "New Zealand", coordinates: [174.8040, -41.3272] },
  { iata: "CHC", name: "Christchurch", city: "Christchurch", country: "New Zealand", coordinates: [172.5320, -43.4894] },
  { iata: "ZQN", name: "Queenstown", city: "Queenstown", country: "New Zealand", coordinates: [168.7390, -45.0211] },
  { iata: "NAN", name: "Nadi", city: "Nadi", country: "Fiji", coordinates: [177.4430, -17.7554] },
  { iata: "PPT", name: "Papeete Faa'a", city: "Papeete", country: "French Polynesia", coordinates: [-149.6070, -17.5537] },

  // North America — USA
  { iata: "JFK", name: "New York JFK", city: "New York", country: "United States", coordinates: [-73.7781, 40.6413] },
  { iata: "EWR", name: "Newark Liberty", city: "Newark", country: "United States", coordinates: [-74.1687, 40.6895] },
  { iata: "LGA", name: "New York LaGuardia", city: "New York", country: "United States", coordinates: [-73.8726, 40.7769] },
  { iata: "BOS", name: "Boston Logan", city: "Boston", country: "United States", coordinates: [-71.0052, 42.3656] },
  { iata: "PHL", name: "Philadelphia", city: "Philadelphia", country: "United States", coordinates: [-75.2411, 39.8721] },
  { iata: "IAD", name: "Washington Dulles", city: "Washington", country: "United States", coordinates: [-77.4558, 38.9531] },
  { iata: "DCA", name: "Washington Reagan", city: "Washington", country: "United States", coordinates: [-77.0377, 38.8512] },
  { iata: "BWI", name: "Baltimore Washington", city: "Baltimore", country: "United States", coordinates: [-76.6683, 39.1754] },
  { iata: "ORD", name: "Chicago O'Hare", city: "Chicago", country: "United States", coordinates: [-87.9073, 41.9742] },
  { iata: "MDW", name: "Chicago Midway", city: "Chicago", country: "United States", coordinates: [-87.7522, 41.7868] },
  { iata: "DTW", name: "Detroit Metro", city: "Detroit", country: "United States", coordinates: [-83.3534, 42.2124] },
  { iata: "MSP", name: "Minneapolis–Saint Paul", city: "Minneapolis", country: "United States", coordinates: [-93.2218, 44.8848] },
  { iata: "ATL", name: "Atlanta Hartsfield-Jackson", city: "Atlanta", country: "United States", coordinates: [-84.4281, 33.6407] },
  { iata: "CLT", name: "Charlotte Douglas", city: "Charlotte", country: "United States", coordinates: [-80.9431, 35.2140] },
  { iata: "MIA", name: "Miami", city: "Miami", country: "United States", coordinates: [-80.2906, 25.7959] },
  { iata: "FLL", name: "Fort Lauderdale", city: "Fort Lauderdale", country: "United States", coordinates: [-80.1527, 26.0726] },
  { iata: "MCO", name: "Orlando", city: "Orlando", country: "United States", coordinates: [-81.3081, 28.4312] },
  { iata: "TPA", name: "Tampa", city: "Tampa", country: "United States", coordinates: [-82.5332, 27.9755] },
  { iata: "RSW", name: "Fort Myers Southwest Florida", city: "Fort Myers", country: "United States", coordinates: [-81.7552, 26.5362] },
  { iata: "JAX", name: "Jacksonville", city: "Jacksonville", country: "United States", coordinates: [-81.6879, 30.4941] },
  { iata: "DFW", name: "Dallas/Fort Worth", city: "Dallas", country: "United States", coordinates: [-97.0403, 32.8998] },
  { iata: "DAL", name: "Dallas Love Field", city: "Dallas", country: "United States", coordinates: [-96.8518, 32.8471] },
  { iata: "IAH", name: "Houston George Bush", city: "Houston", country: "United States", coordinates: [-95.3414, 29.9902] },
  { iata: "HOU", name: "Houston Hobby", city: "Houston", country: "United States", coordinates: [-95.2789, 29.6454] },
  { iata: "AUS", name: "Austin-Bergstrom", city: "Austin", country: "United States", coordinates: [-97.6699, 30.1945] },
  { iata: "SAT", name: "San Antonio", city: "San Antonio", country: "United States", coordinates: [-98.4698, 29.5337] },
  { iata: "DEN", name: "Denver", city: "Denver", country: "United States", coordinates: [-104.6737, 39.8561] },
  { iata: "SLC", name: "Salt Lake City", city: "Salt Lake City", country: "United States", coordinates: [-111.9781, 40.7884] },
  { iata: "PHX", name: "Phoenix Sky Harbor", city: "Phoenix", country: "United States", coordinates: [-112.0116, 33.4343] },
  { iata: "LAS", name: "Las Vegas Harry Reid", city: "Las Vegas", country: "United States", coordinates: [-115.1523, 36.0840] },
  { iata: "LAX", name: "Los Angeles", city: "Los Angeles", country: "United States", coordinates: [-118.4081, 33.9425] },
  { iata: "SAN", name: "San Diego", city: "San Diego", country: "United States", coordinates: [-117.1900, 32.7338] },
  { iata: "SFO", name: "San Francisco", city: "San Francisco", country: "United States", coordinates: [-122.3789, 37.6213] },
  { iata: "SJC", name: "San Jose", city: "San Jose", country: "United States", coordinates: [-121.9289, 37.3639] },
  { iata: "OAK", name: "Oakland", city: "Oakland", country: "United States", coordinates: [-122.2210, 37.7213] },
  { iata: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "United States", coordinates: [-122.3088, 47.4502] },
  { iata: "PDX", name: "Portland", city: "Portland", country: "United States", coordinates: [-122.5975, 45.5898] },
  { iata: "HNL", name: "Honolulu", city: "Honolulu", country: "United States", coordinates: [-157.9224, 21.3187] },
  { iata: "OGG", name: "Maui Kahului", city: "Kahului", country: "United States", coordinates: [-156.4300, 20.8986] },
  { iata: "ANC", name: "Anchorage", city: "Anchorage", country: "United States", coordinates: [-149.9982, 61.1743] },
  { iata: "MKE", name: "Milwaukee", city: "Milwaukee", country: "United States", coordinates: [-87.8966, 42.9472] },
  { iata: "IND", name: "Indianapolis", city: "Indianapolis", country: "United States", coordinates: [-86.2944, 39.7173] },
  { iata: "CMH", name: "Columbus", city: "Columbus", country: "United States", coordinates: [-82.8919, 39.9980] },
  { iata: "CLE", name: "Cleveland", city: "Cleveland", country: "United States", coordinates: [-81.8498, 41.4117] },
  { iata: "PIT", name: "Pittsburgh", city: "Pittsburgh", country: "United States", coordinates: [-80.2329, 40.4915] },
  { iata: "BNA", name: "Nashville", city: "Nashville", country: "United States", coordinates: [-86.6782, 36.1263] },
  { iata: "MEM", name: "Memphis", city: "Memphis", country: "United States", coordinates: [-89.9767, 35.0424] },
  { iata: "STL", name: "St. Louis Lambert", city: "St. Louis", country: "United States", coordinates: [-90.3700, 38.7487] },
  { iata: "MCI", name: "Kansas City", city: "Kansas City", country: "United States", coordinates: [-94.7139, 39.2976] },
  { iata: "MSY", name: "New Orleans", city: "New Orleans", country: "United States", coordinates: [-90.2580, 29.9934] },
  { iata: "RDU", name: "Raleigh-Durham", city: "Raleigh", country: "United States", coordinates: [-78.7875, 35.8776] },
  { iata: "RIC", name: "Richmond", city: "Richmond", country: "United States", coordinates: [-77.3197, 37.5052] },
  { iata: "BUF", name: "Buffalo", city: "Buffalo", country: "United States", coordinates: [-78.7322, 42.9405] },
  { iata: "ROC", name: "Rochester", city: "Rochester", country: "United States", coordinates: [-77.6724, 43.1189] },
  { iata: "SYR", name: "Syracuse", city: "Syracuse", country: "United States", coordinates: [-76.1063, 43.1112] },
  { iata: "ALB", name: "Albany", city: "Albany", country: "United States", coordinates: [-73.8017, 42.7483] },
  { iata: "PVD", name: "Providence", city: "Providence", country: "United States", coordinates: [-71.4204, 41.7245] },
  { iata: "BDL", name: "Hartford Bradley", city: "Hartford", country: "United States", coordinates: [-72.6832, 41.9389] },
  { iata: "SMF", name: "Sacramento", city: "Sacramento", country: "United States", coordinates: [-121.5910, 38.6954] },
  { iata: "SNA", name: "Orange County John Wayne", city: "Santa Ana", country: "United States", coordinates: [-117.8682, 33.6757] },
  { iata: "BUR", name: "Burbank", city: "Burbank", country: "United States", coordinates: [-118.3587, 34.2007] },
  { iata: "ONT", name: "Ontario", city: "Ontario", country: "United States", coordinates: [-117.6012, 34.0560] },

  // Canada / Mexico / Caribbean
  { iata: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada", coordinates: [-79.6306, 43.6777] },
  { iata: "YUL", name: "Montreal Trudeau", city: "Montreal", country: "Canada", coordinates: [-73.7408, 45.4706] },
  { iata: "YVR", name: "Vancouver", city: "Vancouver", country: "Canada", coordinates: [-123.1840, 49.1947] },
  { iata: "YYC", name: "Calgary", city: "Calgary", country: "Canada", coordinates: [-114.0200, 51.1139] },
  { iata: "YEG", name: "Edmonton", city: "Edmonton", country: "Canada", coordinates: [-113.5800, 53.3097] },
  { iata: "YOW", name: "Ottawa", city: "Ottawa", country: "Canada", coordinates: [-75.6692, 45.3225] },
  { iata: "YHZ", name: "Halifax", city: "Halifax", country: "Canada", coordinates: [-63.5086, 44.8808] },
  { iata: "YWG", name: "Winnipeg", city: "Winnipeg", country: "Canada", coordinates: [-97.2399, 49.9100] },
  { iata: "YQB", name: "Quebec City", city: "Quebec City", country: "Canada", coordinates: [-71.3933, 46.7911] },

  { iata: "MEX", name: "Mexico City", city: "Mexico City", country: "Mexico", coordinates: [-99.0721, 19.4363] },
  { iata: "NLU", name: "Mexico City Felipe Ángeles", city: "Mexico City", country: "Mexico", coordinates: [-99.0160, 19.7689] },
  { iata: "CUN", name: "Cancún", city: "Cancún", country: "Mexico", coordinates: [-86.8771, 21.0365] },
  { iata: "GDL", name: "Guadalajara", city: "Guadalajara", country: "Mexico", coordinates: [-103.3110, 20.5218] },
  { iata: "MTY", name: "Monterrey", city: "Monterrey", country: "Mexico", coordinates: [-100.1070, 25.7785] },
  { iata: "SJD", name: "Los Cabos", city: "San José del Cabo", country: "Mexico", coordinates: [-109.7210, 23.1518] },
  { iata: "PVR", name: "Puerto Vallarta", city: "Puerto Vallarta", country: "Mexico", coordinates: [-105.2540, 20.6801] },

  { iata: "PUJ", name: "Punta Cana", city: "Punta Cana", country: "Dominican Republic", coordinates: [-68.3634, 18.5674] },
  { iata: "SDQ", name: "Santo Domingo", city: "Santo Domingo", country: "Dominican Republic", coordinates: [-69.6682, 18.4297] },
  { iata: "HAV", name: "Havana José Martí", city: "Havana", country: "Cuba", coordinates: [-82.4091, 22.9892] },
  { iata: "NAS", name: "Nassau", city: "Nassau", country: "Bahamas", coordinates: [-77.4662, 25.0390] },
  { iata: "MBJ", name: "Montego Bay", city: "Montego Bay", country: "Jamaica", coordinates: [-77.9134, 18.5037] },
  { iata: "KIN", name: "Kingston Norman Manley", city: "Kingston", country: "Jamaica", coordinates: [-76.7875, 17.9357] },
  { iata: "SJU", name: "San Juan", city: "San Juan", country: "Puerto Rico", coordinates: [-66.0018, 18.4394] },
  { iata: "AUA", name: "Aruba", city: "Oranjestad", country: "Aruba", coordinates: [-70.0152, 12.5014] },
  { iata: "CUR", name: "Curaçao", city: "Willemstad", country: "Curaçao", coordinates: [-68.9598, 12.1889] },
  { iata: "BGI", name: "Barbados Grantley Adams", city: "Bridgetown", country: "Barbados", coordinates: [-59.4925, 13.0746] },

  // South America
  { iata: "GRU", name: "São Paulo Guarulhos", city: "São Paulo", country: "Brazil", coordinates: [-46.4731, -23.4356] },
  { iata: "CGH", name: "São Paulo Congonhas", city: "São Paulo", country: "Brazil", coordinates: [-46.6556, -23.6273] },
  { iata: "GIG", name: "Rio de Janeiro Galeão", city: "Rio de Janeiro", country: "Brazil", coordinates: [-43.2506, -22.8090] },
  { iata: "SDU", name: "Rio de Janeiro Santos Dumont", city: "Rio de Janeiro", country: "Brazil", coordinates: [-43.1631, -22.9105] },
  { iata: "BSB", name: "Brasília", city: "Brasília", country: "Brazil", coordinates: [-47.9186, -15.8692] },
  { iata: "CNF", name: "Belo Horizonte Confins", city: "Belo Horizonte", country: "Brazil", coordinates: [-43.9719, -19.6336] },
  { iata: "SSA", name: "Salvador", city: "Salvador", country: "Brazil", coordinates: [-38.3312, -12.9086] },
  { iata: "REC", name: "Recife", city: "Recife", country: "Brazil", coordinates: [-34.9236, -8.1264] },
  { iata: "FOR", name: "Fortaleza", city: "Fortaleza", country: "Brazil", coordinates: [-38.5326, -3.7763] },
  { iata: "POA", name: "Porto Alegre", city: "Porto Alegre", country: "Brazil", coordinates: [-51.1714, -29.9944] },
  { iata: "EZE", name: "Buenos Aires Ezeiza", city: "Buenos Aires", country: "Argentina", coordinates: [-58.5358, -34.8222] },
  { iata: "AEP", name: "Buenos Aires Aeroparque", city: "Buenos Aires", country: "Argentina", coordinates: [-58.4156, -34.5592] },
  { iata: "SCL", name: "Santiago", city: "Santiago", country: "Chile", coordinates: [-70.7858, -33.3930] },
  { iata: "LIM", name: "Lima Jorge Chávez", city: "Lima", country: "Peru", coordinates: [-77.1143, -12.0219] },
  { iata: "BOG", name: "Bogotá El Dorado", city: "Bogotá", country: "Colombia", coordinates: [-74.1469, 4.7016] },
  { iata: "MDE", name: "Medellín José María Córdova", city: "Medellín", country: "Colombia", coordinates: [-75.4231, 6.1645] },
  { iata: "CTG", name: "Cartagena", city: "Cartagena", country: "Colombia", coordinates: [-75.5123, 10.4424] },
  { iata: "UIO", name: "Quito", city: "Quito", country: "Ecuador", coordinates: [-78.3575, -0.1250] },
  { iata: "GYE", name: "Guayaquil", city: "Guayaquil", country: "Ecuador", coordinates: [-79.8836, -2.1574] },
  { iata: "CCS", name: "Caracas Simón Bolívar", city: "Caracas", country: "Venezuela", coordinates: [-66.9906, 10.6012] },
  { iata: "PTY", name: "Panama City Tocumen", city: "Panama City", country: "Panama", coordinates: [-79.3835, 9.0714] },
  { iata: "SJO", name: "San José Juan Santamaría", city: "San José", country: "Costa Rica", coordinates: [-84.2081, 9.9939] },
  { iata: "SAL", name: "San Salvador", city: "San Salvador", country: "El Salvador", coordinates: [-89.0557, 13.4409] },
  { iata: "GUA", name: "Guatemala City", city: "Guatemala City", country: "Guatemala", coordinates: [-90.5277, 14.5833] },
  { iata: "MGA", name: "Managua", city: "Managua", country: "Nicaragua", coordinates: [-86.1682, 12.1415] },
  { iata: "TGU", name: "Tegucigalpa", city: "Tegucigalpa", country: "Honduras", coordinates: [-87.2172, 14.0609] },
  { iata: "SAP", name: "San Pedro Sula", city: "San Pedro Sula", country: "Honduras", coordinates: [-87.9236, 15.4526] },
  { iata: "HAV", name: "Havana José Martí", city: "Havana", country: "Cuba", coordinates: [-82.4091, 22.9892] },
]

/** Full searchable airport catalogue (Europe + worldwide majors). */
export const allAirports: Airport[] = (() => {
  const map = new Map<string, Airport>()
  for (const a of [...europeanAirports, ...additionalAirports]) {
    const code = a.iata.toUpperCase()
    if (!map.has(code)) map.set(code, { ...a, iata: code })
  }
  return Array.from(map.values())
})()

export function searchAirports(query: string): Airport[] {
  if (!query) return [];

  const searchTerm = query.toLowerCase().trim();

  // If search term is less than 2 characters, only match IATA codes
  if (searchTerm.length < 2) {
    return allAirports.filter(airport =>
      airport.iata.toLowerCase().startsWith(searchTerm)
    );
  }

  // Score and filter airports
  const scoredAirports = allAirports
    .map(airport => {
      let score = 0;
      const iata = airport.iata.toLowerCase();
      const city = airport.city.toLowerCase();
      const name = airport.name.toLowerCase();
      const country = airport.country.toLowerCase();

      // Exact matches get highest scores
      if (iata === searchTerm) score += 100;
      if (city === searchTerm) score += 90;
      if (name === searchTerm) score += 85;

      // IATA code matches
      if (iata.startsWith(searchTerm)) score += 80;
      if (iata.includes(searchTerm)) score += 70;

      // City name matches (prioritize starts with)
      if (city.startsWith(searchTerm)) score += 75;
      if (city.includes(searchTerm)) score += 65;

      // Airport name matches
      if (name.startsWith(searchTerm)) score += 60;
      if (name.includes(searchTerm)) score += 50;

      // Country matches (lower priority)
      if (country.startsWith(searchTerm)) score += 40;
      if (country.includes(searchTerm)) score += 30;

      // Word boundary matches get bonus points
      const words = [...city.split(' '), ...name.split(' ')];
      if (words.some(word => word.startsWith(searchTerm))) score += 20;

      // Acronym matching (e.g., "lhr" matches "London Heathrow")
      const cityAcronym = city.split(' ').map(word => word[0]).join('');
      const nameAcronym = name.split(' ').map(word => word[0]).join('');
      if (cityAcronym.includes(searchTerm) || nameAcronym.includes(searchTerm)) score += 15;

      // Length penalty for longer differences
      const lengthDiff = Math.abs(searchTerm.length - city.length);
      score -= lengthDiff * 0.5;

      return { airport, score };
    })
    .filter(({ score }) => score > 0) // Only keep matches with positive scores
    .sort((a, b) => {
      // First sort by score
      if (b.score !== a.score) return b.score - a.score;

      // If scores are equal, sort alphabetically by city
      return a.airport.city.localeCompare(b.airport.city);
    })
    .map(({ airport }) => airport);

  // Return top 20 results for better coverage of big city multi-airport hits
  return scoredAirports.slice(0, 20);
} 