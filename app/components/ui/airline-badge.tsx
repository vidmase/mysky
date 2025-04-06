'use client'

interface AirlineBadgeProps {
    airline: string
    className?: string
}

const airlineLogos: Record<string, { logo: string, shortName?: string }> = {
    'Lufthansa': {
        logo: '/lufthansa.png'
    },
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
    'LOT Polish Airlines': {
        logo: '/lot.png',
        shortName: 'LOT'
    },
    'Norwegian': {
        logo: '/norwegian.png'
    },
    'SAS': {
        logo: '/sas.png'
    },
    'Finnair': {
        logo: '/finnair.png'
    },
    'easyJet': {
        logo: '/easyjet.png'
    }
}

export function AirlineBadge({ airline, className = '' }: AirlineBadgeProps) {
    const airlineInfo = airlineLogos[airline]
    const displayName = airlineInfo?.shortName || airline

    return (
        <div className={`inline-flex items-center gap-2 rounded-lg bg-background/50 px-3 py-1.5 backdrop-blur-sm ring-1 ring-border/5 ${className}`}>
            {airlineInfo?.logo ? (
                <img
                    src={airlineInfo.logo}
                    alt={`${airline} logo`}
                    className="h-5 w-5 object-contain"
                    loading="lazy"
                />
            ) : (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {airline.substring(0, 2).toUpperCase()}
                    </span>
                </div>
            )}
            <span className="text-sm font-medium leading-none">{displayName}</span>
        </div>
    )
} 