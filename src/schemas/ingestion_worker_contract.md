# Ingestion Worker Data Contract

This document defines how the Cloudflare Ingestion Worker must implement the data contract defined by the `KPIDataUpdate` and `KPIErrorUpdate` schemas.

## Overview

The Ingestion Worker serves as the primary interface between N8N workflows and the Cloudflare infrastructure. It must handle all incoming data according to the finalized data contract while maintaining flexibility for different KPI types and error structures.

## Required Endpoints

### POST /api/kpi-data

**Purpose**: Receive successful KPI data updates from N8N workflows

**Request Body**: Must conform to `KPIDataUpdate` schema
**Response**: JSON status response

**Implementation Requirements**:

```python
from src.schemas import KPIDataUpdate, parse_kpi_data_update

async def handle_kpi_data(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process KPI data updates according to the data contract.
    
    Required processing steps:
    1. Parse and validate incoming data using KPIDataUpdate schema
    2. Perform idempotency check (prevent duplicate timestamps for same KPI)
    3. Append data to time series in KV store (key: timeseries:{kpiId})
    4. Create/update KPI package (key: package:{traceId}:{kpiId})
    5. Update job status (key: job:{traceId})
    6. Return success response with traceId
    """
    try:
        # Step 1: Parse and validate
        kpi_update = parse_kpi_data_update(request_data)
        
        if not kpi_update.validate():
            return {
                "status": "error",
                "message": "Invalid data structure",
                "traceId": kpi_update.trace_id
            }
        
        # Step 2: Idempotency check
        if await is_duplicate_data_point(kpi_update.kpi_id, kpi_update.timestamp):
            return {
                "status": "duplicate",
                "message": "Data point already exists",
                "traceId": kpi_update.trace_id
            }
        
        # Step 3: Append to time series
        await append_to_time_series(kpi_update)
        
        # Step 4: Create/update KPI package
        await create_kpi_package(kpi_update)
        
        # Step 5: Update job status
        await update_job_status(kpi_update.trace_id, kpi_update.kpi_id, "completed")
        
        return {
            "status": "success",
            "message": "KPI data processed successfully",
            "traceId": kpi_update.trace_id,
            "kpiId": kpi_update.kpi_id
        }
        
    except ValueError as e:
        return {
            "status": "error",
            "message": f"Parsing error: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Processing error: {str(e)}"
        }
```

### POST /api/kpi-error

**Purpose**: Receive error reports from N8N workflows

**Request Body**: Must conform to `KPIErrorUpdate` schema
**Response**: JSON status response

**Implementation Requirements**:

```python
from src.schemas import KPIErrorUpdate, parse_kpi_error_update

async def handle_kpi_error(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process KPI error updates with flexible error structure handling.
    
    Required processing steps:
    1. Parse error data using flexible KPIErrorUpdate schema
    2. Extract structured error information
    3. Update job status with error details
    4. Store full error details for debugging
    5. Log error for monitoring
    6. Return success response
    """
    try:
        # Step 1: Parse with flexible structure
        error_update = parse_kpi_error_update(request_data)
        
        # Step 2: Extract error information
        error_message = error_update.get_error_message()
        error_code = error_update.get_error_code()
        error_type = error_update.get_error_type()
        
        # Step 3: Update job status
        await update_job_status_with_error(
            trace_id=error_update.trace_id,
            kpi_id=error_update.kpi_id,
            kpi_ids=error_update.kpi_ids,
            error_message=error_message,
            error_code=error_code,
            retry_count=error_update.retry_count
        )
        
        # Step 4: Store full error details
        await store_error_details(error_update.trace_id, error_update.to_dict())
        
        # Step 5: Log for monitoring
        await log_error(
            trace_id=error_update.trace_id,
            error_message=error_message,
            error_code=error_code,
            error_type=error_type
        )
        
        return {
            "status": "success",
            "message": "Error processed successfully",
            "traceId": error_update.trace_id
        }
        
    except ValueError as e:
        return {
            "status": "error",
            "message": f"Error parsing failed: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error processing failed: {str(e)}"
        }
```

## Data Processing Requirements

### Time Series Management

The Ingestion Worker must maintain time series data in Cloudflare KV according to this structure:

