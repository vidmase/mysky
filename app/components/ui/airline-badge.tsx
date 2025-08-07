'use client'

const airlineLogos: Record<string, { logo: string, shortName?: string }> = {
    'Air Baltic': {
        logo: '/airbaltic.png',
        shortName: 'airBaltic'
    },
    'Ryanair': {
        logo: '/ryanair.png'
    },
    'Wizz Air': {
        logo: '/wizzair.png',
        shortName: 'Wizz'
    },
    'easyJet': {
        logo: '/easyjet.png'
    },
    'Unknown': {
        logo: '/placeholder-logo.png',
        shortName: 'Unknown Airline'
    }
}

// Helper function to detect airline from flight number if airline is Unknown
const detectAirlineFromFlightNumber = (airline: string, flightNumber?: string): string => {
    if (airline !== 'Unknown' && airline !== '') return airline;
    
    if (!flightNumber) return airline;
    
    // Common airline prefixes
    const airlineMap: Record<string, string> = {
        'FR': 'Ryanair',
        'W6': 'Wizz Air',
        'U2': 'easyJet',
        'BT': 'Air Baltic',
        'BA': 'British Airways',
        'LH': 'Lufthansa',
        'AF': 'Air France',
        'KL': 'KLM',
        'EK': 'Emirates',
        'QR': 'Qatar Airways'
    };
    
    const prefix = flightNumber.substring(0, 2).toUpperCase();
    return airlineMap[prefix] || airline;
};

interface AirlineBadgeProps {
    airline: string
    className?: string
    flightNumber?: string // Add optional flight number prop
}

export function AirlineBadge({ airline, className = '', flightNumber }: AirlineBadgeProps) {
    const detectedAirline = detectAirlineFromFlightNumber(airline, flightNumber);
    const airlineInfo = airlineLogos[detectedAirline]
    const displayName = airlineInfo?.shortName || detectedAirline

    return (
        <div className={`inline-flex items-center gap-2 rounded-lg bg-background/50 px-3 py-1.5 backdrop-blur-sm ring-1 ring-border/5 ${className}`}>
            {airlineInfo?.logo ? (
                <img
                    src={airlineInfo.logo}
                    alt={`${airline} logo`}
                    className="h-5 w-5 object-contain"
                    loading="lazy"
                    onError={(e) => {
                        // On error, show the fallback
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.fallback-text');
                        if (fallback) {
                            fallback.classList.remove('hidden');
                        }
                    }}
                />
            ) : null}
            <div className={`h-5 w-5 rounded-full bg-muted flex items-center justify-center ${airlineInfo?.logo ? 'hidden fallback-text' : ''}`}>
                <span className="text-[10px] font-medium text-muted-foreground">
                    {airline.substring(0, 2).toUpperCase()}
                </span>
            </div>
            <span className="text-sm font-medium leading-none">{displayName}</span>
        </div>
    )
} 