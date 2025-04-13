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
    iata: 'AXL',
    name: 'Alexandria International Airport',
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

export function searchAirports(query: string): Airport[] {
  if (!query) return [];

  const searchTerm = query.toLowerCase().trim();

  // If search term is less than 2 characters, only match IATA codes
  if (searchTerm.length < 2) {
    return europeanAirports.filter(airport =>
      airport.iata.toLowerCase().startsWith(searchTerm)
    );
  }

  // Score and filter airports
  const scoredAirports = europeanAirports
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

  // Return top 10 results for better performance and usability
  return scoredAirports.slice(0, 10);
} 