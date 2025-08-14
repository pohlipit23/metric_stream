# Ingestion Worker Specification - Updated for Validated N8N Payloads

## Overview

The Ingestion Worker is a Cloudflare Worker that receives KPI data from N8N workflows and manages KV store updates. This specification has been updated based on live validation of N8N webhook responses.

## Validated Payload Formats

### Multi-KPI Success Response (CBBI)

**Endpoint**: `POST /api/kpi-data`

**Validated Payload Structure**:
```json
{
  "traceId": "trace_20250814_validation_003",
  "timestamp": "2025-08-13T00:00:00Z",
  "kpiType": "cbbi-multi",
  "kpiIds": [
    "cbbi-btc-price-usd",
    "cbbi-rhodl",
    "cbbi-mvrv", 
    "cbbi-confidence"
  ],
  "data": {
    "cbbi-btc-price-usd": 120668.6251,
    "cbbi-rhodl": 0.7593,
    "cbbi-mvrv": 0.8252,
    "cbbi-confidence": 0.7849
  }
}
```

### Multi-KPI Success Response (CMC)

**Endpoint**: `POST /api/kpi-data`

**Validated Payload Structure**:
```json
{
  "traceId": "trace_20250814_validation_004", 
  "timestamp": "2025-08-14T10:55:59.999Z",
  "kpiType": "cmc-multi",
  "kpiIds": [
    "cmc-btc-dominance",
    "cmc-eth-dominance",
    "cmc-totalmarketcap-usd",
    "cmc-stablecoinmarketcap-usd"
  ],
  "data": {
    "cmc-btc-dominance": 58.591333855544,
    "cmc-eth-dominance": 13.80371602,
    "cmc-totalmarketcap-usd": 4108389965522.5537,
    "cmc-stablecoinmarketcap-usd": 255531136112.3722
  }
}
```

## Processing Logic

### Multi-KPI Response Processing

The Ingestion Worker must handle multi-KPI responses by converting them into individual KPI updates:

```python
async def handle_multi_kpi_data(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process multi-KPI response from N8N workflows.
    Converts single multi-KPI payload into multiple individual KPI updates.
    """
    try:
        # Parse the multi-KPI response using validated schema
        if request_data.get("kpiType") == "cbbi-multi":
            multi_response = parse_multi_kpi_response(request_data)
            kpi_updates = multi_response.to_kpi_data_updates()
        elif request_data.get("kpiType") == "cmc-multi":
            multi_response = parse_multi_kpi_response(request_data)
            kpi_updates = multi_response.to_kpi_data_updates()
        else:
            # Handle individual KPI response
            individual_response = parse_individual_kpi_response(request_data)
            kpi_updates = [individual_response.to_kpi_data_update()]
        
        # Process each individual KPI update
        results = []
        for kpi_update in kpi_updates:
            result = await process_individual_kpi(kpi_update)
            results.append(result)
        
        # Update job status
        await update_job_status(
            trace_id=request_data["traceId"],
            completed_kpis=[update.kpi_id for update in kpi_updates],
            timestamp=request_data["timestamp"]
        )
        
        return {
            "status": "success",
            "message": f"Processed {len(kpi_updates)} KPI updates",
            "traceId": request_data["traceId"],
            "processedKPIs": [update.kpi_id for update in kpi_updates]
        }
        
    except Exception as e:
        logging.error(f"Failed to process multi-KPI data: {str(e)}")
        return {
            "status": "error",
            "message": f"Processing failed: {str(e)}",
            "traceId": request_data.get("traceId", "unknown")
        }

async def process_individual_kpi(kpi_update: KPIDataUpdate) -> Dict[str, Any]:
    """Process a single KPI update"""
    
    # 1. Update time series data
    await update_time_series(kpi_update)
    
    # 2. Create KPI package
    await create_kpi_package(kpi_update)
    
    # 3. Log processing
    logging.info(f"Processed KPI {kpi_update.kpi_id} for trace {kpi_update.trace_id}")
    
    return {
        "kpiId": kpi_update.kpi_id,
        "status": "processed",
        "timestamp": kpi_update.timestamp
    }
```

### Time Series Update Logic

```python
async def update_time_series(kpi_update: KPIDataUpdate):
    """Update time series data in KV store"""
    
    kv_key = f"timeseries:{kpi_update.kpi_id}"
    
    # Get existing time series or create new one
    existing_data = await KV.get(kv_key, type="json")
    
    if existing_data:
        time_series = TimeSeriesData.from_dict(existing_data)
    else:
        time_series = TimeSeriesData(
            kpi_id=kpi_update.kpi_id,
            kpi_type=kpi_update.kpi_type,
            data_points=[],
            last_updated=kpi_update.timestamp,
            metadata={
                "created": kpi_update.timestamp,
                "source": "n8n_workflow"
            }
        )
    
    # Extract value from data structure
    if isinstance(kpi_update.data, dict) and "value" in kpi_update.data:
        value = kpi_update.data["value"]
    elif isinstance(kpi_update.data, (int, float)):
        value = float(kpi_update.data)
    else:
        # For multi-KPI responses, the value is the direct numeric value
        value = float(kpi_update.data)
    
    # Create new data point
    new_point = TimeSeriesPoint(
        timestamp=kpi_update.timestamp,
        value=value,
        metadata=kpi_update.metadata
    )
    
    # Check for duplicates (idempotency)
    existing_timestamps = [point.timestamp for point in time_series.data_points]
    if kpi_update.timestamp not in existing_timestamps:
        time_series.data_points.append(new_point)
        time_series.last_updated = kpi_update.timestamp
        
        # Store updated time series
        await KV.put(kv_key, json.dumps(time_series.to_dict()))
```

