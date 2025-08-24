/**
 * CSV Parser Utility
 * Handles CSV file parsing and validation for historical data import
 */

/**
 * Parse CSV file content into structured data
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object} Parsed data with validation results
 */
export function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n')
  const errors = []
  const warnings = []
  const data = []

  if (lines.length === 0) {
    errors.push({ row: 0, message: 'CSV file is empty' })
    return { data, errors, warnings }
  }

  // Parse header row
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)
  
  // Validate required headers
  const requiredHeaders = ['timestamp', 'value']
  const missingHeaders = requiredHeaders.filter(header => 
    !headers.some(h => h.toLowerCase() === header.toLowerCase())
  )
  
  if (missingHeaders.length > 0) {
    errors.push({ 
      row: 1, 
      message: `Missing required columns: ${missingHeaders.join(', ')}. Required: timestamp, value` 
    })
    return { data, errors, warnings }
  }

  // Create header mapping (case-insensitive)
  const headerMap = {}
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim()
    headerMap[normalizedHeader] = index
  })

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const rowNumber = i + 1
    const values = parseCSVLine(line)
    
    if (values.length !== headers.length) {
      errors.push({ 
        row: rowNumber, 
        message: `Column count mismatch. Expected ${headers.length} columns, got ${values.length}` 
      })
      continue
    }

    // Create row object
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })

    // Validate and normalize the row
    const validationResult = validateRow(row, headerMap, rowNumber)
    
    // Add validation flags to row
    row._hasError = validationResult.errors.length > 0
    row._hasWarning = validationResult.warnings.length > 0
    row._rowNumber = rowNumber

    // Collect errors and warnings
    errors.push(...validationResult.errors)
    warnings.push(...validationResult.warnings)

    data.push(row)
  }

  return { data, errors, warnings }
}

/**
 * Parse a single CSV line, handling quoted values
 * @param {string} line - CSV line to parse
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim())
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }

  // Add the last field
  values.push(current.trim())
  
  return values
}

/**
 * Validate a single row of data
 * @param {Object} row - Row data object
 * @param {Object} headerMap - Header to index mapping
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} Validation result with errors and warnings
 */
function validateRow(row, headerMap, rowNumber) {
  const errors = []
  const warnings = []

  // Get values using case-insensitive header lookup
  const timestamp = getValueByHeader(row, headerMap, 'timestamp')
  const value = getValueByHeader(row, headerMap, 'value')
  const metadata = getValueByHeader(row, headerMap, 'metadata')

  // Validate timestamp
  if (!timestamp || timestamp.trim() === '') {
    errors.push({ row: rowNumber, message: 'Timestamp is required' })
  } else {
    const timestampValidation = validateTimestamp(timestamp.trim())
    if (!timestampValidation.isValid) {
      errors.push({ row: rowNumber, message: `Invalid timestamp: ${timestampValidation.error}` })
    }
  }

  // Validate value
  if (!value || value.trim() === '') {
    errors.push({ row: rowNumber, message: 'Value is required' })
  } else {
    const numericValue = parseFloat(value.trim())
    if (isNaN(numericValue)) {
      errors.push({ row: rowNumber, message: 'Value must be a valid number' })
    } else if (!isFinite(numericValue)) {
      errors.push({ row: rowNumber, message: 'Value must be a finite number' })
    }
  }

  // Validate metadata (optional)
  if (metadata && metadata.trim() !== '') {
    try {
      JSON.parse(metadata.trim())
    } catch (e) {
      warnings.push({ row: rowNumber, message: 'Metadata is not valid JSON, will be stored as string' })
    }
  }

  return { errors, warnings }
}

/**
 * Get value from row using case-insensitive header lookup
 * @param {Object} row - Row data object
 * @param {Object} headerMap - Header to index mapping
 * @param {string} headerName - Header name to look for
 * @returns {string} Value or empty string if not found
 */
function getValueByHeader(row, headerMap, headerName) {
  const index = headerMap[headerName.toLowerCase()]
  if (index !== undefined) {
    const headers = Object.keys(row).filter(key => !key.startsWith('_'))
    const header = headers[index]
    return row[header] || ''
  }
  return ''
}

/**
 * Validate timestamp format
 * @param {string} timestamp - Timestamp string to validate
 * @returns {Object} Validation result
 */
function validateTimestamp(timestamp) {
  // Try to parse as ISO 8601 date
  const date = new Date(timestamp)
  
  if (isNaN(date.getTime())) {
    return { 
      isValid: false, 
      error: 'Must be a valid ISO 8601 timestamp (e.g., 2025-01-15T12:00:00Z)' 
    }
  }

  // Check if it's a reasonable date (not too far in the past or future)
  const now = new Date()
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

  if (date < tenYearsAgo) {
    return { 
      isValid: false, 
      error: 'Timestamp is more than 10 years in the past' 
    }
  }

  if (date > oneYearFromNow) {
    return { 
      isValid: false, 
      error: 'Timestamp is more than 1 year in the future' 
    }
  }

  return { isValid: true, date }
}

/**
 * Convert parsed data to the format expected by the API
 * @param {Array} data - Parsed CSV data
 * @returns {Array} API-formatted data
 */
export function formatDataForAPI(data) {
  return data
    .filter(row => !row._hasError) // Only include valid rows
    .map(row => {
      // Find the actual column values (case-insensitive)
      const headers = Object.keys(row).filter(key => !key.startsWith('_'))
      
      let timestamp = ''
      let value = ''
      let metadata = ''

      headers.forEach(header => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader === 'timestamp') {
          timestamp = row[header]
        } else if (lowerHeader === 'value') {
          value = row[header]
        } else if (lowerHeader === 'metadata') {
          metadata = row[header]
        }
      })

      const result = {
        timestamp: new Date(timestamp).toISOString(),
        value: parseFloat(value)
      }

      // Add metadata if present and valid JSON
      if (metadata && metadata.trim() !== '') {
        try {
          result.metadata = JSON.parse(metadata.trim())
        } catch (e) {
          // Store as string if not valid JSON
          result.metadata = { raw: metadata.trim() }
        }
      }

      return result
    })
}

/**
 * Generate a generic sample CSV template (fallback)
 * @returns {string} Sample CSV content
 */
export function generateSampleCSV() {
  const now = new Date();
  const sampleData = [
    ['timestamp', 'value', 'metadata']
  ];
  
  // Generate 5 sample rows with hourly intervals
  for (let i = 4; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const value = (100 + Math.random() * 50).toFixed(2); // Random values between 100-150
    const metadata = JSON.stringify({
      source: 'manual_import',
      note: i === 2 ? 'sample_annotation' : undefined
    });
    
    sampleData.push([
      timestamp.toISOString(),
      value,
      metadata
    ]);
  }

  return sampleData.map(row => 
    row.map(cell => 
      cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(',')
  ).join('\n')
}