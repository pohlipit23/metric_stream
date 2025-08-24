/**
 * Data Processing Utilities for Large Time Series Datasets
 * Handles efficient processing, sampling, and optimization for chart generation
 */

/**
 * Data Processor class for handling large datasets
 */
export class DataProcessor {
  constructor(options = {}) {
    this.maxDataPoints = options.maxDataPoints || 10000;
    this.samplingStrategy = options.samplingStrategy || 'adaptive';
    this.compressionThreshold = options.compressionThreshold || 50000;
  }

  /**
   * Process large time series data for chart generation
   * @param {Object} data - Time series data
   * @param {Object} options - Processing options
   * @returns {Object} - Processed data
   */
  async processTimeSeriesData(data, options = {}) {
    try {
      const { chartType, outputFormat, targetWidth = 1200 } = options;
      
      // Validate input data
      if (!this.validateTimeSeriesData(data)) {
        throw new Error('Invalid time series data structure');
      }

      const dataPoints = data.timestamps.length;
      
      // If data is small enough, return as-is
      if (dataPoints <= this.maxDataPoints) {
        return {
          success: true,
          data: data,
          processed: false,
          originalPoints: dataPoints,
          finalPoints: dataPoints
        };
      }

      // Process large dataset
      const processedData = await this.optimizeDataset(data, {
        chartType,
        outputFormat,
        targetWidth,
        maxPoints: this.maxDataPoints
      });

      return {
        success: true,
        data: processedData,
        processed: true,
        originalPoints: dataPoints,
        finalPoints: processedData.timestamps.length,
        compressionRatio: dataPoints / processedData.timestamps.length
      };

    } catch (error) {
      console.error('Data processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Optimize dataset for chart generation
   * @param {Object} data - Original data
   * @param {Object} options - Optimization options
   * @returns {Object} - Optimized data
   */
  async optimizeDataset(data, options) {
    const { chartType, maxPoints, targetWidth } = options;

    // Choose optimization strategy based on chart type
    switch (chartType) {
      case 'line':
        return this.optimizeLineChartData(data, maxPoints, targetWidth);
      case 'candlestick':
        return this.optimizeCandlestickData(data, maxPoints);
      case 'bar':
        return this.optimizeBarChartData(data, maxPoints);
      default:
        return this.adaptiveSampling(data, maxPoints);
    }
  }

  /**
   * Optimize data for line charts using adaptive sampling
   * @param {Object} data - Time series data
   * @param {number} maxPoints - Maximum points to keep
   * @param {number} targetWidth - Target chart width in pixels
   * @returns {Object} - Optimized data
   */
  optimizeLineChartData(data, maxPoints, targetWidth) {
    // Calculate optimal point density based on chart width
    const optimalPoints = Math.min(maxPoints, targetWidth * 2); // 2 points per pixel max
    
    if (data.timestamps.length <= optimalPoints) {
      return data;
    }

    // Use LTTB (Largest Triangle Three Buckets) algorithm for optimal visual sampling
    return this.largestTriangleThreeBuckets(data, optimalPoints);
  }

  /**
   * Optimize candlestick data by aggregating periods
   * @param {Object} data - OHLC data
   * @param {number} maxPoints - Maximum points to keep
   * @returns {Object} - Optimized data
   */
  optimizeCandlestickData(data, maxPoints) {
    if (!this.isOHLCData(data)) {
      throw new Error('Invalid OHLC data for candlestick optimization');
    }

    if (data.timestamps.length <= maxPoints) {
      return data;
    }

    // Aggregate candlesticks into larger time periods
    const aggregationFactor = Math.ceil(data.timestamps.length / maxPoints);
    return this.aggregateOHLCData(data, aggregationFactor);
  }

  /**
   * Optimize bar chart data by grouping categories
   * @param {Object} data - Bar chart data
   * @param {number} maxPoints - Maximum points to keep
   * @returns {Object} - Optimized data
   */
  optimizeBarChartData(data, maxPoints) {
    if (data.values.length <= maxPoints) {
      return data;
    }

    // Group smaller categories into "Others" category
    return this.groupSmallCategories(data, maxPoints);
  }

  /**
   * Largest Triangle Three Buckets (LTTB) algorithm for time series downsampling
   * @param {Object} data - Time series data
   * @param {number} threshold - Target number of points
   * @returns {Object} - Downsampled data
   */
  largestTriangleThreeBuckets(data, threshold) {
    const { timestamps, values, metadata = [] } = data;
    const dataLength = timestamps.length;

    if (threshold >= dataLength || threshold === 0) {
      return data;
    }

    const sampled = {
      timestamps: [],
      values: [],
      metadata: []
    };

    // Bucket size
    const every = (dataLength - 2) / (threshold - 2);

    // Initially add the first point
    sampled.timestamps.push(timestamps[0]);
    sampled.values.push(values[0]);
    if (metadata.length > 0) sampled.metadata.push(metadata[0]);

    let a = 0; // Initially a is the first point in the triangle

    for (let i = 0; i < threshold - 2; i++) {
      // Calculate point average for next bucket (containing c)
      let avgX = 0;
      let avgY = 0;
      let avgRangeStart = Math.floor((i + 1) * every) + 1;
      let avgRangeEnd = Math.floor((i + 2) * every) + 1;
      avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

      const avgRangeLength = avgRangeEnd - avgRangeStart;

      for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
        avgX += new Date(timestamps[avgRangeStart]).getTime();
        avgY += values[avgRangeStart];
      }
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;

      // Get the range for this bucket
      let rangeOffs = Math.floor((i + 0) * every) + 1;
      const rangeTo = Math.floor((i + 1) * every) + 1;

      // Point a
      const pointAX = new Date(timestamps[a]).getTime();
      const pointAY = values[a];

      let maxArea = -1;
      let maxAreaPoint = rangeOffs;

      for (; rangeOffs < rangeTo; rangeOffs++) {
        // Calculate triangle area over three buckets
        const pointBX = new Date(timestamps[rangeOffs]).getTime();
        const pointBY = values[rangeOffs];

        const area = Math.abs(
          (pointAX - avgX) * (pointBY - pointAY) - (pointAX - pointBX) * (avgY - pointAY)
        ) * 0.5;

        if (area > maxArea) {
          maxArea = area;
          maxAreaPoint = rangeOffs;
        }
      }

      // Pick this point from the bucket
      sampled.timestamps.push(timestamps[maxAreaPoint]);
      sampled.values.push(values[maxAreaPoint]);
      if (metadata.length > 0) sampled.metadata.push(metadata[maxAreaPoint]);

      a = maxAreaPoint; // This a is the next a (chosen b)
    }

    // Always add the last point
    sampled.timestamps.push(timestamps[dataLength - 1]);
    sampled.values.push(values[dataLength - 1]);
    if (metadata.length > 0) sampled.metadata.push(metadata[dataLength - 1]);

    return sampled;
  }

  /**
   * Adaptive sampling based on data variance
   * @param {Object} data - Time series data
   * @param {number} maxPoints - Maximum points to keep
   * @returns {Object} - Sampled data
   */
  adaptiveSampling(data, maxPoints) {
    const { timestamps, values, metadata = [] } = data;
    
    if (timestamps.length <= maxPoints) {
      return data;
    }

    // Calculate variance for each segment
    const segmentSize = Math.ceil(timestamps.length / maxPoints);
    const sampled = {
      timestamps: [],
      values: [],
      metadata: []
    };

    for (let i = 0; i < timestamps.length; i += segmentSize) {
      const segmentEnd = Math.min(i + segmentSize, timestamps.length);
      const segment = values.slice(i, segmentEnd);
      
      // Find the most representative point in this segment
      const representativeIndex = this.findRepresentativePoint(segment, i);
      
      sampled.timestamps.push(timestamps[representativeIndex]);
      sampled.values.push(values[representativeIndex]);
      if (metadata.length > 0) sampled.metadata.push(metadata[representativeIndex]);
    }

    return sampled;
  }

  /**
   * Aggregate OHLC data into larger time periods
   * @param {Object} data - OHLC data
   * @param {number} factor - Aggregation factor
   * @returns {Object} - Aggregated data
   */
  aggregateOHLCData(data, factor) {
    const { timestamps, open, high, low, close } = data;
    const aggregated = {
      timestamps: [],
      open: [],
      high: [],
      low: [],
      close: []
    };

    for (let i = 0; i < timestamps.length; i += factor) {
      const segmentEnd = Math.min(i + factor, timestamps.length);
      
      // Use the first timestamp of the period
      aggregated.timestamps.push(timestamps[i]);
      
      // Open: first value of the period
      aggregated.open.push(open[i]);
      
      // High: maximum value in the period
      let maxHigh = high[i];
      for (let j = i + 1; j < segmentEnd; j++) {
        maxHigh = Math.max(maxHigh, high[j]);
      }
      aggregated.high.push(maxHigh);
      
      // Low: minimum value in the period
      let minLow = low[i];
      for (let j = i + 1; j < segmentEnd; j++) {
        minLow = Math.min(minLow, low[j]);
      }
      aggregated.low.push(minLow);
      
      // Close: last value of the period
      aggregated.close.push(close[segmentEnd - 1]);
    }

    return aggregated;
  }

  /**
   * Group small categories in bar chart data
   * @param {Object} data - Bar chart data
   * @param {number} maxCategories - Maximum categories to keep
   * @returns {Object} - Grouped data
   */
  groupSmallCategories(data, maxCategories) {
    const { labels, values } = data;
    
    // Sort by value to keep the largest categories
    const indexed = labels.map((label, index) => ({
      label,
      value: values[index],
      index
    }));
    
    indexed.sort((a, b) => b.value - a.value);
    
    const grouped = {
      labels: [],
      values: []
    };
    
    let othersValue = 0;
    
    for (let i = 0; i < indexed.length; i++) {
      if (i < maxCategories - 1) {
        grouped.labels.push(indexed[i].label);
        grouped.values.push(indexed[i].value);
      } else {
        othersValue += indexed[i].value;
      }
    }
    
    if (othersValue > 0) {
      grouped.labels.push('Others');
      grouped.values.push(othersValue);
    }
    
    return grouped;
  }

  /**
   * Find representative point in a segment
   * @param {Array} segment - Data segment
   * @param {number} offset - Offset in original array
   * @returns {number} - Index of representative point
   */
  findRepresentativePoint(segment, offset) {
    if (segment.length === 1) return offset;
    
    // Find point with maximum deviation from mean
    const mean = segment.reduce((sum, val) => sum + val, 0) / segment.length;
    let maxDeviation = 0;
    let maxIndex = 0;
    
    for (let i = 0; i < segment.length; i++) {
      const deviation = Math.abs(segment[i] - mean);
      if (deviation > maxDeviation) {
        maxDeviation = deviation;
        maxIndex = i;
      }
    }
    
    return offset + maxIndex;
  }

  /**
   * Validate time series data structure
   * @param {Object} data - Data to validate
   * @returns {boolean} - True if valid
   */
  validateTimeSeriesData(data) {
    return data && 
           Array.isArray(data.timestamps) && 
           Array.isArray(data.values) &&
           data.timestamps.length === data.values.length &&
           data.timestamps.length > 0;
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

  /**
   * Get processing statistics
   * @param {Object} originalData - Original data
   * @param {Object} processedData - Processed data
   * @returns {Object} - Processing statistics
   */
  getProcessingStats(originalData, processedData) {
    const originalSize = originalData.timestamps.length;
    const processedSize = processedData.timestamps.length;
    
    return {
      originalDataPoints: originalSize,
      processedDataPoints: processedSize,
      compressionRatio: originalSize / processedSize,
      reductionPercentage: ((originalSize - processedSize) / originalSize) * 100,
      estimatedMemorySaving: this.estimateMemorySaving(originalSize, processedSize)
    };
  }

  /**
   * Estimate memory saving from data reduction
   * @param {number} originalSize - Original data size
   * @param {number} processedSize - Processed data size
   * @returns {string} - Memory saving estimate
   */
  estimateMemorySaving(originalSize, processedSize) {
    // Rough estimate: each data point = ~50 bytes (timestamp + value + metadata)
    const bytesPerPoint = 50;
    const originalBytes = originalSize * bytesPerPoint;
    const processedBytes = processedSize * bytesPerPoint;
    const savedBytes = originalBytes - processedBytes;
    
    if (savedBytes < 1024) {
      return `${savedBytes} bytes`;
    } else if (savedBytes < 1024 * 1024) {
      return `${(savedBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(savedBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
}