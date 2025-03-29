export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export const europeanAirports: Airport[] = [
  // Austria
  { iata: "VIE", name: "Vienna International", city: "Vienna", country: "Austria" },
  { iata: "INN", name: "Innsbruck", city: "Innsbruck", country: "Austria" },
  { iata: "SZG", name: "Salzburg", city: "Salzburg", country: "Austria" },
  { iata: "GRZ", name: "Graz", city: "Graz", country: "Austria" },
  { iata: "LNZ", name: "Linz", city: "Linz", country: "Austria" },

  // Belgium
  { iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium" },
  { iata: "CRL", name: "Brussels South Charleroi", city: "Charleroi", country: "Belgium" },
  { iata: "ANR", name: "Antwerp", city: "Antwerp", country: "Belgium" },
  { iata: "LGG", name: "Liège", city: "Liège", country: "Belgium" },
  { iata: "OST", name: "Ostend-Bruges", city: "Ostend", country: "Belgium" },

  // Bulgaria
  { iata: "SOF", name: "Sofia", city: "Sofia", country: "Bulgaria" },
  { iata: "VAR", name: "Varna", city: "Varna", country: "Bulgaria" },
  { iata: "BOJ", name: "Burgas", city: "Burgas", country: "Bulgaria" },
  { iata: "PDV", name: "Plovdiv", city: "Plovdiv", country: "Bulgaria" },

  // Croatia
  { iata: "ZAG", name: "Zagreb", city: "Zagreb", country: "Croatia" },
  { iata: "SPU", name: "Split", city: "Split", country: "Croatia" },
  { iata: "DBV", name: "Dubrovnik", city: "Dubrovnik", country: "Croatia" },
  { iata: "ZAD", name: "Zadar", city: "Zadar", country: "Croatia" },
  { iata: "RJK", name: "Rijeka", city: "Rijeka", country: "Croatia" },

  // Cyprus
  { iata: "LCA", name: "Larnaca", city: "Larnaca", country: "Cyprus" },
  { iata: "PFO", name: "Paphos", city: "Paphos", country: "Cyprus" },
  { iata: "ECN", name: "Ercan", city: "Nicosia", country: "Cyprus" },

  // Czech Republic
  { iata: "PRG", name: "Václav Havel Prague", city: "Prague", country: "Czech Republic" },
  { iata: "BRQ", name: "Brno", city: "Brno", country: "Czech Republic" },
  { iata: "OSR", name: "Ostrava", city: "Ostrava", country: "Czech Republic" },
  { iata: "KLV", name: "Karlovy Vary", city: "Karlovy Vary", country: "Czech Republic" },

  // Denmark
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "Denmark" },
  { iata: "BLL", name: "Billund", city: "Billund", country: "Denmark" },
  { iata: "AAL", name: "Aalborg", city: "Aalborg", country: "Denmark" },
  { iata: "AAR", name: "Aarhus", city: "Aarhus", country: "Denmark" },

  // Estonia
  { iata: "TLL", name: "Tallinn", city: "Tallinn", country: "Estonia" },
  { iata: "TAY", name: "Tartu", city: "Tartu", country: "Estonia" },
  { iata: "EPU", name: "Pärnu", city: "Pärnu", country: "Estonia" },

  // Finland
  { iata: "HEL", name: "Helsinki Vantaa", city: "Helsinki", country: "Finland" },
  { iata: "TMP", name: "Tampere", city: "Tampere", country: "Finland" },
  { iata: "TKU", name: "Turku", city: "Turku", country: "Finland" },
  { iata: "OUL", name: "Oulu", city: "Oulu", country: "Finland" },

  // France
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
  { iata: "ORY", name: "Orly", city: "Paris", country: "France" },
  { iata: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France" },
  { iata: "LYS", name: "Lyon-Saint Exupéry", city: "Lyon", country: "France" },
  { iata: "MRS", name: "Marseille Provence", city: "Marseille", country: "France" },
  { iata: "TLS", name: "Toulouse-Blagnac", city: "Toulouse", country: "France" },

  // Germany
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany" },
  { iata: "MUC", name: "Munich", city: "Munich", country: "Germany" },
  { iata: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany" },
  { iata: "DUS", name: "Düsseldorf", city: "Düsseldorf", country: "Germany" },
  { iata: "HAM", name: "Hamburg", city: "Hamburg", country: "Germany" },
  { iata: "CGN", name: "Cologne Bonn", city: "Cologne", country: "Germany" },

  // Greece
  { iata: "ATH", name: "Athens", city: "Athens", country: "Greece" },
  { iata: "HER", name: "Heraklion", city: "Heraklion", country: "Greece" },
  { iata: "RHO", name: "Rhodes", city: "Rhodes", country: "Greece" },
  { iata: "SKG", name: "Thessaloniki", city: "Thessaloniki", country: "Greece" },
  { iata: "CFU", name: "Corfu", city: "Corfu", country: "Greece" },

  // Hungary
  { iata: "BUD", name: "Budapest Ferenc Liszt", city: "Budapest", country: "Hungary" },
  { iata: "DEB", name: "Debrecen", city: "Debrecen", country: "Hungary" },
  { iata: "SOB", name: "Sármellék", city: "Balaton", country: "Hungary" },

  // Ireland
  { iata: "DUB", name: "Dublin", city: "Dublin", country: "Ireland" },
  { iata: "SNN", name: "Shannon", city: "Shannon", country: "Ireland" },
  { iata: "ORK", name: "Cork", city: "Cork", country: "Ireland" },
  { iata: "NOC", name: "Ireland West", city: "Knock", country: "Ireland" },

  // Italy
  { iata: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy" },
  { iata: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy" },
  { iata: "VCE", name: "Venice Marco Polo", city: "Venice", country: "Italy" },
  { iata: "NAP", name: "Naples", city: "Naples", country: "Italy" },
  { iata: "BGY", name: "Milan Bergamo", city: "Milan", country: "Italy" },
  { iata: "PSA", name: "Pisa", city: "Pisa", country: "Italy" },

  // Latvia
  { iata: "RIX", name: "Riga", city: "Riga", country: "Latvia" },
  { iata: "LPX", name: "Liepāja", city: "Liepāja", country: "Latvia" },
  { iata: "VNT", name: "Ventspils", city: "Ventspils", country: "Latvia" },

  // Lithuania
  { iata: "VNO", name: "Vilnius", city: "Vilnius", country: "Lithuania" },
  { iata: "KUN", name: "Kaunas", city: "Kaunas", country: "Lithuania" },
  { iata: "PLQ", name: "Palanga", city: "Palanga", country: "Lithuania" },

  // Luxembourg
  { iata: "LUX", name: "Luxembourg", city: "Luxembourg", country: "Luxembourg" },

  // Malta
  { iata: "MLA", name: "Malta", city: "Valletta", country: "Malta" },

  // Netherlands
  { iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands" },
  { iata: "RTM", name: "Rotterdam The Hague", city: "Rotterdam", country: "Netherlands" },
  { iata: "EIN", name: "Eindhoven", city: "Eindhoven", country: "Netherlands" },
  { iata: "GRQ", name: "Groningen", city: "Groningen", country: "Netherlands" },

  // Poland
  { iata: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland" },
  { iata: "KRK", name: "Kraków", city: "Kraków", country: "Poland" },
  { iata: "GDN", name: "Gdańsk", city: "Gdańsk", country: "Poland" },
  { iata: "WRO", name: "Wrocław", city: "Wrocław", country: "Poland" },
  { iata: "POZ", name: "Poznań", city: "Poznań", country: "Poland" },

  // Portugal
  { iata: "LIS", name: "Lisbon", city: "Lisbon", country: "Portugal" },
  { iata: "OPO", name: "Porto", city: "Porto", country: "Portugal" },
  { iata: "FAO", name: "Faro", city: "Faro", country: "Portugal" },
  { iata: "PDL", name: "Ponta Delgada", city: "Ponta Delgada", country: "Portugal" },
  { iata: "FNC", name: "Funchal", city: "Funchal", country: "Portugal" },

  // Romania
  { iata: "OTP", name: "Bucharest Henri Coandă", city: "Bucharest", country: "Romania" },
  { iata: "CLJ", name: "Cluj-Napoca", city: "Cluj-Napoca", country: "Romania" },
  { iata: "IAS", name: "Iași", city: "Iași", country: "Romania" },
  { iata: "TGM", name: "Târgu Mureș", city: "Târgu Mureș", country: "Romania" },

  // Slovakia
  { iata: "BTS", name: "Bratislava", city: "Bratislava", country: "Slovakia" },
  { iata: "KSC", name: "Košice", city: "Košice", country: "Slovakia" },
  { iata: "PZY", name: "Piešťany", city: "Piešťany", country: "Slovakia" },

  // Slovenia
  { iata: "LJU", name: "Ljubljana", city: "Ljubljana", country: "Slovenia" },
  { iata: "MBX", name: "Maribor", city: "Maribor", country: "Slovenia" },
  { iata: "POW", name: "Portorož", city: "Portorož", country: "Slovenia" },

  // Spain
  { iata: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain" },
  { iata: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain" },
  { iata: "PMI", name: "Palma de Mallorca", city: "Palma", country: "Spain" },
  { iata: "ALC", name: "Alicante", city: "Alicante", country: "Spain" },
  { iata: "AGP", name: "Málaga", city: "Málaga", country: "Spain" },
  { iata: "IBZ", name: "Ibiza", city: "Ibiza", country: "Spain" },

  // Sweden
  { iata: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden" },
  { iata: "GOT", name: "Gothenburg Landvetter", city: "Gothenburg", country: "Sweden" },
  { iata: "MMX", name: "Malmö", city: "Malmö", country: "Sweden" },
  { iata: "UME", name: "Umeå", city: "Umeå", country: "Sweden" },
  { iata: "LLA", name: "Luleå", city: "Luleå", country: "Sweden" },

  // United Kingdom
  { iata: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom" },
  { iata: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom" },
  { iata: "STN", name: "London Stansted", city: "London", country: "United Kingdom" },
  { iata: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom" },
  { iata: "EDI", name: "Edinburgh", city: "Edinburgh", country: "United Kingdom" },
  { iata: "BHX", name: "Birmingham", city: "Birmingham", country: "United Kingdom" },
  { iata: "BRS", name: "Bristol", city: "Bristol", country: "United Kingdom" },
  { iata: "NCL", name: "Newcastle", city: "Newcastle", country: "United Kingdom" },

  // Non-EU European Countries
  // Iceland
  { iata: "KEF", name: "Keflavík", city: "Reykjavík", country: "Iceland" },
  { iata: "AEY", name: "Akureyri", city: "Akureyri", country: "Iceland" },
  { iata: "EGS", name: "Egilsstaðir", city: "Egilsstaðir", country: "Iceland" },

  // Norway
  { iata: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "Norway" },
  { iata: "BGO", name: "Bergen", city: "Bergen", country: "Norway" },
  { iata: "TRD", name: "Trondheim", city: "Trondheim", country: "Norway" },
  { iata: "TOS", name: "Tromsø", city: "Tromsø", country: "Norway" },
  { iata: "SVG", name: "Stavanger", city: "Stavanger", country: "Norway" },

  // Switzerland
  { iata: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland" },
  { iata: "GVA", name: "Geneva", city: "Geneva", country: "Switzerland" },
  { iata: "BSL", name: "Basel Mulhouse", city: "Basel", country: "Switzerland" },
  { iata: "LUG", name: "Lugano", city: "Lugano", country: "Switzerland" },
  { iata: "BRN", name: "Bern", city: "Bern", country: "Switzerland" },
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