```python
from src.schemas import TimeSeriesData, TimeSeriesPoint

async def append_to_time_series(kpi_update: KPIDataUpdate):
    """
    Append new data point to existing time series.
    
    KV Key: timeseries:{kpiId}
    Structure: TimeSeriesData schema
    """
    kv_key = f"timeseries:{kpi_update.kpi_id}"
    
    # Get existing time series or create new one
    existing_data = await kv_store.get(kv_key)
    
    if existing_data:
        time_series = TimeSeriesData.from_dict(existing_data)
    else:
        time_series = TimeSeriesData(
            kpi_id=kpi_update.kpi_id,
            kpi_type=kpi_update.kpi_type,
            data_points=[],
            last_updated=kpi_update.timestamp,
            metadata={
                "source": kpi_update.metadata.get("source", "unknown") if kpi_update.metadata else "unknown",
                "created": kpi_update.timestamp,
                "total_points": 0
            }
        )
    
    # Create new data point
    new_point = TimeSeriesPoint(
        timestamp=kpi_update.timestamp,
        value=extract_primary_value(kpi_update.data),
        metadata=kpi_update.data if len(kpi_update.data) > 1 else None
    )
    
    # Append to time series
    time_series.data_points.append(new_point)
    time_series.last_updated = kpi_update.timestamp
    time_series.metadata["total_points"] = len(time_series.data_points)
    
    # Store back to KV
    await kv_store.put(kv_key, time_series.to_dict())

def extract_primary_value(data: Dict[str, Any]) -> float:
    """Extract the primary numeric value from flexible data structure"""
    # Try common value fields
    if "value" in data:
        return float(data["value"])
    
    # For single numeric values
    if len(data) == 1:
        return float(list(data.values())[0])
    
    # Default fallback
    for key, value in data.items():
        if isinstance(value, (int, float)):
            return float(value)
    
    raise ValueError("No numeric value found in data structure")
```

### KPI Package Creation

```python
from src.schemas import KPIPackage

async def create_kpi_package(kpi_update: KPIDataUpdate):
    """
    Create individual KPI package for downstream processing.
    
    KV Key: package:{traceId}:{kpiId}
    Structure: KPIPackage schema
    """
    kv_key = f"package:{kpi_update.trace_id}:{kpi_update.kpi_id}"
    
    package = KPIPackage(
        trace_id=kpi_update.trace_id,
        kpi_id=kpi_update.kpi_id,
        timestamp=kpi_update.timestamp,
        kpi_type=kpi_update.kpi_type,
        data=kpi_update.data,
        metadata={
            "source": kpi_update.metadata.get("source", "unknown") if kpi_update.metadata else "unknown",
            "created_at": kpi_update.timestamp,
            "quality": "high"  # Default quality
        },
        chart=kpi_update.chart,
        analysis=None  # Will be populated by LLM Analysis workflow
    )
    
    await kv_store.put(kv_key, package.to_dict())
```

### Job Status Tracking

```python
from src.schemas import JobStatus, KPIStatus, JobStatusEnum, KPIStatusEnum

async def update_job_status(trace_id: str, kpi_id: str, status: str):
    """
    Update job status tracking in KV store.
    
    KV Key: job:{traceId}
    Structure: JobStatus schema
    """
    kv_key = f"job:{trace_id}"
    
    # Get existing job status
    existing_data = await kv_store.get(kv_key)
    if not existing_data:
        raise ValueError(f"Job {trace_id} not found")
    
    job_status = JobStatus.from_dict(existing_data)
    
    # Update KPI status
    if kpi_id in job_status.kpis:
        job_status.kpis[kpi_id].status = KPIStatusEnum(status)
        job_status.kpis[kpi_id].completed_at = datetime.utcnow().isoformat()
    
    # Update overall job status
    completed_kpis = sum(1 for kpi in job_status.kpis.values() if kpi.status == KPIStatusEnum.COMPLETED)
    total_kpis = len(job_status.kpis)
    
    if completed_kpis == total_kpis:
        job_status.status = JobStatusEnum.COMPLETED
    elif completed_kpis > 0:
        job_status.status = JobStatusEnum.PARTIAL
    
    job_status.updated_at = datetime.utcnow().isoformat()
    job_status.metadata["completed_kpis"] = completed_kpis
    
    await kv_store.put(kv_key, job_status.to_dict())
```

## Multi-KPI Response Handling

