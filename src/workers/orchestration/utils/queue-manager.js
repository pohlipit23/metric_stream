/**
 * Queue Manager
 * 
 * Handles queue message sending for triggering aggregate workflows
 */

export class QueueManager {
  constructor(env) {
    this.env = env;
  }

  /**
   * Trigger LLM Analysis workflow by sending message to queue
   */
  async triggerLLMAnalysis(traceId, options = {}) {
    try {
      const message = {
        traceId,
        timestamp: new Date().toISOString(),
        type: 'llm_analysis_trigger',
        partial: options.partial || false,
        metadata: {
          triggeredBy: 'orchestration-worker',
          ...options.metadata
        }
      };

      console.log(`Sending LLM analysis trigger for job ${traceId}`, message);

      // Send message to LLM Analysis Queue
      await this.env.LLM_ANALYSIS_QUEUE.send(message);
      
      // Record the trigger in KV for tracking
      await this.recordQueueTrigger(traceId, 'LLM_ANALYSIS_QUEUE', message);
      
      console.log(`Successfully triggered LLM analysis for job ${traceId}`);
      
    } catch (error) {
      console.error(`Error triggering LLM analysis for job ${traceId}:`, error);
      throw error;
    }
  }

  /**
   * Record queue trigger for audit and monitoring
   */
  async recordQueueTrigger(traceId, queueName, message) {
    try {
      const triggerKey = `queue_trigger:${traceId}:${queueName}`;
      const triggerRecord = {
        traceId,
        queueName,
        message,
        timestamp: new Date().toISOString(),
        triggeredBy: 'orchestration-worker'
      };

      await this.env.KV_STORE.put(triggerKey, JSON.stringify(triggerRecord), {
        expirationTtl: 7 * 24 * 60 * 60 // 7 days TTL
      });
      
    } catch (error) {
      console.error(`Error recording queue trigger for ${traceId}:`, error);
      // Don't throw - this is just for tracking
    }
  }

  /**
   * Get queue trigger history for monitoring
   */
  async getQueueTriggerHistory(traceId) {
    try {
      const triggerKeys = await this.env.KV_STORE.list({ 
        prefix: `queue_trigger:${traceId}:` 
      });
      
      const triggers = [];
      
      for (const key of triggerKeys.keys) {
        try {
          const triggerData = await this.env.KV_STORE.get(key.name);
          if (triggerData) {
            triggers.push(JSON.parse(triggerData));
          }
        } catch (error) {
          console.error(`Error parsing trigger data for ${key.name}:`, error);
        }
      }
      
      return triggers.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
    } catch (error) {
      console.error(`Error getting queue trigger history for ${traceId}:`, error);
      return [];
    }
  }

  /**
   * Test queue connectivity
   */
  async testQueueConnectivity() {
    try {
      const testMessage = {
        type: 'connectivity_test',
        timestamp: new Date().toISOString(),
        test: true
      };

      // Try to send a test message (this will be ignored by N8N workflows)
      await this.env.LLM_ANALYSIS_QUEUE.send(testMessage);
      
      return { status: 'connected', queue: 'LLM_ANALYSIS_QUEUE' };
      
    } catch (error) {
      console.error('Queue connectivity test failed:', error);
      return { 
        status: 'error', 
        queue: 'LLM_ANALYSIS_QUEUE', 
        error: error.message 
      };
    }
  }
}