import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import Card from './Card'
import Button from './Button'

function CSVPreview({ 
  data = [], 
  errors = [], 
  warnings = [],
  maxPreviewRows = 10,
  className = ''
}) {
  const [showAllRows, setShowAllRows] = useState(false)
  const [showErrors, setShowErrors] = useState(true)
  const [showWarnings, setShowWarnings] = useState(true)

  if (!data || data.length === 0) {
    return null
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : []
  const previewData = showAllRows ? data : data.slice(0, maxPreviewRows)
  const hasMoreRows = data.length > maxPreviewRows

  const validRows = data.filter(row => !row._hasError).length
  const errorRows = data.filter(row => row._hasError).length
  const warningRows = data.filter(row => row._hasWarning).length

  return (
    <div className={className}>
      {/* Summary Stats */}
      <Card className="mb-4">
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">{validRows}</p>
                <p className="text-xs text-gray-500">Valid rows</p>
              </div>
            </div>
            
            {errorRows > 0 && (
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{errorRows}</p>
                  <p className="text-xs text-gray-500">Rows with errors</p>
                </div>
              </div>
            )}
            
            {warningRows > 0 && (
              <div className="flex items-center">
                <Info className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{warningRows}</p>
                  <p className="text-xs text-gray-500">Rows with warnings</p>
                </div>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Errors Section */}
      {errors.length > 0 && (
        <Card className="mb-4 border-red-200">
          <Card.Header className="bg-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-sm font-medium text-red-800">
                  Validation Errors ({errors.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
              >
                {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </Card.Header>
          {showErrors && (
            <Card.Content>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                    <span className="font-medium">Row {error.row}:</span> {error.message}
                  </div>
                ))}
              </div>
            </Card.Content>
          )}
        </Card>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <Card className="mb-4 border-yellow-200">
          <Card.Header className="bg-yellow-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="text-sm font-medium text-yellow-800">
                  Warnings ({warnings.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWarnings(!showWarnings)}
              >
                {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </Card.Header>
          {showWarnings && (
            <Card.Content>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    <span className="font-medium">Row {warning.row}:</span> {warning.message}
                  </div>
                ))}
              </div>
            </Card.Content>
          )}
        </Card>
      )}

      {/* Data Preview */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Data Preview ({data.length} rows)
            </h3>
            {hasMoreRows && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllRows(!showAllRows)}
              >
                {showAllRows ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show All ({data.length} rows)
                  </>
                )}
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Row
                  </th>
                  {headers.filter(h => !h.startsWith('_')).map((header) => (
                    <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, index) => {
                  const actualRowNumber = showAllRows ? index + 1 : index + 1
                  const hasError = row._hasError
                  const hasWarning = row._hasWarning
                  
                  return (
                    <tr key={index} className={`
                      ${hasError ? 'bg-red-50' : hasWarning ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                    `}>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {actualRowNumber}
                      </td>
                      {headers.filter(h => !h.startsWith('_')).map((header) => (
                        <td key={header} className="px-4 py-2 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={row[header]}>
                            {row[header]}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-2 text-sm">
                        {hasError ? (
                          <div className="flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Error
                          </div>
                        ) : hasWarning ? (
                          <div className="flex items-center text-yellow-600">
                            <Info className="h-4 w-4 mr-1" />
                            Warning
                          </div>
                        ) : (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Valid
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

export default CSVPreview