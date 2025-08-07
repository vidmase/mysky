# Boarding Pass PDF Scanning Feature

## Overview

The FlightsTrack application now supports scanning boarding passes from both image files and PDF documents. This feature extends the existing boarding pass scanner to accept PDF files in addition to images (JPG, PNG).

## How It Works

### Frontend Implementation
- **File Type Support**: The scanner now accepts both `image/*` and `application/pdf` file types
- **File Size Limits**: 
  - Images: Maximum 5MB
  - PDFs: Maximum 10MB (larger due to potential multi-page documents)
- **Preview Handling**: 
  - Images display a preview using the standard Image component
  - PDFs show a placeholder with the filename and processing instruction

### Backend Processing
- **Google Gemini AI**: Processes both image and PDF files directly
- **OCR Capabilities**: Gemini 1.5 Flash model can extract text from PDF documents natively
- **Multi-page Support**: The API instructs Gemini to focus on the first page containing boarding pass information

## Features

### Supported File Formats
- **Images**: JPG, JPEG, PNG, GIF, BMP, WebP
- **PDFs**: Any PDF document containing boarding pass information

### Data Extraction
The system extracts the same information from PDFs as from images:
- Booking reference number
- Passenger names and types (Adult/Child/Infant)
- Flight details (flight number, airports, dates, times)
- Airline information
- Seat assignments
- **Enhanced pricing information**:
  - Individual outbound flight prices (when available)
  - Individual return flight prices (when available)
  - Total booking cost
  - Smart price calculation for missing individual prices

### User Experience
1. **File Selection**: Users can drag-and-drop or click to select PDF files
2. **Preview**: PDFs show a placeholder indicating the file is ready for processing
3. **Processing**: Clear indication that a PDF is being processed vs an image
4. **Results**: Same structured data display and save functionality

## Technical Implementation

### Components Modified
- `app/components/boarding-pass-scanner.tsx`: Updated to handle PDF files
- `app/api/scan-boarding-pass/route.ts`: Enhanced to process PDF files with Gemini

### Key Changes
1. **File Validation**: Extended to accept PDF mime type
2. **Preview Logic**: Added PDF placeholder display
3. **Processing Messages**: Dynamic messages based on file type
4. **Error Handling**: Improved error messages for different file types

## Usage Instructions

1. Navigate to the "Add Flight" page
2. Click on the "Scan Boarding Pass" tab
3. Select a PDF file containing your boarding pass or upload an image
4. Click "Scan Boarding Pass" to process the document
5. Review the extracted information
6. Click "Save to My Flights" to add the flight details to your account

## Benefits

- **Convenience**: Users can upload boarding passes received as PDF emails
- **Accuracy**: Gemini AI provides high-quality OCR for both images and PDFs
- **Flexibility**: Support for various boarding pass formats and layouts
- **Efficiency**: Direct PDF processing without requiring conversion tools

## Future Enhancements

- Support for multi-page PDFs with multiple boarding passes
- Batch processing of multiple files
- Enhanced PDF preview with actual content rendering
- Support for encrypted PDFs 