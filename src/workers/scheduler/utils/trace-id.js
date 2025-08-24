/**
 * Trace ID Generation Utility
 * 
 * Generates unique trace IDs for job tracking across the system.
 * Format: trace_YYYYMMDD_HHMMSS_randomString
 */

export function generateTraceId() {
  const now = new Date();
  
  // Format date and time components
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  // Generate random string component
  const randomString = generateRandomString(8);
  
  // Combine into trace ID format
  const traceId = `trace_${year}${month}${day}_${hours}${minutes}${seconds}_${randomString}`;
  
  return traceId;
}

function generateRandomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

export function validateTraceId(traceId) {
  // Validate trace ID format: trace_YYYYMMDD_HHMMSS_randomString
  const traceIdPattern = /^trace_\d{8}_\d{6}_[a-z0-9]{8}$/;
  return traceIdPattern.test(traceId);
}

export function extractTimestampFromTraceId(traceId) {
  if (!validateTraceId(traceId)) {
    throw new Error('Invalid trace ID format');
  }
  
  const parts = traceId.split('_');
  const datePart = parts[1]; // YYYYMMDD
  const timePart = parts[2]; // HHMMSS
  
  const year = datePart.substring(0, 4);
  const month = datePart.substring(4, 6);
  const day = datePart.substring(6, 8);
  const hours = timePart.substring(0, 2);
  const minutes = timePart.substring(2, 4);
  const seconds = timePart.substring(4, 6);
  
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`);
}