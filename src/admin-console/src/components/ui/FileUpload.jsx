import { useState, useRef, useCallback } from 'react'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import Button from './Button'

function FileUpload({ 
  onFileSelect, 
  accept = '.csv', 
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  error = null,
  helperText = null,
  className = ''
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }, [disabled])

  const handleFileSelection = (file) => {
    // Validate file type
    if (accept && !file.name.toLowerCase().endsWith(accept.replace('.', ''))) {
      onFileSelect(null, `Please select a ${accept} file`)
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      onFileSelect(null, `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    setSelectedFile(file)
    onFileSelect(file, null)
  }

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    onFileSelect(null, null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      {!selectedFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : error 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <div className="flex flex-col items-center">
            <Upload className={`h-8 w-8 mb-3 ${
              error ? 'text-red-400' : isDragOver ? 'text-blue-500' : 'text-gray-400'
            }`} />
            <p className={`text-sm font-medium mb-1 ${
              error ? 'text-red-700' : 'text-gray-900'
            }`}>
              {isDragOver ? 'Drop your file here' : 'Upload CSV file'}
            </p>
            <p className={`text-xs ${
              error ? 'text-red-600' : 'text-gray-500'
            }`}>
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      ) : (
        <div className={`
          border rounded-lg p-4 bg-white
          ${error ? 'border-red-300' : 'border-green-300'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <File className={`h-5 w-5 mr-3 ${
                error ? 'text-red-500' : 'text-green-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export default FileUpload