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
    const [parsedData, setParsedData] = useState<Partial<BoardingPassData> | null>(null)
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
        setParsedData(null)
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
        setParsedData(null)

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

            // Parse the raw response to extract structured data
            const lines = rawData.raw_response.split('\n')
            let flightData: Partial<BoardingPassData> = {
                passengers: []
            }

            let currentPassenger: { name: string; type?: string; age?: number } = { name: '' }

            for (const line of lines) {
                const trimmedLine = line.trim()

                // Extract booking reference
                if (trimmedLine.startsWith('Booking reference:')) {
                    flightData.reservation_number = trimmedLine.split(':')[1].trim()
                }

                // Extract passenger details
                if (trimmedLine.startsWith('- Name:')) {
                    if (currentPassenger.name) {
                        flightData.passengers?.push({ ...currentPassenger })
                    }
                    currentPassenger = { name: trimmedLine.split(':')[1].trim() }
                }
                if (trimmedLine.startsWith('Type:')) {
                    currentPassenger.type = trimmedLine.split(':')[1].trim()
                }
                if (trimmedLine.startsWith('Age:')) {
                    const age = trimmedLine.split(':')[1].trim()
                    currentPassenger.age = age === 'None' ? undefined : parseInt(age)
                }

                // Extract flight details
                if (trimmedLine.startsWith('Flight number:')) {
                    flightData.flight_number = trimmedLine.split(':')[1].trim()
                }
                if (trimmedLine.startsWith('Departure airport:')) {
                    const airport = trimmedLine.split(':')[1].trim()
                    flightData.departure_airport = airport.replace(/\([^)]*\)/g, '').trim()
                    flightData.departure_iata = airport.match(/\(([^)]+)\)/)?.[1] || ''
                }
                if (trimmedLine.startsWith('Arrival airport:')) {
                    const airport = trimmedLine.split(':')[1].trim()
                    flightData.arrival_airport = airport.replace(/\([^)]*\)/g, '').trim()
                    flightData.arrival_iata = airport.match(/\(([^)]+)\)/)?.[1] || ''
                }
                if (trimmedLine.startsWith('Departure date:')) {
                    flightData.departure_date = trimmedLine.split(':')[1].trim()
                }
                if (trimmedLine.startsWith('Departure time:')) {
                    // Extract everything after "Departure time:" while preserving the exact format
                    const fullLine = trimmedLine.substring('Departure time:'.length).trim()
                    flightData.departure_time = fullLine
                }
                if (trimmedLine.startsWith('Arrival time:')) {
                    // Extract everything after "Arrival time:" while preserving the exact format
                    const fullLine = trimmedLine.substring('Arrival time:'.length).trim()
                    flightData.arrival_time = fullLine
                }
            }

            // Add the last passenger if exists
            if (currentPassenger.name) {
                flightData.passengers?.push({ ...currentPassenger })
            }

            // Set the main passenger as the first adult or first passenger
            const mainPassenger = flightData.passengers?.find(p => p.type === 'Adult') || flightData.passengers?.[0]
            if (mainPassenger) {
                flightData.passenger_name = mainPassenger.name
            }

            // Instead of saving directly, store the parsed data
            setParsedData(flightData)
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

    const saveToSupabase = async () => {
        if (!parsedData) return;

        try {
            const { error: supabaseError } = await supabase
                .from('vidmaflights')
                .insert([{
                    passenger_name: parsedData.passenger_name || 'Unknown',
                    reservation_number: parsedData.reservation_number || '',
                    flight_number: parsedData.flight_number || '',
                    departure_airport: parsedData.departure_airport || '',
                    arrival_airport: parsedData.arrival_airport || '',
                    departure_date: parsedData.departure_date || '',
                    departure_time: parsedData.departure_time || '',
                    arrival_time: parsedData.arrival_time || '',
                    departure_iata: parsedData.departure_iata || '',
                    arrival_iata: parsedData.arrival_iata || '',
                    notes: parsedData.passengers
                        ? `Additional passengers: ${parsedData.passengers
                            .filter(p => p.name !== parsedData.passenger_name)
                            .map(p => `${p.name} (${p.type}, Age: ${p.age || 'N/A'})`)
                            .join('; ')}`
                        : ''
                }])

            if (supabaseError) throw supabaseError

            toast.success('Flight details saved successfully!', {
                description: 'The flight information has been added to your records.',
            })
        } catch (err) {
            console.error('Failed to save:', err)
            toast.error('Failed to save flight details', {
                description: 'Please try again or contact support if the issue persists.',
            })
        }
    }

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
                {parsedData && (
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-xl font-semibold">
                                <Plane className="h-6 w-6" />
                                Extracted Flight Data
                            </div>
                            <Button
                                onClick={saveToSupabase}
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
                                        <p className="font-medium">{parsedData.reservation_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Flight Number</p>
                                        <p className="font-medium">{parsedData.flight_number || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Route Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Route Information</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-muted-foreground text-sm">Departure</p>
                                        <p className="font-medium">{parsedData.departure_airport || 'N/A'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                {parsedData.departure_iata || 'N/A'}
                                            </span>
                                            {parsedData.departure_country && (
                                                <span className="text-xs text-muted-foreground">
                                                    {parsedData.departure_country}
                                                    {parsedData.departure_flag && ` ${parsedData.departure_flag}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Arrival</p>
                                        <p className="font-medium">{parsedData.arrival_airport || 'N/A'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                {parsedData.arrival_iata || 'N/A'}
                                            </span>
                                            {parsedData.arrival_country && (
                                                <span className="text-xs text-muted-foreground">
                                                    {parsedData.arrival_country}
                                                    {parsedData.arrival_flag && ` ${parsedData.arrival_flag}`}
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
                                        <p className="font-medium">{formatDate(parsedData.departure_date)}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-medium text-blue-600">
                                                {formatTime(parsedData.departure_time)}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Arrival</p>
                                        <p className="font-medium">{formatDate(parsedData.arrival_date || parsedData.departure_date)}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-medium text-blue-600">
                                                {formatTime(parsedData.arrival_time)}
                                            </span>
                                            {parsedData.return_arrival_time && (
                                                <span className="text-xs text-muted-foreground">
                                                    (Return: {formatTime(parsedData.return_arrival_time)})
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
                                    {parsedData.passengers?.map((passenger, i) => (
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
                                            {passenger.name === parsedData.passenger_name && (
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
                                    {parsedData.airline && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">Airline</p>
                                            <p className="font-medium">{parsedData.airline}</p>
                                        </div>
                                    )}
                                    {parsedData.seat && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">Seat</p>
                                            <p className="font-medium">{parsedData.seat}</p>
                                        </div>
                                    )}
                                    {parsedData.total_receipt && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">Total Cost</p>
                                            <p className="font-medium">{parsedData.total_receipt}</p>
                                        </div>
                                    )}
                                </div>
                                {parsedData.notes && (
                                    <div className="mt-3">
                                        <p className="text-muted-foreground text-sm">Notes</p>
                                        <p className="font-medium text-sm">{parsedData.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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