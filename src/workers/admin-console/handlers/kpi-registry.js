/**
 * KPI Registry Management Handler
 * Handles CRUD operations for KPI registry entries
 */

import { addCorsHeaders } from '../middleware/cors.js';
import { validateKPIRegistryEntry, generateKPIId } from '../utils/validation.js';
import { KVOperations } from '../utils/kv-operations.js';

/**
 * Handles all KPI-related API endpoints
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} user - Authenticated user information
 * @returns {Response} API response
 */
export async function handleKPIEndpoints(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    let response;

    if (path === '/api/kpis' && method === 'GET') {
      response = await listKPIs(env);
    } else if (path === '/api/kpis' && method === 'POST') {
      response = await createKPI(request, env, user);
    } else if (path.match(/^\/api\/kpis\/[^\/]+$/) && method === 'GET') {
      const kpiId = path.split('/').pop();
      response = await getKPI(kpiId, env);
    } else if (path.match(/^\/api\/kpis\/[^\/]+$/) && method === 'PUT') {
      const kpiId = path.split('/').pop();
      response = await updateKPI(kpiId, request, env, user);
    } else if (path.match(/^\/api\/kpis\/[^\/]+$/) && method === 'DELETE') {
      const kpiId = path.split('/').pop();
      response = await deleteKPI(kpiId, env, user);
    } else if (path.match(/^\/api\/kpis\/[^\/]+\/import$/) && method === 'POST') {
      const kpiId = path.split('/')[3]; // Extract KPI ID from path
      response = await importHistoricalData(kpiId, request, env, user);
    } else if (path.match(/^\/api\/kpis\/[^\/]+\/sample-csv$/) && method === 'GET') {
      const kpiId = path.split('/')[3]; // Extract KPI ID from path
      response = await generateSampleCSV(kpiId, env);
    } else if (path === '/api/kpis/migrate' && method === 'POST') {
      response = await migrateKPIData(env);
    } else {
      response = new Response(JSON.stringify({ error: 'KPI endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return addCorsHeaders(response);

  } catch (error) {
    console.error('KPI endpoint error:', error);
    const errorResponse = new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    return addCorsHeaders(errorResponse);
  }
}

/**
 * List all KPI registry entries
 */
async function listKPIs(env) {
  try {
    // Use KVOperations to list KPIs from individual entries
    const kpis = await KVOperations.listKPIs(env.CONFIG_KV);
    
    // Convert to the expected format for the UI
    const formattedKPIs = kpis.map(kpi => ({
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      type: kpi.type,
      active: kpi.active,
      webhookUrl: kpi.webhook_url, // Convert snake_case to camelCase for UI
      analysisConfig: kpi.analysis_config || {},
      metadata: {
        ...kpi.metadata,
        created: kpi.created_at,
        lastModified: kpi.updated_at,
        source: kpi.metadata?.source || 'unknown',
        category: kpi.type
      }
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: formattedKPIs,
      count: formattedKPIs.length,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0-development',
        totalKPIs: formattedKPIs.length,
        activeKPIs: formattedKPIs.filter(kpi => kpi.active).length,
        environment: 'development',
        testingPhase: 'comprehensive-end-to-end'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing KPIs:', error);
    return new Response(JSON.stringify({
      error: 'Failed to list KPIs',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Create a new KPI registry entry
 */
async function createKPI(request, env, user) {
  try {
    const kpiData = await request.json();
    
    // Validate the KPI data
    const validation = validateKPIRegistryEntry(kpiData);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique KPI ID
    const kpiId = generateKPIId(kpiData.name);
    
    // Check if KPI with this ID already exists
    const existing = await KVOperations.getKPI(env.CONFIG_KV, kpiId);
    if (existing) {
      return new Response(JSON.stringify({
        error: 'KPI with this name already exists',
        existingId: kpiId
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create KPI entry
    const kpi = {
      id: kpiId,
      name: kpiData.name,
      description: kpiData.description,
      webhook_url: kpiData.webhook_url,
      analysis_config: kpiData.analysis_config || {},
      active: kpiData.active !== false, // Default to true
      created_at: new Date().toISOString(),
      created_by: user.email,
      updated_at: new Date().toISOString(),
      updated_by: user.email
    };

    // Store in KV
    await KVOperations.saveKPI(env.CONFIG_KV, kpiId, kpi);

    return new Response(JSON.stringify({
      success: true,
      data: kpi
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating KPI:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create KPI',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get a specific KPI by ID
 */
async function getKPI(kpiId, env) {
  try {
    const kpi = await KVOperations.getKPI(env.CONFIG_KV, kpiId);
    
    if (!kpi) {
      return new Response(JSON.stringify({
        error: 'KPI not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: kpi
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting KPI:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get KPI',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update an existing KPI
 */
async function updateKPI(kpiId, request, env, user) {
  try {
    const updateData = await request.json();
    
    // Get existing KPI
    const existingKPI = await KVOperations.getKPI(env.CONFIG_KV, kpiId);
    if (!existingKPI) {
      return new Response(JSON.stringify({
        error: 'KPI not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate update data
    const validation = validateKPIRegistryEntry(updateData, true); // Allow partial updates
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert UI format to storage format
    const storageUpdateData = {
      name: updateData.name,
      description: updateData.description,
      webhook_url: updateData.webhookUrl, // Convert camelCase to snake_case
      analysis_config: updateData.analysisConfig || updateData.analysis_config,
      active: updateData.active,
      type: updateData.type
    };

    // Update KPI
    const updatedKPI = {
      ...existingKPI,
      ...storageUpdateData,
      id: kpiId, // Ensure ID doesn't change
      created_at: existingKPI.created_at, // Preserve creation info
      created_by: existingKPI.created_by,
      updated_at: new Date().toISOString(),
      updated_by: user?.email || 'anonymous'
    };

    // Store updated KPI
    await KVOperations.saveKPI(env.CONFIG_KV, kpiId, updatedKPI);

    // Convert back to UI format for response
    const responseKPI = {
      id: updatedKPI.id,
      name: updatedKPI.name,
      description: updatedKPI.description,
      type: updatedKPI.type,
      active: updatedKPI.active,
      webhookUrl: updatedKPI.webhook_url,
      analysisConfig: updatedKPI.analysis_config || {},
      metadata: {
        ...updatedKPI.metadata,
        created: updatedKPI.created_at,
        lastModified: updatedKPI.updated_at,
        source: updatedKPI.metadata?.source || 'unknown',
        category: updatedKPI.type
      }
    };

    return new Response(JSON.stringify({
      success: true,
      data: responseKPI
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating KPI:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update KPI',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Delete a KPI
 */
async function deleteKPI(kpiId, env, user) {
  try {
    // Check if KPI exists
    const existingKPI = await KVOperations.getKPI(env.CONFIG_KV, kpiId);
    if (!existingKPI) {
      return new Response(JSON.stringify({
        error: 'KPI not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete KPI from KV
    await KVOperations.deleteKPI(env.CONFIG_KV, kpiId);

    // Log deletion
    console.log(`KPI ${kpiId} deleted by ${user.email}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'KPI deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting KPI:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete KPI',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate sample CSV data for a KPI based on existing data
 */
async function generateSampleCSV(kpiId, env) {
  try {
    // Check if KPI exists
    const kpi = await KVOperations.getKPI(env.CONFIG_KV, kpiId);
    if (!kpi) {
      return new Response(JSON.stringify({
        error: 'KPI not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate sample CSV content
    const csvContent = await KVOperations.generateSampleCSVForKPI(env.CONFIG_KV, kpiId, kpi);

    return new Response(csvContent, {
      status: 200,
      headers: { 
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sample-${kpi.name.replace(/[^a-zA-Z0-9]/g, '-')}-data.csv"`
      }
    });

  } catch (error) {
    console.error('Error generating sample CSV:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate sample CSV',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Migrate KPI data from registry format to individual KV entries
 */
async function migrateKPIData(env) {
  try {
    // Get the current registry data
    const registryData = await env.CONFIG_KV.get('kpi-registry', 'json');
    
    if (!registryData || !registryData.kpis) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No KPI registry data found to migrate'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const migratedKPIs = [];
    const errors = [];

    // Migrate each KPI to individual entries
    for (const kpi of registryData.kpis) {
      try {
        // Convert to the expected format
        const migratedKPI = {
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          webhook_url: kpi.webhookUrl, // Convert camelCase to snake_case
          analysis_config: kpi.analysisConfig || {},
          active: kpi.active !== false,
          created_at: kpi.metadata?.created || new Date().toISOString(),
          created_by: 'system-migration',
          updated_at: kpi.metadata?.lastModified || new Date().toISOString(),
          updated_by: 'system-migration',
          type: kpi.type,
          metadata: kpi.metadata || {}
        };

        // Save individual KPI entry
        await KVOperations.saveKPI(env.CONFIG_KV, kpi.id, migratedKPI);
        migratedKPIs.push(kpi.id);
      } catch (error) {
        errors.push(`Failed to migrate KPI ${kpi.id}: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'KPI data migration completed',
      migrated_kpis: migratedKPIs,
      errors: errors.length > 0 ? errors : null,
      migrated_count: migratedKPIs.length,
      error_count: errors.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error migrating KPI data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to migrate KPI data',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Import historical data for a KPI
 */
async function importHistoricalData(kpiId, request, env, user) {
  try {
    // Check if KPI exists
    const kpi = await KVOperations.getKPI(env.CONFIG_KV, kpiId);
    if (!kpi) {
      return new Response(JSON.stringify({
        error: 'KPI not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse CSV data from request body
    const csvData = await request.text();
    
    // Process CSV and validate data
    const importResult = await KVOperations.importHistoricalData(
      env.CONFIG_KV, 
      kpiId, 
      csvData, 
      user.email
    );

    if (!importResult.success) {
      return new Response(JSON.stringify({
        error: 'Import failed',
        details: importResult.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Historical data imported successfully',
      imported_count: importResult.stats.successful_imports,
      skipped_count: importResult.stats.errors_count,
      duplicate_count: importResult.stats.total_rows - importResult.stats.successful_imports - importResult.stats.errors_count,
      import_id: importResult.stats.import_id,
      errors: importResult.errors
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error importing historical data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to import historical data',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}