### KPI Package Creation

```python
async def create_kpi_package(kpi_update: KPIDataUpdate):
    """Create individual KPI package for downstream processing"""
    
    kv_key = f"package:{kpi_update.trace_id}:{kpi_update.kpi_id}"
    
    # Extract value for package
    if isinstance(kpi_update.data, dict) and "value" in kpi_update.data:
        package_data = kpi_update.data
    else:
        package_data = {"value": float(kpi_update.data)}
    
    kpi_package = KPIPackage(
        trace_id=kpi_update.trace_id,
        kpi_id=kpi_update.kpi_id,
        timestamp=kpi_update.timestamp,
        kpi_type=kpi_update.kpi_type,
        data=package_data,
        metadata={
            "source": "n8n_workflow",
            "processed_at": datetime.now().isoformat() + "Z",
            "original_kpi_type": kpi_update.kpi_type
        },
        chart=kpi_update.chart
    )
    
    await KV.put(kv_key, json.dumps(kpi_package.to_dict()))
```

## API Endpoints

### POST /api/kpi-data

**Purpose**: Receive successful KPI data from N8N workflows

**Request Validation**:
```python
def validate_kpi_data_request(data: Dict[str, Any]) -> bool:
    """Validate incoming KPI data request"""
    
    required_fields = ["traceId", "timestamp", "kpiType"]
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate timestamp format
    try:
        datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Invalid timestamp format, expected ISO 8601")
    
    # Validate KPI type
    valid_kpi_types = ["cbbi-multi", "cmc-multi", "individual"]
    if data["kpiType"] not in valid_kpi_types:
        raise ValueError(f"Invalid kpiType: {data['kpiType']}")
    
    # Validate multi-KPI structure
    if data["kpiType"] in ["cbbi-multi", "cmc-multi"]:
        if "kpiIds" not in data or "data" not in data:
            raise ValueError("Multi-KPI response missing kpiIds or data")
        
        # Validate KPI ID consistency
        kpi_ids_set = set(data["kpiIds"])
        data_keys_set = set(data["data"].keys())
        if kpi_ids_set != data_keys_set:
            raise ValueError("KPI IDs in kpiIds array must match data object keys")
    
    return True
```

**Response Format**:
```json
{
  "status": "success",
  "message": "Processed 4 KPI updates", 
  "traceId": "trace_20250814_validation_003",
  "processedKPIs": [
    "cbbi-btc-price-usd",
    "cbbi-rhodl", 
    "cbbi-mvrv",
    "cbbi-confidence"
  ]
}
```

### POST /api/kpi-error

**Purpose**: Receive error notifications from N8N workflows

**Expected Payload** (based on flexible error schema):
```json
{
  "traceId": "trace_123",
  "error": {
    "message": "API rate limit exceeded",
    "code": "RATE_LIMIT",
    "status": 429
  },
  "kpiId": "cbbi-btc-price-usd",
  "timestamp": "2025-08-14T14:30:22Z",
  "retryCount": 2
}
```

## Error Handling

### Validation Errors
- Return 400 Bad Request with detailed error message
- Log validation failures for monitoring
- Do not update KV store on validation failure

### Processing Errors
- Return 500 Internal Server Error
- Log full error details for debugging
- Attempt partial processing where possible
- Update job status with error information

### Idempotency
- Check for duplicate timestamps in time series
- Skip duplicate data points
- Return success for duplicate requests

## Monitoring and Logging

### Key Metrics
- Request processing time
- KPI update success rate
- Time series update frequency
- Job completion tracking
- Error rates by KPI type

### Logging Structure
```json
{
  "timestamp": "2025-08-14T14:30:22Z",
  "level": "INFO",
  "message": "Processed multi-KPI data",
  "traceId": "trace_123",
  "kpiType": "cbbi-multi",
  "processedKPIs": 4,
  "processingTimeMs": 150
}
```

## Security

### Authentication
- Validate requests using shared secret or API key
- Reject requests without proper authentication
- Rate limiting to prevent abuse

### Input Validation
- Sanitize all input data
- Validate JSON structure
- Check data types and ranges
- Prevent injection attacks

## Performance Considerations

### KV Store Optimization
- Batch KV operations where possible
- Use appropriate TTL values
- Optimize key naming for efficient retrieval
- Monitor KV storage usage

### Memory Management
- Process large payloads efficiently
- Avoid loading entire time series into memory
- Use streaming for large data sets
- Implement proper garbage collection

## Deployment Configuration

### Environment Variables
```
KV_NAMESPACE_TIMESERIES=timeseries_data
KV_NAMESPACE_JOBS=job_status  
KV_NAMESPACE_PACKAGES=kpi_packages
API_SECRET_KEY=<secure_key>
LOG_LEVEL=INFO
```

### Wrangler Configuration
```toml
name = "ingestion-worker"
main = "src/index.js"
compatibility_date = "2024-08-14"

[[kv_namespaces]]
binding = "TIMESERIES_KV"
id = "timeseries_namespace_id"

[[kv_namespaces]]
binding = "JOBS_KV" 
id = "jobs_namespace_id"

[[kv_namespaces]]
binding = "PACKAGES_KV"
id = "packages_namespace_id"
```