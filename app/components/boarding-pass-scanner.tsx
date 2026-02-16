import React, { useState, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import {
    Upload,
    X,
    Loader2,
    AlertCircle,
    FileText,
    Plane,
    Save,
} from "lucide-react"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CameraIcon } from "lucide-react"
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface BoardingPassData {
    passenger_name: string
    reservation_number: string
    flight_number: string
    departure_airport: string
    arrival_airport: string
    departure_date: string
    departure_time: string
    arrival_time: string
    total_receipt: string
    airline?: string
    arrival_iata?: string
    departure_iata?: string
    seat?: string
    notes?: string
    departure_country?: string
    arrival_country?: string
    departure_flag?: string
    arrival_flag?: string
    arrival_date?: string
    return_arrival_time?: string
    purchased_date?: string
    purchase_time?: string
    booking_type?: 'OUTBOUND' | 'RETURN'
    is_return_flight?: boolean
    passengers?: Array<{
        name: string
        type?: string
        age?: number
    }>
}

interface BoardingPassScannerProps {
    onDataExtracted: (data: BoardingPassData) => void
}

export function BoardingPassScanner({ onDataExtracted }: BoardingPassScannerProps) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [extractedData, setExtractedData] = useState<BoardingPassData | null>(null)
    const [rawResponse, setRawResponse] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<Partial<BoardingPassData>[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { user } = useAuth()
    const router = useRouter()

    const resetState = () => {
        setFile(null)
        setPreview(null)
        setLoading(false)
        setProgress(0)
        setError(null)
        setExtractedData(null)
        setRawResponse(null)
        setParsedData([])
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        // Check file type - now accepting both images and PDFs
        const isImage = selectedFile.type.startsWith('image/')
        const isPDF = selectedFile.type === 'application/pdf'

        if (!isImage && !isPDF) {
            setError('Please upload an image file (JPG, PNG) or PDF file')
            return
        }

        // Check file size (max 10MB for PDFs, 5MB for images)
        const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024
        if (selectedFile.size > maxSize) {
            setError(`File size should be less than ${isPDF ? '10MB' : '5MB'}`)
            return
        }

        setFile(selectedFile)
        setError(null)

        // Create preview URL based on file type
        if (isImage) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(selectedFile)
        } else if (isPDF) {
            // For PDFs, show a placeholder since Gemini can process them directly
            setPreview('pdf-placeholder')
        }
    }

    const processImage = async () => {
        if (!file) return

        setLoading(true)
        setProgress(0)
        setError(null)
        setRawResponse(null)
        setParsedData([])

        const isPDF = file.type === 'application/pdf'

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90))
            }, 500)

            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/scan-boarding-pass', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to process boarding pass')
            }

            const rawData = await response.json()
            setRawResponse(rawData.raw_response)

            let flights = [];
            if (Array.isArray(rawData.flights)) {
                flights = rawData.flights;
            } else if (rawData && typeof rawData === 'object') {
                flights = [rawData];
            }
            setParsedData(flights)

            clearInterval(progressInterval)
            setProgress(100)

            const fileTypeText = isPDF ? 'PDF' : 'image'
            toast.success(`Boarding pass ${fileTypeText} scanned successfully!`, {
                description: 'Review the extracted details and click Save to add to your flights.',
            })

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const saveToSupabase = async (flightData: Partial<BoardingPassData>) => {
        if (!flightData) {
            toast.error('No data to save', {
                description: 'Please scan a boarding pass first.',
            });
            return;
        }

        try {
            if (!user) {
                toast.error('Authentication error', {
                    description: 'Please sign in to save flight details.',
                });
                return;
            }

            // Validate required fields before saving
            const requiredFields = {
                passenger_name: flightData.passenger_name,
                flight_number: flightData.flight_number,
                departure_airport: flightData.departure_airport,
                arrival_airport: flightData.arrival_airport,
                departure_date: flightData.departure_date,
            };

            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => !value)
                .map(([key]) => key);

            if (missingFields.length > 0) {
                toast.error('Missing required fields', {
                    description: `Please ensure ${missingFields.join(', ')} are filled.`
                });
                return;
            }

            // Prepare the data object with type checking and proper nulls/numbers
            const parsedTotal = (() => {
                if (typeof flightData.total_receipt === 'number') {
                    return String(flightData.total_receipt)
                }
                if (typeof flightData.total_receipt === 'string' && flightData.total_receipt.trim()) {
                    const cleaned = flightData.total_receipt.replace(/[^0-9,.-]/g, '').replace(/,/g, '.')
                    const n = parseFloat(cleaned)
                    return Number.isFinite(n) ? String(n) : ''
                }
                return ''
            })()

            // Normalize date to yyyy-MM-dd
            const padDate = (d?: string) => {
                if (!d) return ''
                const parts = d.split('-')
                if (parts.length !== 3) return d
                const [y, m, day] = parts
                if (y.length === 4) {
                    const mm = m.padStart(2, '0')
                    const dd = day.padStart(2, '0')
                    return `${y}-${mm}-${dd}`
                }
                return d
            }

            const normalizedDepartureDate = padDate(flightData.departure_date)
            const normalizedArrivalDate = padDate(flightData.arrival_date || flightData.departure_date)

            const flightDataToSave = {
                passenger_name: flightData.passenger_name || 'Unknown',
                reservation_number: flightData.reservation_number || '',
                flight_number: flightData.flight_number || '',
                departure_airport: flightData.departure_airport || '',
                arrival_airport: flightData.arrival_airport || '',
                departure_date: normalizedDepartureDate || format(new Date(), 'yyyy-MM-dd'),
                departure_time: (() => {
                    const time = flightData.departure_time || '00:00:00'
                    const parts = time.split(':')
                    if (parts.length === 2) return `${time}:00`
                    if (parts.length === 3) return time
                    return '00:00:00'
                })(),
                arrival_time: (() => {
                    const time = flightData.arrival_time || '00:00:00'
                    const parts = time.split(':')
                    if (parts.length === 2) return `${time}:00`
                    if (parts.length === 3) return time
                    return '00:00:00'
                })(),
                total_receipt: parsedTotal || '',
                airline: flightData.airline ?? null,
                seat: flightData.seat ?? null,
                departure_iata: flightData.departure_iata ?? null,
                arrival_iata: flightData.arrival_iata ?? null,
                departure_country: flightData.departure_country ?? null,
                arrival_country: flightData.arrival_country ?? null,
                departure_flag: flightData.departure_flag ?? null,
                arrival_flag: flightData.arrival_flag ?? null,
                arrival_date: normalizedArrivalDate || '',
                return_arrival_time: flightData.return_arrival_time ?? null,
                purchased_date: flightData.purchased_date || format(new Date(), 'yyyy-MM-dd'),
                purchase_time: flightData.purchase_time || format(new Date(), 'HH:mm'),
                notes: flightData.passengers && flightData.passengers.length > 0
                    ? `Additional passengers: ${flightData.passengers
                        .filter(p => p.name && p.name !== flightData.passenger_name)
                        .map(p => `${p.name}${p.type ? ` (${p.type}` : ''}${p.age ? `, Age: ${p.age}` : ''}${p.type ? ')' : ''}`)
                        .join('; ')}`
                    : null
            };

            console.log('Saving flight data via API:', {
                ...flightDataToSave,
            });

            // Save via API route (authenticated by Clerk)
            const response = await fetch('/api/save-flight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(flightDataToSave),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.message || 'Failed to save flight';
                toast.error('Save failed', { description: errorMessage });
                return;
            }

            const insertedData = await response.json();
            console.log('Flight saved successfully:', insertedData?.id);

            toast.success('Flight details saved successfully!', {
                description: 'The flight information has been added to your records.',
            });

            // Remove the saved flight from parsedData
            setParsedData(prev => prev.filter(f =>
                f.flight_number !== flightData.flight_number ||
                f.departure_date !== flightData.departure_date
            ));

            // If all flights are saved, reset the form
            setTimeout(() => {
                setParsedData(current => {
                    if (current.length === 0) resetState();
                    return current;
                });
            }, 100);

            // Navigate to flights to show the newly added record
            try {
                router.push('/flights?source=scanner')
            } catch { }

        } catch (err) {
            console.error('Save operation failed:', err);
            toast.error('Failed to save flight details', {
                description: err instanceof Error ? err.message : 'An unexpected error occurred.',
            });
        }
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const [year, month, day] = dateStr.split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch {
            return dateStr;
        }
    };

    const formatTime = (timeStr: string | undefined) => {
        if (!timeStr) return 'N/A';
        // Return the exact time string from the raw response
        return timeStr.trim();
    };

    const renderExtractedData = () => {
        return (
            <div className="mt-6 space-y-6">
                {/* Raw Response */}
                {rawResponse && (
                    <div className="rounded-lg bg-gradient-to-r from-blue-900/50 to-blue-800/50 p-6 shadow-lg">
                        <div className="flex items-center gap-2 text-xl font-semibold text-blue-100">
                            <FileText className="h-6 w-6" />
                            Your Flight Details
                        </div>
                        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-blue-100">
                            {rawResponse}
                        </pre>
                    </div>
                )}

                {/* Structured Data Preview */}
                {parsedData.map((flight, idx) => (
                    <div key={idx} className="mb-4 p-4 border rounded">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-xl font-semibold">
                                <Plane className="h-6 w-6" />
                                Extracted Flight Data
                            </div>
                            <Button
                                onClick={() => saveToSupabase(flight)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Save to My Flights
                            </Button>
                        </div>

                        <div className="grid gap-6">
                            {/* Booking Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Booking Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground text-sm">Booking Reference</p>
                                        <p className="font-medium">{flight.reservation_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Flight Number</p>
                                        <p className="font-medium">{flight.flight_number || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Route Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Route Information</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-muted-foreground text-sm">Departure</p>
                                        <p className="font-medium">{flight.departure_airport || 'N/A'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                {flight.departure_iata || 'N/A'}
                                            </span>
                                            {flight.departure_country && (
                                                <span className="text-xs text-muted-foreground">
                                                    {flight.departure_country}
                                                    {flight.departure_flag && ` ${flight.departure_flag}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Arrival</p>
                                        <p className="font-medium">{flight.arrival_airport || 'N/A'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                {flight.arrival_iata || 'N/A'}
                                            </span>
                                            {flight.arrival_country && (
                                                <span className="text-xs text-muted-foreground">
                                                    {flight.arrival_country}
                                                    {flight.arrival_flag && ` ${flight.arrival_flag}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Schedule Information</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-muted-foreground text-sm">Departure</p>
                                        <p className="font-medium">{formatDate(flight.departure_date)}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-medium text-blue-600">
                                                {formatTime(flight.departure_time)}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Arrival</p>
                                        <p className="font-medium">{formatDate(flight.arrival_date || flight.departure_date)}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-medium text-blue-600">
                                                {formatTime(flight.arrival_time)}
                                            </span>
                                            {flight.return_arrival_time && (
                                                <span className="text-xs text-muted-foreground">
                                                    (Return: {formatTime(flight.return_arrival_time)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Passenger Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Passenger Information</h3>
                                <div className="space-y-4">
                                    {flight.passengers?.map((passenger, i) => (
                                        <div key={i} className="flex items-start gap-4 p-3 rounded-md bg-muted/50">
                                            <div className="flex-1">
                                                <p className="font-medium">{passenger.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                        {passenger.type || 'N/A'}
                                                    </span>
                                                    {passenger.age && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Age: {passenger.age}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {passenger.name === flight.passenger_name && (
                                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                                    Main Passenger
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Additional Information</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {flight.airline && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">Airline</p>
                                            <p className="font-medium">{flight.airline}</p>
                                        </div>
                                    )}
                                    {flight.seat && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">Seat</p>
                                            <p className="font-medium">{flight.seat}</p>
                                        </div>
                                    )}
                                    {flight.total_receipt && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">
                                                {flight.booking_type === 'OUTBOUND' ? 'Outbound Price' :
                                                    flight.booking_type === 'RETURN' ? 'Return Price' : 'Flight Cost'}
                                            </p>
                                            <p className="font-medium text-green-600">{flight.total_receipt}</p>
                                        </div>
                                    )}
                                </div>
                                {flight.notes && (
                                    <div className="mt-3">
                                        <p className="text-muted-foreground text-sm">Notes</p>
                                        <p className="font-medium text-sm">{flight.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* File Upload Area */}
            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-6
                    ${preview ? 'border-muted' : 'border-muted-foreground/25'}
                    hover:border-muted-foreground/50 transition-colors
                    flex flex-col items-center justify-center
                    min-h-[300px]
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={loading}
                />

                {preview ? (
                    <div className="relative w-full h-full min-h-[250px]">
                        {preview === 'pdf-placeholder' ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                                <FileText className="h-16 w-16 text-muted-foreground" />
                                <div className="text-center">
                                    <p className="text-lg font-medium">PDF File Selected</p>
                                    <p className="text-sm text-muted-foreground">{file?.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Click "Scan Boarding Pass" to process
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Image
                                src={preview}
                                alt="Boarding pass preview"
                                fill
                                className="object-contain rounded-lg"
                            />
                        )}
                        <button
                            onClick={resetState}
                            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                                <CameraIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg font-medium">Scan Boarding Pass</p>
                            <p className="text-sm text-muted-foreground">
                                Drag and drop or click to upload an image (JPG, PNG) or PDF file
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Progress Bar */}
            {loading && (
                <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">
                        Processing boarding pass {file?.type === 'application/pdf' ? 'PDF' : 'image'}...
                    </p>
                </div>
            )}

            {/* Extracted Data Display */}
            {!loading && renderExtractedData()}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
                <Button
                    variant="outline"
                    onClick={resetState}
                    disabled={loading || !file}
                >
                    Clear
                </Button>
                <Button
                    onClick={processImage}
                    disabled={loading || !file}
                    className="bg-flight hover:bg-flight/90"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Scan Boarding Pass
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
} 