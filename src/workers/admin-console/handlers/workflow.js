/**
 * N8N Workflow Management Handler
 * Handles workflow control operations via N8N REST API
 */

import { addCorsHeaders } from '../middleware/cors.js';

/**
 * Handles all workflow-related API endpoints
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} user - Authenticated user information
 * @returns {Response} API response
 */
export async function handleWorkflowEndpoints(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    let response;

    if (path === '/api/workflows' && method === 'GET') {
      response = await listWorkflows(env);
    } else if (path.match(/^\/api\/workflows\/[^\/]+$/) && method === 'GET') {
      const workflowId = path.split('/').pop();
      response = await getWorkflow(workflowId, env);
    } else if (path.match(/^\/api\/workflows\/[^\/]+\/start$/) && method === 'POST') {
      const workflowId = path.split('/')[3];
      response = await startWorkflow(workflowId, env, user);
    } else if (path.match(/^\/api\/workflows\/[^\/]+\/stop$/) && method === 'POST') {
      const workflowId = path.split('/')[3];
      response = await stopWorkflow(workflowId, env, user);
    } else if (path.match(/^\/api\/workflows\/[^\/]+\/pause$/) && method === 'POST') {
      const workflowId = path.split('/')[3];
      response = await pauseWorkflow(workflowId, env, user);
    } else if (path.match(/^\/api\/workflows\/[^\/]+\/health-check$/) && method === 'POST') {
      const workflowId = path.split('/')[3];
      response = await healthCheckWorkflow(workflowId, env, user);
    } else if (path.match(/^\/api\/workflows\/[^\/]+\/status$/) && method === 'GET') {
      const workflowId = path.split('/')[3];
      response = await getWorkflowStatus(workflowId, env);
    } else if (path.match(/^\/api\/workflows\/[^\/]+\/executions$/) && method === 'GET') {
      const workflowId = path.split('/')[3];
      const limit = url.searchParams.get('limit') || '50';
      response = await getWorkflowExecutions(workflowId, limit, env);
    } else {
      response = new Response(JSON.stringify({ error: 'Workflow endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return addCorsHeaders(response);

  } catch (error) {
    console.error('Workflow endpoint error:', error);
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
 * Make authenticated request to N8N API
 */
async function makeN8NRequest(endpoint, options = {}, env) {
  const n8nBaseUrl = env.N8N_BASE_URL || 'http://localhost:5678';
  const n8nApiKey = env.N8N_API_KEY;
  
  if (!n8nApiKey) {
    throw new Error('N8N API key not configured');
  }

  const url = `${n8nBaseUrl}/api/v1${endpoint}`;
  const config = {
    ...options,
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`N8N API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * List all workflows from N8N
 */
async function listWorkflows(env) {
  try {
    // Get workflows from N8N
    const n8nWorkflows = await makeN8NRequest('/workflows', { method: 'GET' }, env);
    
    // Get KPI registry to match workflows with KPIs
    const kpiRegistry = await env.KV_STORE.get('config:kpi-registry');
    const kpis = kpiRegistry ? JSON.parse(kpiRegistry) : [];
    
    // Transform N8N workflows to our format
    const workflows = await Promise.all(n8nWorkflows.data.map(async (workflow) => {
      // Find matching KPI
      const matchingKpi = kpis.find(kpi => 
        kpi.webhook_url && kpi.webhook_url.includes(workflow.id)
      );

      // Get recent executions for success rate calculation
      let executions = [];
      let successRate = null;
      let lastExecution = null;
      let healthStatus = 'unknown';

      try {
        const executionsData = await makeN8NRequest(
          `/executions?workflowId=${workflow.id}&limit=20`, 
          { method: 'GET' }, 
          env
        );
        executions = executionsData.data || [];
        
        if (executions.length > 0) {
          const successCount = executions.filter(e => e.finished && !e.stoppedAt).length;
          successRate = Math.round((successCount / executions.length) * 100);
          lastExecution = executions[0];
          
          // Determine health status
          const recentFailures = executions.slice(0, 5).filter(e => e.stoppedAt || !e.finished).length;
          if (recentFailures === 0) {
            healthStatus = 'healthy';
          } else if (recentFailures <= 2) {
            healthStatus = 'warning';
          } else {
            healthStatus = 'error';
          }
        }
      } catch (error) {
        console.warn(`Failed to get executions for workflow ${workflow.id}:`, error.message);
      }

      return {
        id: workflow.id,
        name: workflow.name,
        status: workflow.active ? 'active' : 'inactive',
        webhook_url: matchingKpi?.webhook_url || null,
        kpi_id: matchingKpi?.id || null,
        kpi_name: matchingKpi?.name || null,
        success_rate: successRate,
        total_executions: executions.length,
        last_execution: lastExecution ? {
          id: lastExecution.id,
          status: lastExecution.finished ? (lastExecution.stoppedAt ? 'error' : 'success') : 'running',
          started_at: lastExecution.startedAt,
          finished_at: lastExecution.finishedAt,
          duration: lastExecution.finishedAt && lastExecution.startedAt ? 
            new Date(lastExecution.finishedAt) - new Date(lastExecution.startedAt) : null
        } : null,
        health_status: healthStatus,
        created_at: workflow.createdAt,
        updated_at: workflow.updatedAt
      };
    }));

    return new Response(JSON.stringify({
      success: true,
      data: workflows,
      count: workflows.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing workflows:', error);
    return new Response(JSON.stringify({
      error: 'Failed to list workflows',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get a specific workflow by ID
 */
async function getWorkflow(workflowId, env) {
  try {
    const workflow = await makeN8NRequest(`/workflows/${workflowId}`, { method: 'GET' }, env);
    
    return new Response(JSON.stringify({
      success: true,
      data: workflow
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting workflow:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get workflow',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Start/activate a workflow
 */
async function startWorkflow(workflowId, env, user) {
  try {
    await makeN8NRequest(`/workflows/${workflowId}/activate`, { method: 'POST' }, env);
    
    console.log(`Workflow ${workflowId} started by ${user.email}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow started successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error starting workflow:', error);
    return new Response(JSON.stringify({
      error: 'Failed to start workflow',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Stop/deactivate a workflow
 */
async function stopWorkflow(workflowId, env, user) {
  try {
    await makeN8NRequest(`/workflows/${workflowId}/deactivate`, { method: 'POST' }, env);
    
    console.log(`Workflow ${workflowId} stopped by ${user.email}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow stopped successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error stopping workflow:', error);
    return new Response(JSON.stringify({
      error: 'Failed to stop workflow',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Pause a workflow (N8N doesn't have native pause, so we deactivate)
 */
async function pauseWorkflow(workflowId, env, user) {
  try {
    // N8N doesn't have a native pause function, so we deactivate
    await makeN8NRequest(`/workflows/${workflowId}/deactivate`, { method: 'POST' }, env);
    
    console.log(`Workflow ${workflowId} paused by ${user.email}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow paused successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error pausing workflow:', error);
    return new Response(JSON.stringify({
      error: 'Failed to pause workflow',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Run health check on a workflow (test execution)
 */
async function healthCheckWorkflow(workflowId, env, user) {
  try {
    // Get workflow details first
    const workflow = await makeN8NRequest(`/workflows/${workflowId}`, { method: 'GET' }, env);
    
    // For webhook-triggered workflows, we can't easily test without triggering
    // Instead, we check recent execution history and workflow status
    const executionsData = await makeN8NRequest(
      `/executions?workflowId=${workflowId}&limit=5`, 
      { method: 'GET' }, 
      env
    );
    
    const executions = executionsData.data || [];
    const recentFailures = executions.filter(e => e.stoppedAt || !e.finished).length;
    
    let healthStatus = 'healthy';
    let message = 'Workflow is healthy';
    
    if (!workflow.active) {
      healthStatus = 'warning';
      message = 'Workflow is inactive';
    } else if (recentFailures > 3) {
      healthStatus = 'error';
      message = `${recentFailures} recent failures detected`;
    } else if (recentFailures > 0) {
      healthStatus = 'warning';
      message = `${recentFailures} recent failures detected`;
    }
    
    console.log(`Health check performed on workflow ${workflowId} by ${user.email}: ${healthStatus}`);
    
    return new Response(JSON.stringify({
      success: true,
      health_status: healthStatus,
      message: message,
      recent_executions: executions.length,
      recent_failures: recentFailures
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error performing health check:', error);
    return new Response(JSON.stringify({
      error: 'Failed to perform health check',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get workflow status
 */
async function getWorkflowStatus(workflowId, env) {
  try {
    const workflow = await makeN8NRequest(`/workflows/${workflowId}`, { method: 'GET' }, env);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.active ? 'active' : 'inactive',
        updated_at: workflow.updatedAt
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting workflow status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get workflow status',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get workflow execution history
 */
async function getWorkflowExecutions(workflowId, limit, env) {
  try {
    const executionsData = await makeN8NRequest(
      `/executions?workflowId=${workflowId}&limit=${limit}`, 
      { method: 'GET' }, 
      env
    );
    
    const executions = (executionsData.data || []).map(execution => ({
      id: execution.id,
      status: execution.finished ? (execution.stoppedAt ? 'error' : 'success') : 'running',
      started_at: execution.startedAt,
      finished_at: execution.finishedAt,
      duration: execution.finishedAt && execution.startedAt ? 
        new Date(execution.finishedAt) - new Date(execution.startedAt) : null,
      error: execution.stoppedAt ? 'Execution stopped with error' : null
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: executions,
      count: executions.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting workflow executions:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get workflow executions',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}