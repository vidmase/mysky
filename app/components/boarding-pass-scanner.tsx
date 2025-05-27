import React, { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
    const supabase = createClientComponentClient()

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        // Check file type
        if (!selectedFile.type.startsWith('image/')) {
            setError('Please upload an image file')
            return
        }

        // Check file size (max 5MB)
        if (selectedFile.size > 5 * 1024 * 1024) {
            setError('File size should be less than 5MB')
            return
        }

        setFile(selectedFile)
        setError(null)

        // Create preview URL
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreview(reader.result as string)
        }
        reader.readAsDataURL(selectedFile)
    }

    const processImage = async () => {
        if (!file) return

        setLoading(true)
        setProgress(0)
        setError(null)
        setRawResponse(null)
        setParsedData([])

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
                throw new Error('Failed to process boarding pass')
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

            toast.success('Boarding pass scanned successfully!', {
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
            // Get the current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
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

            // Prepare the data object with type checking
            const flightDataToSave = {
                passenger_name: flightData.passenger_name || '',
                reservation_number: flightData.reservation_number || '',
                flight_number: flightData.flight_number || '',
                departure_airport: flightData.departure_airport || '',
                arrival_airport: flightData.arrival_airport || '',
                departure_date: flightData.departure_date || '',
                departure_time: flightData.departure_time || '',
                arrival_time: flightData.arrival_time || '',
                total_receipt: flightData.total_receipt || '0',
                airline: flightData.airline || 'Unknown',
                seat: flightData.seat || '',
                departure_iata: flightData.departure_iata || '',
                arrival_iata: flightData.arrival_iata || '',
                departure_country: flightData.departure_country || '',
                arrival_country: flightData.arrival_country || '',
                departure_flag: flightData.departure_flag || '',
                arrival_flag: flightData.arrival_flag || '',
                arrival_date: flightData.arrival_date || flightData.departure_date || '',
                return_arrival_time: flightData.return_arrival_time || '',
                purchased_date: flightData.purchased_date || format(new Date(), 'yyyy-MM-dd'),
                purchase_time: flightData.purchase_time || format(new Date(), 'HH:mm'),
                owner_id: user.id,
                notes: flightData.passengers
                    ? `Additional passengers: ${flightData.passengers
                        .filter(p => p.name !== flightData.passenger_name)
                        .map(p => `${p.name} (${p.type}, Age: ${p.age || 'N/A'})`)
                        .join('; ')}`
                    : ''
            };

            // Log the data being sent
            console.log('Attempting to save flight data:', flightDataToSave);

            const { error: supabaseError } = await supabase
                .from('vidmaflights')
                .insert([flightDataToSave]);

            if (supabaseError) {
                console.error('Supabase Error:', {
                    code: supabaseError.code,
                    message: supabaseError.message,
                    details: supabaseError.details,
                    hint: supabaseError.hint
                });

                let errorMessage = 'Failed to save flight details.';
                switch (supabaseError.code) {
                    case '23505':
                        errorMessage = 'This flight record already exists.';
                        break;
                    case '23503':
                        errorMessage = 'Invalid reference in flight data.';
                        break;
                    case '42P01':
                        errorMessage = 'Database configuration error. Please contact support.';
                        break;
                    case '23502':
                        errorMessage = `Required field missing: ${supabaseError.details}`;
                        break;
                    default:
                        errorMessage = supabaseError.message;
                }

                toast.error('Save failed', {
                    description: errorMessage
                });
                return;
            }

            // Success notification
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

        } catch (err) {
            console.error('Save operation failed:', {
                timestamp: new Date().toISOString(),
                error: err instanceof Error ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack
                } : err,
                flightData: {
                    flightNumber: flightData.flight_number,
                    passenger: flightData.passenger_name
                }
            });

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
                                            <p className="text-muted-foreground text-sm">Total Cost</p>
                                            <p className="font-medium">{flight.total_receipt}</p>
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
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={loading}
                />

                {preview ? (
                    <div className="relative w-full h-full min-h-[250px]">
                        <Image
                            src={preview}
                            alt="Boarding pass preview"
                            fill
                            className="object-contain rounded-lg"
                        />
                        <button
                            onClick={resetState}
                            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                            <CameraIcon className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-lg font-medium">Scan Boarding Pass</p>
                            <p className="text-sm text-muted-foreground">
                                Drag and drop or click to upload
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
                        Processing boarding pass...
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