The Ingestion Worker must handle multi-KPI responses by converting them to individual KPI updates:

```python
from src.schemas import parse_kpi_response, MultiKPIResponse

async def handle_multi_kpi_response(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle multi-KPI responses by converting to individual KPI updates.
    """
    try:
        # Parse the response (auto-detects type)
        response = parse_kpi_response(request_data)
        
        if isinstance(response, MultiKPIResponse):
            # Convert to individual KPI updates
            kpi_updates = response.to_kpi_data_updates()
            
            results = []
            for update in kpi_updates:
                # Process each KPI individually
                result = await process_individual_kpi_update(update)
                results.append(result)
            
            return {
                "status": "success",
                "message": f"Processed {len(results)} KPIs",
                "traceId": response.trace_id,
                "results": results
            }
        else:
            # Handle as individual KPI
            kpi_update = response.to_kpi_data_update()
            return await process_individual_kpi_update(kpi_update)
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Multi-KPI processing error: {str(e)}"
        }
```

## Validation Requirements

The Ingestion Worker must implement comprehensive validation:

```python
def validate_request_authentication(request):
    """Validate request authentication using shared secret or API key"""
    # Implementation depends on chosen authentication method
    pass

def validate_kpi_data_structure(kpi_update: KPIDataUpdate) -> bool:
    """Validate KPI data structure beyond basic schema validation"""
    # Check timestamp format
    try:
        datetime.fromisoformat(kpi_update.timestamp.replace('Z', '+00:00'))
    except ValueError:
        return False
    
    # Check data structure has at least one numeric value
    if not any(isinstance(v, (int, float)) for v in kpi_update.data.values()):
        return False
    
    return True

async def is_duplicate_data_point(kpi_id: str, timestamp: str) -> bool:
    """Check if data point already exists for this KPI and timestamp"""
    kv_key = f"timeseries:{kpi_id}"
    existing_data = await kv_store.get(kv_key)
    
    if not existing_data:
        return False
    
    time_series = TimeSeriesData.from_dict(existing_data)
    return any(point.timestamp == timestamp for point in time_series.data_points)
```

## Error Handling Requirements

The Ingestion Worker must implement robust error handling:

```python
async def handle_processing_error(error: Exception, trace_id: str, kpi_id: str = None):
    """Handle processing errors with proper logging and status updates"""
    error_details = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "timestamp": datetime.utcnow().isoformat(),
        "trace_id": trace_id,
        "kpi_id": kpi_id
    }
    
    # Log error
    await log_processing_error(error_details)
    
    # Update job status if applicable
    if kpi_id:
        await update_job_status_with_error(
            trace_id=trace_id,
            kpi_id=kpi_id,
            error_message=str(error)
        )
    
    # Store error details for debugging
    error_key = f"processing-error:{trace_id}:{datetime.utcnow().isoformat()}"
    await kv_store.put(error_key, error_details)
```

## Performance Requirements

- **Response Time**: All endpoints must respond within 5 seconds
- **Throughput**: Must handle up to 200 concurrent KPI updates
- **Idempotency**: Duplicate requests must be handled gracefully
- **Memory Usage**: Efficient processing of large time series data

## Monitoring and Logging

The Ingestion Worker must provide comprehensive monitoring:

```python
async def log_kpi_processing_metrics(kpi_update: KPIDataUpdate, processing_time: float):
    """Log processing metrics for monitoring"""
    metrics = {
        "trace_id": kpi_update.trace_id,
        "kpi_id": kpi_update.kpi_id,
        "kpi_type": kpi_update.kpi_type,
        "processing_time_ms": processing_time * 1000,
        "data_size_bytes": len(json.dumps(kpi_update.data)),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Send to monitoring system
    await send_metrics(metrics)
```

## Contract Compliance

The Ingestion Worker implementation MUST:

1. **Use the defined schemas** for all data parsing and validation
2. **Handle flexible data structures** as defined in the KPIDataUpdate schema
3. **Process error reports** using the flexible KPIErrorUpdate schema
4. **Maintain data consistency** in KV store according to defined key patterns
5. **Provide idempotency** for all operations
6. **Log all operations** for monitoring and debugging
7. **Return consistent response formats** as defined in this contract

This data contract ensures that the Ingestion Worker can reliably process data from any N8N workflow while maintaining system consistency and enabling future extensibility.