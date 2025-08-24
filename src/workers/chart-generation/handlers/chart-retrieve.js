/**
 * Chart Retrieval Handler
 * Handles retrieving generated charts by ID
 */

import { retrieveChart } from '../utils/storage.js';

/**
 * Handle chart retrieval request
 * @param {string} chartId - Chart ID to retrieve
 * @param {Object} env - Environment bindings
 * @returns {Response} - Chart retrieval response
 */
export async function handleChartRetrieve(chartId, env) {
  try {
    if (!chartId || chartId === 'undefined') {
      return new Response(JSON.stringify({ 
        error: 'Chart ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve chart from storage
    const result = await retrieveChart(env, chartId);

    if (!result.success) {
      return new Response(JSON.stringify({ 
        error: result.error || 'Chart not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If we have the actual chart data, return it
    if (result.data) {
      return new Response(result.data, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400', // 24 hours
          'X-Chart-ID': chartId,
          'X-Chart-Type': result.metadata.chartType,
          'X-Chart-Format': result.metadata.outputFormat
        }
      });
    }

    // If we only have metadata with public URL, redirect or return metadata
    if (result.publicUrl) {
      return new Response(JSON.stringify({
        success: true,
        chartId,
        publicUrl: result.publicUrl,
        metadata: result.metadata
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Chart data not available' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chart retrieval error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}