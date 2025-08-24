import { useState, useEffect } from 'react'
import { Clock, Info, Calendar } from 'lucide-react'
import { Input } from './Input'
import { Button } from './Button'

function CronExpressionBuilder({ value, onChange, className = '' }) {
  const [mode, setMode] = useState('simple') // 'simple' or 'advanced'
  const [simpleConfig, setSimpleConfig] = useState({
    frequency: 'daily',
    time: '09:00',
    dayOfWeek: '1', // Monday
    dayOfMonth: '1'
  })
  const [advancedExpression, setAdvancedExpression] = useState(value || '0 9 * * *')
  const [validation, setValidation] = useState({ valid: true, message: '' })

  useEffect(() => {
    if (value) {
      setAdvancedExpression(value)
      // Try to parse the expression into simple config
      parseExpressionToSimple(value)
    }
  }, [value])

  const parseExpressionToSimple = (expr) => {
    if (!expr) return

    const parts = expr.split(' ')
    if (parts.length !== 5) return

    const [minute, hour, day, month, weekday] = parts

    // Daily pattern: 0 9 * * *
    if (day === '*' && month === '*' && weekday === '*') {
      setSimpleConfig(prev => ({
        ...prev,
        frequency: 'daily',
        time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      }))
      return
    }

    // Weekly pattern: 0 9 * * 1
    if (day === '*' && month === '*' && weekday !== '*') {
      setSimpleConfig(prev => ({
        ...prev,
        frequency: 'weekly',
        time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
        dayOfWeek: weekday
      }))
      return
    }

    // Monthly pattern: 0 9 1 * *
    if (day !== '*' && month === '*' && weekday === '*') {
      setSimpleConfig(prev => ({
        ...prev,
        frequency: 'monthly',
        time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
        dayOfMonth: day
      }))
      return
    }
  }

  const buildSimpleExpression = (config) => {
    const [hour, minute] = config.time.split(':').map(Number)

    switch (config.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekly':
        return `${minute} ${hour} * * ${config.dayOfWeek}`
      case 'monthly':
        return `${minute} ${hour} ${config.dayOfMonth} * *`
      case 'hourly':
        return `${minute} * * * *`
      default:
        return `${minute} ${hour} * * *`
    }
  }

  const validateCronExpression = (expr) => {
    if (!expr) {
      return { valid: false, message: 'Cron expression is required' }
    }

    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) {
      return { 
        valid: false, 
        message: 'Cron expression must have 5 parts: minute hour day month weekday' 
      }
    }

    const [minute, hour, day, month, weekday] = parts

    // Validate each field
    if (!isValidCronField(minute, 0, 59)) {
      return { valid: false, message: 'Invalid minute field (0-59)' }
    }
    if (!isValidCronField(hour, 0, 23)) {
      return { valid: false, message: 'Invalid hour field (0-23)' }
    }
    if (!isValidCronField(day, 1, 31)) {
      return { valid: false, message: 'Invalid day field (1-31)' }
    }
    if (!isValidCronField(month, 1, 12)) {
      return { valid: false, message: 'Invalid month field (1-12)' }
    }
    if (!isValidCronField(weekday, 0, 7)) {
      return { valid: false, message: 'Invalid weekday field (0-7)' }
    }

    return { valid: true, message: 'Valid cron expression' }
  }

  const isValidCronField = (field, min, max) => {
    if (field === '*') return true
    
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number)
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end
    }
    
    if (field.includes(',')) {
      const values = field.split(',').map(Number)
      return values.every(val => !isNaN(val) && val >= min && val <= max)
    }
    
    if (field.includes('/')) {
      const [base, step] = field.split('/')
      if (base === '*') return !isNaN(Number(step)) && Number(step) > 0
      return isValidCronField(base, min, max) && !isNaN(Number(step)) && Number(step) > 0
    }
    
    const num = Number(field)
    return !isNaN(num) && num >= min && num <= max
  }

  const getCronDescription = (expr) => {
    if (!expr) return 'No schedule configured'
    
    try {
      const parts = expr.split(' ')
      if (parts.length !== 5) return expr
      
      const [minute, hour, day, month, weekday] = parts
      
      // Common patterns
      const patterns = {
        '0 9 * * *': 'Daily at 9:00 AM',
        '0 0 * * *': 'Daily at midnight',
        '0 12 * * *': 'Daily at noon',
        '0 9 * * 1': 'Weekly on Monday at 9:00 AM',
        '0 9 1 * *': 'Monthly on the 1st at 9:00 AM',
        '*/15 * * * *': 'Every 15 minutes',
        '0 */6 * * *': 'Every 6 hours'
      }
      
      if (patterns[expr]) return patterns[expr]
      
      // Generic description
      let desc = 'At '
      if (minute === '0') desc += `${hour}:00`
      else if (minute === '*') desc += `every minute of hour ${hour}`
      else desc += `${hour}:${minute.padStart(2, '0')}`
      
      if (day !== '*') desc += ` on day ${day}`
      if (month !== '*') desc += ` of month ${month}`
      if (weekday !== '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        desc += ` on ${days[parseInt(weekday)] || `weekday ${weekday}`}`
      }
      
      return desc
    } catch {
      return expr
    }
  }

  const handleSimpleConfigChange = (field, value) => {
    const newConfig = { ...simpleConfig, [field]: value }
    setSimpleConfig(newConfig)
    
    const newExpression = buildSimpleExpression(newConfig)
    setAdvancedExpression(newExpression)
    
    const validation = validateCronExpression(newExpression)
    setValidation(validation)
    
    if (validation.valid) {
      onChange(newExpression)
    }
  }

  const handleAdvancedExpressionChange = (expr) => {
    setAdvancedExpression(expr)
    
    const validation = validateCronExpression(expr)
    setValidation(validation)
    
    if (validation.valid) {
      onChange(expr)
      parseExpressionToSimple(expr)
    }
  }

  const commonExpressions = [
    { label: 'Daily at 9:00 AM', value: '0 9 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Daily at noon', value: '0 12 * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Weekly on Monday at 9:00 AM', value: '0 9 * * 1' },
    { label: 'Monthly on the 1st at 9:00 AM', value: '0 9 1 * *' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' },
    { label: 'Every hour', value: '0 * * * *' }
  ]

  const weekdays = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center space-x-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              mode === 'simple' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setMode('advanced')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              mode === 'advanced' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {mode === 'simple' ? (
        <div className="space-y-4">
          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              value={simpleConfig.frequency}
              onChange={(e) => handleSimpleConfigChange('frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>

          {/* Time Selection */}
          {simpleConfig.frequency !== 'hourly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <Input
                type="time"
                value={simpleConfig.time}
                onChange={(e) => handleSimpleConfigChange('time', e.target.value)}
              />
            </div>
          )}

          {/* Day of Week Selection */}
          {simpleConfig.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Week
              </label>
              <select
                value={simpleConfig.dayOfWeek}
                onChange={(e) => handleSimpleConfigChange('dayOfWeek', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {weekdays.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month Selection */}
          {simpleConfig.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Month
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                value={simpleConfig.dayOfMonth}
                onChange={(e) => handleSimpleConfigChange('dayOfMonth', e.target.value)}
              />
            </div>
          )}

          {/* Minute Selection for Hourly */}
          {simpleConfig.frequency === 'hourly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minute
              </label>
              <Input
                type="number"
                min="0"
                max="59"
                value={simpleConfig.time.split(':')[1] || '0'}
                onChange={(e) => handleSimpleConfigChange('time', `00:${e.target.value.padStart(2, '0')}`)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Run at this minute of every hour
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Advanced Cron Expression */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cron Expression
            </label>
            <Input
              type="text"
              value={advancedExpression}
              onChange={(e) => handleAdvancedExpressionChange(e.target.value)}
              placeholder="0 9 * * *"
              className={`font-mono ${!validation.valid ? 'border-red-300' : ''}`}
            />
          </div>

          {/* Common Expressions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Common Expressions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {commonExpressions.map((expr, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAdvancedExpressionChange(expr.value)}
                  className="text-left text-sm p-2 rounded border hover:bg-gray-50 transition-colors"
                >
                  <div className="font-mono text-blue-600">{expr.value}</div>
                  <div className="text-gray-600">{expr.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation and Description */}
      <div className="bg-gray-50 p-3 rounded-md">
        <div className="flex items-start space-x-2">
          {validation.valid ? (
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className={`text-sm font-medium ${validation.valid ? 'text-blue-700' : 'text-red-700'}`}>
              {validation.valid ? 'Valid Expression' : 'Invalid Expression'}
            </p>
            <p className={`text-sm ${validation.valid ? 'text-blue-600' : 'text-red-600'}`}>
              {validation.valid ? getCronDescription(advancedExpression) : validation.message}
            </p>
            {validation.valid && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {advancedExpression}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Format Help */}
      <div className="bg-blue-50 p-3 rounded-md">
        <div className="flex items-start space-x-2">
          <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-700">Cron Format</p>
            <p className="text-xs text-blue-600 font-mono">minute hour day month weekday</p>
            <p className="text-xs text-blue-600 mt-1">
              Use * for any value, ranges (1-5), lists (1,3,5), or steps (*/2)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CronExpressionBuilder