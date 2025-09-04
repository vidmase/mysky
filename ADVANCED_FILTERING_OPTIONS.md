# Advanced Gmail Import Filtering Options

## Overview

The Enhanced Gmail Import Filtering System now includes a comprehensive set of advanced filtering options that allow for precise control over which emails are imported. These filters can be combined to create highly specific import configurations tailored to your needs.

## Filter Categories

### 1. **Email Metadata Filters**

#### Attachment Filters
- **`hasAttachments`**: Require emails to have attachments
- **`attachmentTypes`**: Specify allowed attachment types (e.g., `['pdf', 'png', 'jpg']`)
- **`minAttachmentSize`**: Minimum attachment size in bytes
- **`maxAttachmentSize`**: Maximum attachment size in bytes

```typescript
{
  hasAttachments: true,
  attachmentTypes: ['pdf', 'png'],
  minAttachmentSize: 1024, // 1KB
  maxAttachmentSize: 10485760 // 10MB
}
```

#### Email Priority & Importance
- **`isImportant`**: Only import emails marked as important
- **`isStarred`**: Only import starred emails
- **`hasLabels`**: Require specific Gmail labels
- **`excludeLabels`**: Exclude emails with specific labels

```typescript
{
  isImportant: true,
  isStarred: false,
  hasLabels: ['Travel', 'Flights'],
  excludeLabels: ['Spam', 'Promotions']
}
```

### 2. **Time-based Filters**

#### Time of Day
- **`timeOfDay`**: Filter by time range (HH:MM format)

```typescript
{
  timeOfDay: {
    start: '09:00',
    end: '17:00'
  }
}
```

#### Day of Week
- **`dayOfWeek`**: Filter by specific days (0-6, Sunday-Saturday)
- **`excludeWeekends`**: Exclude Saturday and Sunday
- **`excludeHolidays`**: Exclude holiday dates

```typescript
{
  dayOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
  excludeWeekends: true
}
```

### 3. **Content Length & Complexity**

- **`minContentLength`**: Minimum email content length
- **`maxContentLength`**: Maximum email content length
- **`requireHtmlContent`**: Require HTML content
- **`requirePlainTextContent`**: Require plain text content

```typescript
{
  minContentLength: 100,
  maxContentLength: 50000,
  requireHtmlContent: true
}
```

### 4. **Language & Locale Filters**

- **`language`**: Filter by language codes (e.g., `['en', 'es', 'fr']`)
- **`locale`**: Filter by locale codes (e.g., `['en-US', 'en-GB']`)

```typescript
{
  language: ['en', 'es'],
  locale: ['en-US', 'en-GB']
}
```

### 5. **Email Thread & Conversation Filters**

- **`isThreadStart`**: Only first message in thread
- **`hasReplies`**: Require thread to have replies
- **`threadSize`**: Filter by thread size

```typescript
{
  hasReplies: true,
  threadSize: {
    min: 2,
    max: 10
  }
}
```

### 6. **Domain & TLD Filters**

- **`allowedDomains`**: Whitelist specific domains
- **`excludedDomains`**: Blacklist specific domains
- **`allowedTLDs`**: Allow specific top-level domains
- **`excludedTLDs`**: Exclude specific top-level domains

```typescript
{
  allowedDomains: ['ryanair.com', 'easyjet.com', 'britishairways.com'],
  excludedDomains: ['spam.com', 'malware.com'],
  allowedTLDs: ['.com', '.co.uk', '.ie'],
  excludedTLDs: ['.ru', '.cn']
}
```

### 7. **Email Format & Structure Filters**

- **`hasInlineImages`**: Require inline images
- **`hasExternalLinks`**: Require external links
- **`hasTrackingPixels`**: Require tracking pixels
- **`hasUnsubscribeLink`**: Require unsubscribe links

```typescript
{
  hasInlineImages: true,
  hasExternalLinks: true,
  hasUnsubscribeLink: true
}
```

### 8. **Business Logic Filters**

- **`isBookingConfirmation`**: Only booking confirmations
- **`isItinerary`**: Only itineraries
- **`isCancellation`**: Only cancellations
- **`isModification`**: Only modifications
- **`isRefund`**: Only refunds

```typescript
{
  isBookingConfirmation: true,
  isItinerary: false,
  excludeCancellations: true,
  excludeRefunds: true
}
```

### 9. **Confidence & Validation Filters**

- **`requireValidPassengerName`**: Require valid passenger name
- **`requireValidPrice`**: Require valid price information
- **`requireValidSeat`**: Require seat information
- **`requireValidBookingClass`**: Require booking class

