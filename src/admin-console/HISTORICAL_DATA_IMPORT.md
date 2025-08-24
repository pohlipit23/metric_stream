# Historical Data Import Feature

## Overview

The Historical Data Import feature allows administrators to upload CSV files containing historical time-series data for KPIs. This is particularly useful when setting up the system for the first time or when migrating data from other systems.

## How to Use

1. **Navigate to KPI Registry**: Go to the KPI Registry page in the Admin Console
2. **Select KPI**: Find the KPI you want to import data for
3. **Click Import Button**: Click the upload icon (📤) in the Actions column
4. **Upload CSV File**: 
   - Drag and drop a CSV file or click to browse
   - Maximum file size: 10MB
   - Supported format: CSV (.csv)

## CSV File Format

### Required Columns

- **timestamp**: ISO 8601 formatted timestamp (e.g., `2025-01-15T12:00:00Z`)
- **value**: Numeric value for the KPI (e.g., `45000.50`)

### Optional Columns

- **metadata**: JSON object with additional information (e.g., `{"source": "manual_import", "note": "market_dip"}`)

### Example CSV

The system generates KPI-specific sample CSV files based on existing data patterns. If the KPI already has historical data, the sample will include recent actual values. Otherwise, it generates realistic sample data based on the KPI name and type.

```csv
timestamp,value,metadata
2025-01-21T12:00:00Z,45000.50,"{""source"": ""historical_data""}"
2025-01-21T13:00:00Z,45100.25,"{""source"": ""historical_data""}"
2025-01-21T14:00:00Z,44950.75,"{""source"": ""historical_data"", ""note"": ""market_dip""}"
```

**Note**: Click "Download Sample CSV" in the import dialog to get a template with realistic data for your specific KPI.

## Validation Rules

### Timestamp Validation
- Must be valid ISO 8601 format
- Cannot be more than 10 years in the past
- Cannot be more than 1 year in the future
- Duplicate timestamps will be skipped

### Value Validation
- Must be a valid number
- Must be finite (not NaN or Infinity)

### Metadata Validation
- Optional field
- If provided, should be valid JSON
- Invalid JSON will be stored as a string with a warning

## Import Process

1. **Upload**: Select and upload your CSV file
2. **Validation**: The system validates all data and shows a preview
3. **Review**: Check the preview for any errors or warnings
4. **Import**: Click "Import Data" to process valid rows
5. **Results**: View import statistics and any errors

## Error Handling

- **Validation Errors**: Rows with errors are skipped during import
- **Partial Imports**: Valid rows are imported even if some rows have errors
- **Error Logging**: All errors are logged with row numbers for easy correction
- **Import Status**: Each import gets a unique ID for tracking

## Data Storage

- Historical data is stored in Cloudflare KV under the key pattern: `timeseries:{kpiId}`
- Data is merged with existing time-series data
- Duplicate timestamps are automatically detected and skipped
- Import metadata is stored for audit purposes

## Best Practices

1. **Use KPI-Specific Samples**: Always download the sample CSV for your specific KPI to get realistic data patterns
2. **Data Quality**: Ensure timestamps are in chronological order
3. **File Size**: Keep files under 10MB for optimal performance
4. **Backup**: Keep a backup of your original data files
5. **Testing**: Test with a small sample file first
6. **Validation**: Review the preview carefully before importing
7. **Realistic Values**: Use the generated sample as a guide for appropriate value ranges for your KPI type

## Troubleshooting

### Common Issues

1. **Invalid Timestamp Format**
   - Solution: Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
   - Example: `2025-01-15T12:00:00Z`

2. **Invalid JSON Metadata**
   - Solution: Ensure proper JSON formatting with escaped quotes
   - Example: `"{""source"": ""manual_import""}"`

3. **File Too Large**
   - Solution: Split large files into smaller chunks (< 10MB each)

4. **Duplicate Timestamps**
   - Solution: Remove or modify duplicate entries before import

### Getting Help

If you encounter issues:
1. Check the error messages in the preview
2. Download the sample CSV for reference
3. Verify your data format matches the requirements
4. Contact system administrator if problems persist

## Technical Details

- **Storage**: Cloudflare KV Store
- **Processing**: Server-side validation and parsing
- **Limits**: 10MB file size, 10% error tolerance
- **Performance**: Optimized for time-series data append operations