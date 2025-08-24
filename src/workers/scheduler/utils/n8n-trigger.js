/**
 * N8N Workflow Trigger Utility
 * 
 * Handles triggering individual N8N workflows via webhook URLs.
 * Implements error handling, retry logic, and proper payload formatting.
 */

export async function triggerN8NWorkflows(env, traceId, activeKPIs, timestamp) {
  const results = [];
  
  // Trigger workflows concurrently for better performance
  const triggerPromises = activeKPIs.map(kpi => 
    triggerIndividualKPIWorkflow(env, traceId, kpi, timestamp)
  );

  // Wait for all triggers to complete
  const triggerResults = await Promise.allSettled(triggerPromises);

  // Process results
  triggerResults.forEach((result, index) => {
    const kpi = activeKPIs[index];
    
    if (result.status === 'fulfilled') {
      results.push({
        kpiId: kpi.id,
        success: result.value.success,
        error: result.value.error || null,
        responseTime: result.value.responseTime || null
      });
    } else {
      results.push({
        kpiId: kpi.id,
        success: false,
        error: result.reason?.message || 'Unknown error',
        responseTime: null
      });
    }
  });

  return results;
}

export async function triggerIndividualKPIWorkflow(env, traceId, kpi, timestamp) {
  const startTime = Date.now();
  
  try {
    // Create trigger payload using IndividualKPITrigger schema
    const triggerPayload = {
      traceId,
      kpiId: kpi.id,
      timestamp,
      kpiType: kpi.type,
      metadata: {
        schedulerWorker: 'scheduler-worker',
        environment: env.ENVIRONMENT || 'development',
        kpiName: kpi.name,
        kpiDescription: kpi.description
      }
    };

    console.log(`N8N Trigger: Triggering workflow for KPI ${kpi.id} at ${kpi.webhookUrl}`);

    // Make HTTP request to N8N webhook
    const response = await fetch(kpi.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Scheduler-Worker/1.0',
        // Add authentication header if N8N_API_KEY is available
        ...(env.N8N_API_KEY && { 'Authorization': `Bearer ${env.N8N_API_KEY}` })
      },
      body: JSON.stringify(triggerPayload)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`N8N Trigger: Failed to trigger KPI ${kpi.id}: ${response.status} ${response.statusText}`);
      console.error(`N8N Trigger: Error response: ${errorText}`);
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime
      };
    }

    // Try to parse response (N8N may return JSON or plain text)
    let responseData;
    try {
      const responseText = await response.text();
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      // If response is not JSON, that's okay for N8N webhooks
      responseData = { message: 'Webhook triggered successfully' };
    }

    console.log(`N8N Trigger: Successfully triggered KPI ${kpi.id} in ${responseTime}ms`);

    return {
      success: true,
      error: null,
      responseTime,
      response: responseData
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`N8N Trigger: Error triggering KPI ${kpi.id}:`, error);
    
    return {
      success: false,
      error: error.message,
      responseTime
    };
  }
}

export async function triggerWorkflowWithRetry(env, traceId, kpi, timestamp, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`N8N Trigger: Attempt ${attempt}/${maxRetries} for KPI ${kpi.id}`);
      
      const result = await triggerIndividualKPIWorkflow(env, traceId, kpi, timestamp);
      
      if (result.success) {
        if (attempt > 1) {
          console.log(`N8N Trigger: KPI ${kpi.id} succeeded on attempt ${attempt}`);
        }
        return result;
      }
      
      lastError = result.error;
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`N8N Trigger: Retrying KPI ${kpi.id} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = error.message;
      console.error(`N8N Trigger: Attempt ${attempt} failed for KPI ${kpi.id}:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`N8N Trigger: All ${maxRetries} attempts failed for KPI ${kpi.id}`);
  return {
    success: false,
    error: `All ${maxRetries} attempts failed. Last error: ${lastError}`,
    responseTime: null
  };
}

export function validateWebhookUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Basic validation
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    if (!parsedUrl.hostname) {
      return { valid: false, error: 'URL must have a valid hostname' };
    }
    
    return { valid: true, error: null };
    
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}