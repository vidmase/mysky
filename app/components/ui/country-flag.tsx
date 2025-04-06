interface CountryFlagProps {
    country: string;
    className?: string;
}

const countryToCode: Record<string, string> = {
    'United Kingdom': 'gb',
    'Spain': 'es',
    'Lithuania': 'lt',
    'Latvia': 'lv',
    'Italy': 'it',
    'Sweden': 'se',
    'France': 'fr',
    'Netherlands': 'nl',
    'Belgium': 'be',
    'Poland': 'pl',
    'Ireland': 'ie',
    'Switzerland': 'ch',
    'Cyprus': 'cy'
};

export function CountryFlag({ country, className = "" }: CountryFlagProps) {
    const code = countryToCode[country]?.toLowerCase();

    if (!code) return null;

    return (
        <img
            src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/png100px/${code}.png`}
            alt={`${country} flag`}
            className={`inline-block w-4 h-3 object-cover rounded-sm ${className}`}
            loading="lazy"
        />
    );
} 