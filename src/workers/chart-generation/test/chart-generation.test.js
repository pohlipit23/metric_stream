/**
 * Chart Generation Worker Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChartGenerator } from '../utils/chart-generator.js';
import { validateChartRequest, validateBatchChartRequest } from '../utils/validation.js';
import { DataProcessor } from '../utils/data-processing.js';

describe('Chart Generation Worker', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = {
      TIMESERIES_KV: {
        get: async (key, type) => {
          if (key === 'timeseries:btc-price') {
            return {
              timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', '2024-01-01T02:00:00Z'],
              values: [45000, 45100, 44900]
            };
          }
          return null;
        }
      },
      CHARTS_KV: {
        put: async () => {},
        get: async () => null
      },
      CHARTS_BUCKET: {
        put: async () => {},
        get: async () => null
      }
    };
  });

  describe('Request Validation', () => {
    it('should validate valid chart request', () => {
      const request = {
        kpiId: 'btc-price',
        chartType: 'line',
        outputFormat: 'png'
      };

      const result = validateChartRequest(request);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid chart type', () => {
      const request = {
        kpiId: 'btc-price',
        chartType: 'invalid',
        outputFormat: 'png'
      };

      const result = validateChartRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('chartType must be one of: line, candlestick, bar');
    });

    it('should reject invalid output format', () => {
      const request = {
        kpiId: 'btc-price',
        chartType: 'line',
        outputFormat: 'invalid'
      };

      const result = validateChartRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('outputFormat must be one of: png, svg, html');
    });

    it('should validate batch request', () => {
      const request = {
        charts: [
          {
            kpiId: 'btc-price',
            chartType: 'line',
            outputFormat: 'png'
          }
        ]
      };

      const result = validateBatchChartRequest(request);
      expect(result.valid).toBe(true);
    });
  });

  describe('Chart Generator', () => {
    it('should generate line chart HTML', async () => {
      const generator = new ChartGenerator(mockEnv);
      const data = {
        timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
        values: [45000, 45100]
      };

      const result = await generator.generateChart({
        kpiId: 'btc-price',
        chartType: 'line',
        outputFormat: 'html',
        data
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('<html>');
      expect(result.data).toContain('Plotly.newPlot');
    });

    it('should generate line chart SVG', async () => {
      const generator = new ChartGenerator(mockEnv);
      const data = {
        timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
        values: [45000, 45100]
      };

      const result = await generator.generateChart({
        kpiId: 'btc-price',
        chartType: 'line',
        outputFormat: 'svg',
        data
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('<svg');
      expect(result.data).toContain('</svg>');
    });

    it('should handle invalid data', async () => {
      const generator = new ChartGenerator(mockEnv);
      const data = {
        timestamps: [],
        values: []
      };

      const result = await generator.generateChart({
        kpiId: 'btc-price',
        chartType: 'line',
        outputFormat: 'html',
        data
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data structure');
    });
  });

  describe('Data Processing', () => {
    it('should process small datasets without modification', async () => {
      const processor = new DataProcessor();
      const data = {
        timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
        values: [45000, 45100]
      };

      const result = await processor.processTimeSeriesData(data);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
      expect(result.data).toEqual(data);
    });

    it('should process large datasets with sampling', async () => {
      const processor = new DataProcessor({ maxDataPoints: 5 });
      
      // Generate large dataset
      const data = {
        timestamps: [],
        values: []
      };
      
      for (let i = 0; i < 100; i++) {
        data.timestamps.push(new Date(Date.now() + i * 60000).toISOString());
        data.values.push(45000 + Math.random() * 1000);
      }

      const result = await processor.processTimeSeriesData(data);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.finalPoints).toBeLessThanOrEqual(5);
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    it('should validate time series data', () => {
      const processor = new DataProcessor();
      
      const validData = {
        timestamps: ['2024-01-01T00:00:00Z'],
        values: [45000]
      };
      
      const invalidData = {
        timestamps: ['2024-01-01T00:00:00Z'],
        values: [45000, 45100] // Mismatched lengths
      };

      expect(processor.validateTimeSeriesData(validData)).toBe(true);
      expect(processor.validateTimeSeriesData(invalidData)).toBe(false);
    });
  });

  describe('LTTB Algorithm', () => {
    it('should downsample data using LTTB', () => {
      const processor = new DataProcessor();
      
      // Generate test data
      const data = {
        timestamps: [],
        values: []
      };
      
      for (let i = 0; i < 1000; i++) {
        data.timestamps.push(new Date(Date.now() + i * 60000).toISOString());
        data.values.push(Math.sin(i / 100) * 1000 + 45000);
      }

      const result = processor.largestTriangleThreeBuckets(data, 100);
      
      expect(result.timestamps).toHaveLength(100);
      expect(result.values).toHaveLength(100);
      expect(result.timestamps[0]).toBe(data.timestamps[0]); // First point preserved
      expect(result.timestamps[99]).toBe(data.timestamps[999]); // Last point preserved
    });
  });
});