interface AirportInfo {
    name: string;
    city: string;
    country: string;
}

export const airportData: Record<string, AirportInfo> = {
    "LHR": { name: "London Heathrow", city: "London", country: "United Kingdom" },
    "BRS": { name: "Bristol Airport", city: "Bristol", country: "United Kingdom" },
    "DUB": { name: "Dublin Airport", city: "Dublin", country: "Ireland" },
    "PFO": { name: "Paphos International", city: "Paphos", country: "Cyprus" },
    "ZRH": { name: "Zurich Airport", city: "Zurich", country: "Switzerland" },
    "VNO": { name: "Vilnius International", city: "Vilnius", country: "Lithuania" },
    "PLQ": { name: "Palanga International", city: "Palanga", country: "Italy" },
    "BCN": { name: "Barcelona–El Prat", city: "Barcelona", country: "Spain" },
    "MAD": { name: "Adolfo Suárez Madrid–Barajas", city: "Madrid", country: "Spain" },
    "MLA": { name: "Malta International", city: "Valletta", country: "Malta" },
    "FCO": { name: "Leonardo da Vinci International", city: "Rome", country: "Italy" },
    "NAP": { name: "Naples International", city: "Naples", country: "Italy" },
    "ARN": { name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden" },
    "CDG": { name: "Charles de Gaulle", city: "Paris", country: "France" },
    "AMS": { name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands" },
    "BRU": { name: "Brussels Airport", city: "Brussels", country: "Belgium" },
    "WAW": { name: "Warsaw Chopin", city: "Warsaw", country: "Poland" },
    "KRK": { name: "John Paul II International", city: "Kraków", country: "Poland" },
    "RIX": { name: "Riga International", city: "Riga", country: "Latvia" },
    "GVA": { name: "Geneva Airport", city: "Geneva", country: "Switzerland" }
}; 