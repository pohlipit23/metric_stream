/**
 * Python Chart Generation Integration
 * Handles chart generation using Python libraries via external service or subprocess
 */

/**
 * Python Chart Generator class
 * Note: Cloudflare Workers don't natively support Python execution
 * This implementation provides integration patterns for Python chart generation
 */
export class PythonChartGenerator {
  constructor(env) {
    this.env = env;
  }

  /**
   * Generate chart using Python matplotlib
   * @param {Object} options - Chart generation options
   * @returns {Object} - Generation result
   */
  async generateMatplotlibChart(options) {
    const { chartType, data, outputFormat, config = {} } = options;

    // Python script template for matplotlib
    const pythonScript = this.generateMatplotlibScript(chartType, data, outputFormat, config);

    try {
      // Option 1: Use external Python service
      if (this.env.PYTHON_SERVICE_URL) {
        return await this.executePythonViaService(pythonScript, outputFormat);
      }

      // Option 2: Use Pyodide (Python in WebAssembly) - if available
      if (typeof pyodide !== 'undefined') {
        return await this.executePythonViaPyodide(pythonScript, outputFormat);
      }

      // Option 3: Fallback to JavaScript implementation
      console.warn('Python execution not available, falling back to JavaScript');
      return { success: false, error: 'Python execution not available' };

    } catch (error) {
      console.error('Python chart generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate chart using Python plotly
   * @param {Object} options - Chart generation options
   * @returns {Object} - Generation result
   */
  async generatePlotlyChart(options) {
    const { chartType, data, outputFormat, config = {} } = options;

    const pythonScript = this.generatePlotlyScript(chartType, data, outputFormat, config);

    try {
      if (this.env.PYTHON_SERVICE_URL) {
        return await this.executePythonViaService(pythonScript, outputFormat);
      }

      return { success: false, error: 'Python execution not available' };

    } catch (error) {
      console.error('Plotly chart generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate matplotlib Python script
   * @param {string} chartType - Chart type
   * @param {Object} data - Chart data
   * @param {string} outputFormat - Output format
   * @param {Object} config - Chart configuration
   * @returns {string} - Python script
   */
  generateMatplotlibScript(chartType, data, outputFormat, config) {
    const timestamps = JSON.stringify(data.timestamps);
    const values = JSON.stringify(data.values);

    let chartSpecificCode = '';
    
    switch (chartType) {
      case 'line':
        chartSpecificCode = `
# Convert timestamps to datetime
dates = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in timestamps]
plt.plot(dates, values, linewidth=2, color='#1f77b4')
plt.xlabel('Time')
plt.ylabel('Value')
plt.title('Time Series Chart')
plt.xticks(rotation=45)
`;
        break;

      case 'candlestick':
        chartSpecificCode = `
# Candlestick chart using matplotlib.finance (if available)
from matplotlib.patches import Rectangle
import matplotlib.patches as mpatches

dates = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in timestamps]
opens = ${JSON.stringify(data.open || [])}
highs = ${JSON.stringify(data.high || [])}
lows = ${JSON.stringify(data.low || [])}
closes = ${JSON.stringify(data.close || [])}

fig, ax = plt.subplots()
for i, (date, o, h, l, c) in enumerate(zip(dates, opens, highs, lows, closes)):
    color = 'green' if c >= o else 'red'
    # High-low line
    ax.plot([i, i], [l, h], color='black', linewidth=1)
    # Body rectangle
    height = abs(c - o)
    bottom = min(o, c)
    rect = Rectangle((i - 0.3, bottom), 0.6, height, facecolor=color, alpha=0.7)
    ax.add_patch(rect)

ax.set_xlabel('Time')
ax.set_ylabel('Price')
ax.set_title('Candlestick Chart')
`;
        break;

      case 'bar':
        chartSpecificCode = `
labels = ${JSON.stringify(data.labels || data.timestamps)}
plt.bar(range(len(values)), values, color='#1f77b4', alpha=0.7)
plt.xlabel('Category')
plt.ylabel('Value')
plt.title('Bar Chart')
if len(labels) <= 20:  # Only show labels if not too many
    plt.xticks(range(len(labels)), labels, rotation=45)
`;
        break;
    }

    return `
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
from datetime import datetime
import json
import base64
import io

# Data
timestamps = ${timestamps}
values = ${values}

# Create figure
plt.figure(figsize=(12, 6))

${chartSpecificCode}

# Styling
plt.grid(True, alpha=0.3)
plt.tight_layout()

# Output
${this.generateOutputCode(outputFormat)}
`;
  }

  /**
   * Generate plotly Python script
   * @param {string} chartType - Chart type
   * @param {Object} data - Chart data
   * @param {string} outputFormat - Output format
   * @param {Object} config - Chart configuration
   * @returns {string} - Python script
   */
  generatePlotlyScript(chartType, data, outputFormat, config) {
    const timestamps = JSON.stringify(data.timestamps);
    const values = JSON.stringify(data.values);

    let chartSpecificCode = '';
    
    switch (chartType) {
      case 'line':
        chartSpecificCode = `
fig = go.Figure()
fig.add_trace(go.Scatter(
    x=timestamps,
    y=values,
    mode='lines+markers',
    name='Value',
    line=dict(color='#1f77b4', width=2)
))
fig.update_layout(
    title='Time Series Chart',
    xaxis_title='Time',
    yaxis_title='Value'
)
`;
        break;

      case 'candlestick':
        chartSpecificCode = `
fig = go.Figure(data=go.Candlestick(
    x=timestamps,
    open=${JSON.stringify(data.open || [])},
    high=${JSON.stringify(data.high || [])},
    low=${JSON.stringify(data.low || [])},
    close=${JSON.stringify(data.close || [])}
))
fig.update_layout(
    title='Candlestick Chart',
    xaxis_title='Time',
    yaxis_title='Price'
)
`;
        break;

      case 'bar':
        chartSpecificCode = `
labels = ${JSON.stringify(data.labels || data.timestamps)}
fig = go.Figure(data=go.Bar(
    x=labels,
    y=values,
    marker_color='#1f77b4'
))
fig.update_layout(
    title='Bar Chart',
    xaxis_title='Category',
    yaxis_title='Value'
)
`;
        break;
    }

    return `
import plotly.graph_objects as go
import plotly.io as pio
import json
import base64

# Data
timestamps = ${timestamps}
values = ${values}

${chartSpecificCode}

# Output
${this.generatePlotlyOutputCode(outputFormat)}
`;
  }

  /**
   * Generate output code for matplotlib
   * @param {string} outputFormat - Output format
   * @returns {string} - Python output code
   */
  generateOutputCode(outputFormat) {
    switch (outputFormat) {
      case 'png':
        return `
# Save to bytes buffer
buffer = io.BytesIO()
plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
buffer.seek(0)
image_data = buffer.getvalue()
buffer.close()

# Encode as base64
result = base64.b64encode(image_data).decode('utf-8')
print(json.dumps({"success": True, "data": result, "format": "png"}))
`;

      case 'svg':
        return `
# Save to bytes buffer
buffer = io.BytesIO()
plt.savefig(buffer, format='svg', bbox_inches='tight')
buffer.seek(0)
svg_data = buffer.getvalue().decode('utf-8')
buffer.close()

print(json.dumps({"success": True, "data": svg_data, "format": "svg"}))
`;

      default:
        return `
print(json.dumps({"success": False, "error": "Unsupported format: ${outputFormat}"}))
`;
    }
  }

  /**
   * Generate output code for plotly
   * @param {string} outputFormat - Output format
   * @returns {string} - Python output code
   */
  generatePlotlyOutputCode(outputFormat) {
    switch (outputFormat) {
      case 'png':
        return `
# Generate PNG
img_bytes = pio.to_image(fig, format='png', width=1200, height=600)
result = base64.b64encode(img_bytes).decode('utf-8')
print(json.dumps({"success": True, "data": result, "format": "png"}))
`;

      case 'svg':
        return `
# Generate SVG
svg_data = pio.to_image(fig, format='svg', width=1200, height=600).decode('utf-8')
print(json.dumps({"success": True, "data": svg_data, "format": "svg"}))
`;

      case 'html':
        return `
# Generate HTML
html_data = pio.to_html(fig, include_plotlyjs='cdn')
print(json.dumps({"success": True, "data": html_data, "format": "html"}))
`;

      default:
        return `
print(json.dumps({"success": False, "error": "Unsupported format: ${outputFormat}"}))
`;
    }
  }

  /**
   * Execute Python script via external service
   * @param {string} script - Python script
   * @param {string} outputFormat - Expected output format
   * @returns {Object} - Execution result
   */
  async executePythonViaService(script, outputFormat) {
    const serviceUrl = this.env.PYTHON_SERVICE_URL;
    
    try {
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.PYTHON_SERVICE_API_KEY}`
        },
        body: JSON.stringify({
          script: script,
          timeout: 30000, // 30 second timeout
          requirements: ['matplotlib', 'plotly', 'pandas', 'numpy']
        })
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          format: outputFormat
        };
      } else {
        throw new Error(result.error || 'Python execution failed');
      }

    } catch (error) {
      console.error('Python service execution error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute Python script via Pyodide (WebAssembly)
   * @param {string} script - Python script
   * @param {string} outputFormat - Expected output format
   * @returns {Object} - Execution result
   */
  async executePythonViaPyodide(script, outputFormat) {
    try {
      // This would require Pyodide to be loaded
      // Note: Pyodide is quite large and may not be suitable for Workers
      
      // Install required packages
      await pyodide.loadPackage(['matplotlib', 'plotly']);
      
      // Execute script
      const result = pyodide.runPython(script);
      
      return {
        success: true,
        data: result,
        format: outputFormat
      };

    } catch (error) {
      console.error('Pyodide execution error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Python Chart Service Configuration
 * Example configuration for external Python chart generation service
 */
export const PYTHON_CHART_SERVICE_CONFIG = {
  // Example service endpoints
  services: {
    matplotlib: {
      url: 'https://python-charts.example.com/matplotlib',
      timeout: 30000,
      maxDataPoints: 10000
    },
    plotly: {
      url: 'https://python-charts.example.com/plotly',
      timeout: 30000,
      maxDataPoints: 50000
    }
  },
  
  // Required Python packages
  requirements: [
    'matplotlib>=3.5.0',
    'plotly>=5.0.0',
    'pandas>=1.3.0',
    'numpy>=1.21.0'
  ],
  
  // Chart generation limits
  limits: {
    maxWidth: 2000,
    maxHeight: 1500,
    maxDataPoints: 50000,
    timeoutMs: 30000
  }
};