```typescript
{
  requireValidPassengerName: true,
  requireValidPrice: true,
  requireValidSeat: true,
  requireValidBookingClass: true
}
```

### 10. **Advanced Content Analysis**

#### Sentiment Analysis
- **`sentimentFilter`**: Filter by sentiment (`'positive' | 'negative' | 'neutral' | 'any'`)

#### Urgency Analysis
- **`urgencyFilter`**: Filter by urgency level (`'high' | 'medium' | 'low' | 'any'`)

#### Formality Analysis
- **`formalityFilter`**: Filter by formality level (`'formal' | 'informal' | 'any'`)

```typescript
{
  sentimentFilter: 'positive',
  urgencyFilter: 'medium',
  formalityFilter: 'formal'
}
```

### 11. **Custom Regex Patterns**

- **`customRegexPatterns`**: Define custom regex patterns for specific fields

```typescript
{
  customRegexPatterns: [
    {
      field: 'subject',
      pattern: /flight.*confirmation/i,
      required: true
    },
    {
      field: 'content',
      pattern: /departure.*arrival/i,
      required: false
    }
  ]
}
```

### 12. **Batch & Processing Filters**

- **`processInBatches`**: Process emails in batches
- **`batchSize`**: Size of processing batches
- **`skipProcessedEmails`**: Skip already processed emails
- **`processedEmailIds`**: List of already processed email IDs

```typescript
{
  processInBatches: true,
  batchSize: 50,
  skipProcessedEmails: true,
  processedEmailIds: ['email1', 'email2']
}
```

### 13. **Rate Limiting & Throttling**

- **`maxEmailsPerMinute`**: Maximum emails processed per minute
- **`maxEmailsPerHour`**: Maximum emails processed per hour
- **`cooldownPeriod`**: Cooldown period between requests (ms)

```typescript
{
  maxEmailsPerMinute: 60,
  maxEmailsPerHour: 1000,
  cooldownPeriod: 1000
}
```

### 14. **Advanced Search Operators**

- **`useAdvancedSearch`**: Enable advanced Gmail search operators
- **`searchOperators`**: Define custom search operators

```typescript
{
  useAdvancedSearch: true,
  searchOperators: {
    has: ['attachment', 'label:important'],
    hasnot: ['label:spam'],
    larger: 1024,
    smaller: 1048576,
    filename: ['pdf', 'png'],
    label: ['Travel', 'Flights'],
    category: ['primary']
  }
}
```

## Enhanced Filter Presets

### 1. **Ryanair Strict**
```typescript
{
  airlines: ['ryanair'],
  senders: ['itinerary@ryanair.com', 'booking@ryanair.com'],
  subjectKeywords: ['itinerary', 'booking', 'confirmation'],
  hasFlightNumber: true,
  hasReservationNumber: true,
  hasValidDate: true,
  requireValidAirports: true,
  requireValidTimes: true,
  minConfidence: 0.9,
  deduplicationStrategy: 'strict',
  searchStrategy: 'targeted',
  // Advanced options
  hasAttachments: true,
  attachmentTypes: ['pdf'],
  isBookingConfirmation: true,
  requireValidPassengerName: true,
  requireValidPrice: true,
  excludeWeekends: true
}
```

### 2. **Business Travel**
```typescript
{
  airlines: ['british_airways', 'lufthansa', 'united', 'delta', 'american'],
  subjectKeywords: ['itinerary', 'booking', 'confirmation'],
  minConfidence: 0.8,
  deduplicationStrategy: 'strict',
  searchStrategy: 'targeted',
  // Advanced options
  allowedDomains: ['britishairways.com', 'lufthansa.com', 'united.com', 'delta.com', 'aa.com'],
  hasAttachments: true,
  attachmentTypes: ['pdf'],
  isImportant: true,
  formalityFilter: 'formal',
  requireValidPassengerName: true,
  requireValidPrice: true,
  excludeWeekends: true,
  timeOfDay: { start: '09:00', end: '17:00' }
}
```

### 3. **Budget Airlines**
```typescript
{
  airlines: ['ryanair', 'easyjet', 'wizzair'],
  subjectKeywords: ['itinerary', 'booking', 'confirmation'],
  minConfidence: 0.7,
  deduplicationStrategy: 'flexible',
  searchStrategy: 'targeted',
  // Advanced options
  allowedDomains: ['ryanair.com', 'easyjet.com', 'wizzair.com'],
  hasAttachments: false, // Budget airlines often don't send PDFs
  sentimentFilter: 'any',
  urgencyFilter: 'any',
  requireValidAirports: true,
  excludeWeekends: false
}
```

