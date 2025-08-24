import { useState, useCallback } from 'react'
import { Upload, Download, AlertCircle, CheckCircle, Loader, FileText, X } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Card from './ui/Card'
import FileUpload from './ui/FileUpload'
import CSVPreview from './ui/CSVPreview'
import { parseCSV, formatDataForAPI, generateSampleCSV } from '../utils/csvParser'
import { kpiAPI } from '../utils/api'

function HistoricalDataImport({ 
  isOpen, 
  onClose, 
  kpi,
  onImportComplete 
}) {
  const [step, setStep] = useState('upload') // 'upload', 'preview', 'importing', 'complete'
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)

  // Reset state when modal opens/closes
  const handleClose = useCallback(() => {
    setStep('upload')
    setSelectedFile(null)
    setFileError(null)
    setParsedData(null)
    setImporting(false)
    setImportResult(null)
    setImportError(null)
    onClose()
  }, [onClose])

  // Handle file selection and parsing
  const handleFileSelect = useCallback(async (file, error) => {
    setFileError(error)
    setSelectedFile(file)
    setParsedData(null)

    if (file && !error) {
      try {
        const content = await readFileContent(file)
        const parsed = parseCSV(content)
        setParsedData(parsed)
        
        if (parsed.errors.length === 0) {
          setStep('preview')
        } else {
          setStep('preview') // Still show preview even with errors
        }
      } catch (err) {
        setFileError(`Failed to parse CSV file: ${err.message}`)
      }
    }
  }, [])

  // Read file content as text
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // Handle import process
  const handleImport = async () => {
    if (!parsedData || !kpi) return

    try {
      setImporting(true)
      setImportError(null)
      setStep('importing')

      // Format data for API
      const apiData = formatDataForAPI(parsedData.data)
      
      if (apiData.length === 0) {
        throw new Error('No valid data rows to import')
      }

      // Convert to CSV format for API
      const csvContent = convertToCSV(apiData)
      
      // Call import API
      const result = await kpiAPI.importData(kpi.id, csvContent)
      
      setImportResult(result)
      setStep('complete')
      
      // Notify parent component
      if (onImportComplete) {
        onImportComplete(result)
      }
    } catch (err) {
      console.error('Import failed:', err)
      setImportError(err.message || 'Import failed')
      setStep('preview') // Go back to preview to allow retry
    } finally {
      setImporting(false)
    }
  }

  // Convert data back to CSV format for API
  const convertToCSV = (data) => {
    if (data.length === 0) return ''
    
    const headers = ['timestamp', 'value', 'metadata']
    const rows = [headers]
    
    data.forEach(row => {
      const csvRow = [
        row.timestamp,
        row.value.toString(),
        row.metadata ? JSON.stringify(row.metadata) : ''
      ]
      rows.push(csvRow)
    })
    
    return rows.map(row => 
      row.map(cell => 
        cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(',')
    ).join('\n')
  }

  // Download sample CSV
  const handleDownloadSample = async () => {
    try {
      let sampleContent;
      
      if (kpi && kpi.id) {
        // Try to get KPI-specific sample data
        try {
          sampleContent = await kpiAPI.getSampleCSV(kpi.id);
        } catch (error) {
          console.warn('Failed to get KPI-specific sample, using generic sample:', error);
          sampleContent = generateSampleCSV();
        }
      } else {
        sampleContent = generateSampleCSV();
      }
      
      const blob = new Blob([sampleContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sample-${kpi?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'historical'}-data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download sample CSV:', error);
      // Fallback to generic sample
      const sampleContent = generateSampleCSV();
      const blob = new Blob([sampleContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sample-historical-data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  const canImport = parsedData && parsedData.data.length > 0 && 
                   parsedData.data.some(row => !row._hasError)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Import Historical Data - ${kpi?.name || 'KPI'}`}
      size="xl"
    >
      <div className="space-y-6">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${
            step === 'upload' ? 'text-blue-600' : 
            ['preview', 'importing', 'complete'].includes(step) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'upload' ? 'bg-blue-100 text-blue-600' :
              ['preview', 'importing', 'complete'].includes(step) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Upload</span>
          </div>
          
          <div className={`w-8 h-0.5 ${
            ['preview', 'importing', 'complete'].includes(step) ? 'bg-green-600' : 'bg-gray-200'
          }`} />
          
          <div className={`flex items-center ${
            step === 'preview' ? 'text-blue-600' : 
            ['importing', 'complete'].includes(step) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'preview' ? 'bg-blue-100 text-blue-600' :
              ['importing', 'complete'].includes(step) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Preview</span>
          </div>
          
          <div className={`w-8 h-0.5 ${
            ['importing', 'complete'].includes(step) ? 'bg-green-600' : 'bg-gray-200'
          }`} />
          
          <div className={`flex items-center ${
            step === 'importing' ? 'text-blue-600' : 
            step === 'complete' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'importing' ? 'bg-blue-100 text-blue-600' :
              step === 'complete' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Import</span>
          </div>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <Card.Content>
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                      CSV File Requirements
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>timestamp</strong>: ISO 8601 format (e.g., 2025-01-21T12:00:00Z)</li>
                      <li>• <strong>value</strong>: Numeric value for the KPI</li>
                      <li>• <strong>metadata</strong>: Optional JSON object with additional data</li>
                    </ul>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSample}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample CSV for {kpi?.name || 'this KPI'}
                      </Button>
                      <p className="text-xs text-blue-600 mt-1">
                        Sample includes realistic data based on your KPI's existing patterns
                      </p>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".csv"
              maxSize={10 * 1024 * 1024} // 10MB
              error={fileError}
              helperText="Upload a CSV file with historical data for this KPI"
            />
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            {/* Import Error */}
            {importError && (
              <Card className="border-red-200 bg-red-50">
                <Card.Content>
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
                      <p className="text-sm text-red-700 mt-1">{importError}</p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            )}

            {/* CSV Preview */}
            <CSVPreview
              data={parsedData.data}
              errors={parsedData.errors}
              warnings={parsedData.warnings}
            />

            {/* Import Warning */}
            {parsedData.errors.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <Card.Content>
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        Data Validation Issues
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Some rows have validation errors and will be skipped during import. 
                        Only valid rows will be imported.
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Importing Historical Data
            </h3>
            <p className="text-sm text-gray-600">
              Please wait while we process and validate your data...
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResult && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Import Completed Successfully
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Successfully imported {importResult.imported_count || 0} data points</p>
              {importResult.skipped_count > 0 && (
                <p>Skipped {importResult.skipped_count} invalid rows</p>
              )}
              {importResult.duplicate_count > 0 && (
                <p>Skipped {importResult.duplicate_count} duplicate timestamps</p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {step === 'preview' && (
              <Button
                variant="secondary"
                onClick={() => setStep('upload')}
                disabled={importing}
              >
                Back to Upload
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={importing}
            >
              {step === 'complete' ? 'Close' : 'Cancel'}
            </Button>
            
            {step === 'preview' && (
              <Button
                onClick={handleImport}
                disabled={!canImport || importing}
              >
                {importing ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data ({parsedData.data.filter(row => !row._hasError).length} rows)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default HistoricalDataImport