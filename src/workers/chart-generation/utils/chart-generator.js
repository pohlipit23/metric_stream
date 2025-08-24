/**
 * Chart Generation Utilities
 * Supports multiple chart types and output formats
 */

import { DataProcessor } from './data-processing.js';

/**
 * Chart Generator class
 */
export class ChartGenerator {
  constructor(env) {
    this.env = env;
    this.dataProcessor = new DataProcessor({
      maxDataPoints: 10000,
      samplingStrategy: 'adaptive'
    });
  }

  /**
   * Generate chart based on type and format
   * @param {Object} options - Chart generation options
   * @returns {Object} - Generation result
   */
  async generateChart(options) {
    const { kpiId, chartType, outputFormat, data } = options;

    try {
      // Validate data
      if (!data || !data.timestamps || !data.values) {
        throw new Error('Invalid data structure');
      }

      // Process large datasets for optimal chart generation
      const processingResult = await this.dataProcessor.processTimeSeriesData(data, {
        chartType,
        outputFormat,
        targetWidth: 1200
      });

      if (!processingResult.success) {
        throw new Error(`Data processing failed: ${processingResult.error}`);
      }

      const processedData = processingResult.data;

      // Generate chart based on type
      let chartResult;
      switch (chartType) {
        case 'line':
          chartResult = await this.generateLineChart(processedData, outputFormat);
          break;
        case 'candlestick':
          chartResult = await this.generateCandlestickChart(processedData, outputFormat);
          break;
        case 'bar':
          chartResult = await this.generateBarChart(processedData, outputFormat);
          break;
        default:
          throw new Error(`Unsupported chart type: ${chartType}`);
      }

      return {
        success: true,
        data: chartResult,
        metadata: {
          chartType,
          outputFormat,
          originalDataPoints: data.timestamps.length,
          processedDataPoints: processedData.timestamps.length,
          dataProcessed: processingResult.processed,
          compressionRatio: processingResult.compressionRatio
        }
      };

    } catch (error) {
      console.error('Chart generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate line chart
   * @param {Object} data - Time series data
   * @param {string} outputFormat - Output format (png, svg, html)
   * @returns {string|Buffer} - Chart data
   */
  async generateLineChart(data, outputFormat) {
    switch (outputFormat) {
      case 'html':
        return this.generateLineChartHTML(data);
      case 'svg':
        return this.generateLineChartSVG(data);
      case 'png':
        return await this.generateLineChartPNG(data);
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
  }

  /**
   * Generate candlestick chart
   * @param {Object} data - OHLC data
   * @param {string} outputFormat - Output format
   * @returns {string|Buffer} - Chart data
   */
  async generateCandlestickChart(data, outputFormat) {
    // Validate OHLC data structure
    if (!this.isOHLCData(data)) {
      throw new Error('Candlestick charts require OHLC data (open, high, low, close)');
    }

    switch (outputFormat) {
      case 'html':
        return this.generateCandlestickChartHTML(data);
      case 'svg':
        return this.generateCandlestickChartSVG(data);
      case 'png':
        return await this.generateCandlestickChartPNG(data);
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
  }

  /**
   * Generate bar chart
   * @param {Object} data - Categorical data
   * @param {string} outputFormat - Output format
   * @returns {string|Buffer} - Chart data
   */
  async generateBarChart(data, outputFormat) {
    switch (outputFormat) {
      case 'html':
        return this.generateBarChartHTML(data);
      case 'svg':
        return this.generateBarChartSVG(data);
      case 'png':
        return await this.generateBarChartPNG(data);
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
  }

  /**
   * Generate interactive HTML line chart
   * @param {Object} data - Time series data
   * @returns {string} - HTML chart
   */
  generateLineChartHTML(data) {
    const chartData = data.timestamps.map((timestamp, index) => ({
      x: timestamp,
      y: data.values[index]
    }));

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Line Chart</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        #chart { width: 100%; height: 500px; }
    </style>
</head>
<body>
    <div id="chart"></div>
    <script>
        const data = [{
            x: ${JSON.stringify(data.timestamps)},
            y: ${JSON.stringify(data.values)},
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Value',
            line: { color: '#1f77b4', width: 2 },
            marker: { size: 4 }
        }];
        
        const layout = {
            title: 'Time Series Chart',
            xaxis: { title: 'Time', type: 'date' },
            yaxis: { title: 'Value' },
            margin: { l: 50, r: 50, t: 50, b: 50 },
            showlegend: false
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d']
        };
        
        Plotly.newPlot('chart', data, layout, config);
    </script>
</body>
</html>`;
  }

  /**
   * Generate SVG line chart
   * @param {Object} data - Time series data
   * @returns {string} - SVG chart
   */
  generateLineChartSVG(data) {
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate scales
    const minValue = Math.min(...data.values);
    const maxValue = Math.max(...data.values);
    const valueRange = maxValue - minValue || 1;

    const minTime = new Date(Math.min(...data.timestamps.map(t => new Date(t).getTime())));
    const maxTime = new Date(Math.max(...data.timestamps.map(t => new Date(t).getTime())));
    const timeRange = maxTime.getTime() - minTime.getTime() || 1;

    // Generate path
    const pathData = data.timestamps.map((timestamp, index) => {
      const x = margin.left + ((new Date(timestamp).getTime() - minTime.getTime()) / timeRange) * chartWidth;
      const y = margin.top + chartHeight - ((data.values[index] - minValue) / valueRange) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <style>
            .chart-line { fill: none; stroke: #1f77b4; stroke-width: 2; }
            .axis-line { stroke: #333; stroke-width: 1; }
            .axis-text { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
            .title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #333; }
        </style>
    </defs>
    
    <!-- Chart area background -->
    <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#f9f9f9" stroke="#ddd"/>
    
    <!-- Chart line -->
    <path d="${pathData}" class="chart-line"/>
    
    <!-- X-axis -->
    <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" class="axis-line"/>
    
    <!-- Y-axis -->
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" class="axis-line"/>
    
    <!-- Title -->
    <text x="${width / 2}" y="15" text-anchor="middle" class="title">Time Series Chart</text>
    
    <!-- Y-axis labels -->
    <text x="15" y="${margin.top + 5}" class="axis-text">${maxValue.toFixed(2)}</text>
    <text x="15" y="${height - margin.bottom - 5}" class="axis-text">${minValue.toFixed(2)}</text>
</svg>`;
  }

  /**
   * Generate PNG line chart (placeholder - would use external service or Python)
   * @param {Object} data - Time series data
   * @returns {Buffer} - PNG data
   */
  async generateLineChartPNG(data) {
    // For PNG generation, we would typically use:
    // 1. External service like chart-img.com
    // 2. Python with matplotlib (if available)
    // 3. Canvas API (if available in Workers)
    
    // For now, return a placeholder or use external service
    return await this.generateChartViaExternalService(data, 'line', 'png');
  }

  /**
   * Generate candlestick chart HTML
   * @param {Object} data - OHLC data
   * @returns {string} - HTML chart
   */
  generateCandlestickChartHTML(data) {
    const candlestickData = data.timestamps.map((timestamp, index) => ({
      x: timestamp,
      open: data.open[index],
      high: data.high[index],
      low: data.low[index],
      close: data.close[index]
    }));

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Candlestick Chart</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        #chart { width: 100%; height: 500px; }
    </style>
</head>
<body>
    <div id="chart"></div>
    <script>
        const data = [{
            x: ${JSON.stringify(data.timestamps)},
            open: ${JSON.stringify(data.open)},
            high: ${JSON.stringify(data.high)},
            low: ${JSON.stringify(data.low)},
            close: ${JSON.stringify(data.close)},
            type: 'candlestick',
            name: 'OHLC'
        }];
        
        const layout = {
            title: 'Candlestick Chart',
            xaxis: { title: 'Time', type: 'date' },
            yaxis: { title: 'Price' },
            margin: { l: 50, r: 50, t: 50, b: 50 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true
        };
        
        Plotly.newPlot('chart', data, layout, config);
    </script>
</body>
</html>`;
  }

  /**
   * Generate bar chart HTML
   * @param {Object} data - Categorical data
   * @returns {string} - HTML chart
   */
  generateBarChartHTML(data) {
    // For bar charts, we expect labels and values
    const labels = data.labels || data.timestamps;
    const values = data.values;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Bar Chart</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        #chart { width: 100%; height: 500px; }
    </style>
</head>
<body>
    <div id="chart"></div>
    <script>
        const data = [{
            x: ${JSON.stringify(labels)},
            y: ${JSON.stringify(values)},
            type: 'bar',
            name: 'Values',
            marker: { color: '#1f77b4' }
        }];
        
        const layout = {
            title: 'Bar Chart',
            xaxis: { title: 'Category' },
            yaxis: { title: 'Value' },
            margin: { l: 50, r: 50, t: 50, b: 50 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true
        };
        
        Plotly.newPlot('chart', data, layout, config);
    </script>
</body>
</html>`;
  }

  /**
   * Generate chart via external service
   * @param {Object} data - Chart data
   * @param {string} chartType - Chart type
   * @param {string} format - Output format
   * @returns {Buffer} - Chart data
   */
  async generateChartViaExternalService(data, chartType, format) {
    // Placeholder for external service integration
    // This would integrate with services like chart-img.com or similar
    
    const serviceUrl = 'https://chart-img.com/api/generate';
    const payload = {
      type: chartType,
      format: format,
      data: {
        labels: data.timestamps,
        datasets: [{
          data: data.values,
          borderColor: '#1f77b4',
          backgroundColor: 'rgba(31, 119, 180, 0.1)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { type: 'time' },
          y: { beginAtZero: false }
        }
      }
    };

    try {
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.EXTERNAL_CHART_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`External service error: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('External chart service error:', error);
      // Return a simple placeholder image or throw error
      throw new Error('Chart generation service unavailable');
    }
  }

  /**
   * Generate candlestick chart SVG (placeholder)
   * @param {Object} data - OHLC data
   * @returns {string} - SVG chart
   */
  generateCandlestickChartSVG(data) {
    // Simplified candlestick SVG implementation
    return `<svg width="800" height="400"><text x="400" y="200" text-anchor="middle">Candlestick Chart (SVG implementation needed)</text></svg>`;
  }

  /**
   * Generate bar chart SVG (placeholder)
   * @param {Object} data - Bar data
   * @returns {string} - SVG chart
   */
  generateBarChartSVG(data) {
    // Simplified bar chart SVG implementation
    return `<svg width="800" height="400"><text x="400" y="200" text-anchor="middle">Bar Chart (SVG implementation needed)</text></svg>`;
  }

  /**
   * Generate candlestick chart PNG (placeholder)
   * @param {Object} data - OHLC data
   * @returns {Buffer} - PNG data
   */
  async generateCandlestickChartPNG(data) {
    return await this.generateChartViaExternalService(data, 'candlestick', 'png');
  }

  /**
   * Generate bar chart PNG (placeholder)
   * @param {Object} data - Bar data
   * @returns {Buffer} - PNG data
   */
  async generateBarChartPNG(data) {
    return await this.generateChartViaExternalService(data, 'bar', 'png');
  }

  /**
   * Check if data is OHLC format
   * @param {Object} data - Data to check
   * @returns {boolean} - True if OHLC format
   */
  isOHLCData(data) {
    return data.open && data.high && data.low && data.close &&
           Array.isArray(data.open) && Array.isArray(data.high) &&
           Array.isArray(data.low) && Array.isArray(data.close);
  }
}