### 4. **International Travel**
```typescript
{
  subjectKeywords: ['itinerary', 'booking', 'confirmation', 'international'],
  contentKeywords: ['international', 'passport', 'visa', 'customs'],
  minConfidence: 0.6,
  deduplicationStrategy: 'flexible',
  searchStrategy: 'comprehensive',
  // Advanced options
  hasAttachments: true,
  attachmentTypes: ['pdf', 'doc', 'docx'],
  allowedTLDs: ['.com', '.co.uk', '.ie', '.de', '.fr', '.es', '.it'],
  excludedTLDs: ['.ru', '.cn'],
  requireValidPassengerName: true,
  requireValidPrice: true,
  sentimentFilter: 'any',
  urgencyFilter: 'any'
}
```

## Usage Examples

### Basic Configuration
```typescript
import { GmailFilterPresets } from '@/lib/gmail-filtering'

const config = {
  ...GmailFilterPresets.comprehensive(),
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  customFilters: {
    hasAttachments: true,
    isImportant: true,
    excludeWeekends: true
  }
}
```

### Custom Advanced Configuration
```typescript
const customConfig = {
  // Basic filters
  airlines: ['ryanair', 'easyjet'],
  subjectKeywords: ['itinerary', 'booking'],
  minConfidence: 0.8,
  
  // Advanced filters
  hasAttachments: true,
  attachmentTypes: ['pdf'],
  allowedDomains: ['ryanair.com', 'easyjet.com'],
  excludeWeekends: true,
  timeOfDay: { start: '08:00', end: '18:00' },
  isBookingConfirmation: true,
  requireValidPassengerName: true,
  requireValidPrice: true,
  sentimentFilter: 'positive',
  
  // Processing options
  maxMessages: 500,
  concurrency: 3,
  useLLM: true
}
```

### API Usage
```javascript
const response = await fetch('/api/gmail/import-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filterPreset: 'business',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    customFilters: {
      hasAttachments: true,
      isImportant: true,
      timeOfDay: { start: '09:00', end: '17:00' },
      excludeWeekends: true,
      requireValidPassengerName: true,
      requireValidPrice: true
    },
    maxMessages: 1000,
    concurrency: 5
  })
})
```

## Best Practices

### 1. **Start with Presets**
Use predefined presets as starting points and customize as needed.

### 2. **Combine Filters Strategically**
- Use domain filters to whitelist trusted senders
- Use time filters to focus on business hours
- Use attachment filters to ensure quality content
- Use business logic filters to exclude unwanted email types

### 3. **Balance Accuracy vs Coverage**
- Higher confidence thresholds = fewer but more accurate imports
- Lower confidence thresholds = more coverage but potential false positives
- Use sentiment and urgency filters to prioritize important emails

### 4. **Performance Considerations**
- Limit `maxMessages` for faster processing
- Use `concurrency` to control API rate limits
- Enable `skipProcessedEmails` to avoid reprocessing
- Use `processInBatches` for large imports

### 5. **Error Handling**
- Monitor error rates and adjust filters accordingly
- Use `skipInvalidEmails` to continue processing despite errors
- Review error details to understand filter issues

## Troubleshooting

### Common Issues

#### Low Import Success Rate
- Lower `minConfidence` threshold
- Remove restrictive filters (e.g., `hasAttachments`, `isImportant`)
- Use broader search strategies
- Check domain and TLD filters

#### High Duplicate Rate
- Adjust `duplicateThreshold`
- Use `strict` deduplication strategy
- Review existing database records
- Enable `skipProcessedEmails`

#### Slow Performance
- Reduce `concurrency` setting
- Lower `maxMessages` limit
- Use `targeted` search strategy
- Enable `processInBatches`

#### API Rate Limiting
- Increase `cooldownPeriod`
- Reduce `maxEmailsPerMinute`
- Lower `concurrency` setting
- Use `batchSize` for controlled processing

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**: Improved sentiment and urgency analysis
2. **Language Detection**: Automatic language detection and filtering
3. **Spam Detection**: Built-in spam filtering capabilities
4. **Custom Parser Plugins**: Plugin system for custom email formats
5. **Real-time Processing**: WebSocket-based real-time import processing

### Extensibility
The filtering system is designed to be easily extensible. New filter types can be added by:
1. Extending the `GmailFilterConfig` interface
2. Implementing filter logic in `applyAdvancedFilters`
3. Adding UI controls in the React component
4. Updating preset configurations

## Conclusion

The advanced filtering options provide unprecedented control over Gmail import processes. By combining multiple filter types, you can create highly specific configurations that match your exact requirements while maintaining high accuracy and performance.

The system's modular design makes it easy to extend and customize, while the comprehensive preset configurations provide excellent starting points for common use cases.



