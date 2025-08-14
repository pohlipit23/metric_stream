# Data Contract Documentation

This document defines the finalized data contract for the Daily Index Tracker system, governing communication between N8N workflows and Cloudflare Workers.

## Overview

The data contract is built around two primary schemas:

1. **`KPIDataUpdate`** - For successful KPI data submissions from N8N workflows
2. **`KPIErrorUpdate`** - For error reporting from N8N workflows

These schemas provide the foundation for all data exchange in the system while maintaining flexibility for different KPI types and data sources.

## Core Schemas

### KPIDataUpdate

The primary schema for successful KPI data updates from N8N workflows to the Cloudflare Ingestion Worker.

**Required Fields:**
- `trace_id` (str) - Unique job identifier for tracking
- `kpi_id` (str) - KPI identifier 
- `timestamp` (str) - ISO 8601 timestamp of the data
- `kpi_type` (str) - KPI type for processing logic
- `data` (Dict[str, Any]) - Flexible KPI data structure

**Optional Fields:**
- `kpi_ids` (List[str]) - For multi-KPI responses
- `chart` (ChartInfo) - Optional chart information
- `metadata` (Dict[str, Any]) - Additional metadata

**Example Usage:**
```python
from src.schemas import KPIDataUpdate, ChartInfo

# Individual KPI update
update = KPIDataUpdate(
    trace_id="trace_20250814_143022_abc123",
    kpi_id="cmc-btc-price",
    timestamp="2025-08-14T14:30:22Z",
    kpi_type="price",
    data={"value": 45000.0, "volume": 1000000},
    chart=ChartInfo(
        url="https://example.com/chart.png",
        chart_type="line",
        time_range="24h"
    )
)

# Convert to JSON for transmission
json_data = update.to_dict()
```

### KPIErrorUpdate

The primary schema for error reporting from N8N workflows with maximum flexibility.

**Required Fields:**
- `trace_id` (str) - Required for job tracking
- `error` (Dict[str, Any]) - Flexible error object

**Optional Fields:**
- `timestamp` (str) - When error occurred
- `kpi_id` (str) - Single KPI identifier
- `kpi_ids` (List[str]) - Multiple KPI identifiers
- `retry_count` (int) - Number of retry attempts
- `component` (str) - Component where error occurred
- `workflow_id` (str) - N8N workflow identifier
- `execution_id` (str) - N8N execution identifier
- `additional_fields` (Dict[str, Any]) - Any additional fields

**Example Usage:**
```python
from src.schemas import KPIErrorUpdate

# Flexible error reporting
error_update = KPIErrorUpdate(
    trace_id="trace_20250814_143022_abc123",
    error={
        "message": "401 - API key missing",
        "name": "AxiosError",
        "code": "ERR_BAD_REQUEST",
        "status": 401
    },
    kpi_id="cmc-btc-price",
    retry_count=2,
    component="data_collection"
)

# Extract error information
message = error_update.get_error_message()  # "401 - API key missing"
code = error_update.get_error_code()        # "ERR_BAD_REQUEST"
error_type = error_update.get_error_type()  # "AxiosError"
```

## Specialized Response Types

### Multi-KPI Responses

For workflows that collect multiple KPIs from a single data source:

- **`CBBIMultiKPIResponse`** - CBBI (Coin Bureau Bitcoin Index) data
- **`CMCMultiKPIResponse`** - CoinMarketCap data

These can be converted to multiple `KPIDataUpdate` instances for processing:

```python
from src.schemas import parse_multi_kpi_response

# Parse multi-KPI response
response = parse_multi_kpi_response(json_data)

# Convert to individual KPI updates
updates = response.to_kpi_data_updates()
for update in updates:
    # Process each KPI individually
    process_kpi_update(update)
```

### Individual KPI Responses

For workflows that collect single KPIs:

```python
from src.schemas import IndividualKPIResponse

response = IndividualKPIResponse(
    trace_id="trace_123",
    kpi_id="btc-price",
    timestamp="2025-08-14T14:30:22Z",
    kpi_type="price",
    data={"value": 45000.0}
)

# Convert to KPIDataUpdate for processing
update = response.to_kpi_data_update()
```

## Parsing and Validation

The schemas module provides utility functions for parsing and validation:

```python
from src.schemas import (
    parse_kpi_data_update,
    parse_kpi_error_update,
    parse_kpi_response,
    parse_error_response
)

# Parse incoming JSON data
try:
    # For successful KPI data
    kpi_update = parse_kpi_data_update(json_data)
    
    # For error data
    error_update = parse_kpi_error_update(json_data)
    
    # Auto-detect response type
    response = parse_kpi_response(json_data)
    
except ValueError as e:
    print(f"Parsing error: {e}")
```

## Integration with Ingestion Worker

The Ingestion Worker will use these schemas to process incoming data:

```python
# Example Ingestion Worker endpoint implementation
async def handle_kpi_data(request_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Parse the incoming data
        kpi_update = parse_kpi_data_update(request_data)
        
        # Validate the data
        if not kpi_update.validate():
            return {"status": "error", "message": "Invalid data structure"}
        
        # Process the update
        await process_kpi_update(kpi_update)
        
        return {"status": "success", "traceId": kpi_update.trace_id}
        
    except ValueError as e:
        return {"status": "error", "message": str(e)}

async def handle_kpi_error(request_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Parse the error with flexible structure
        error_update = parse_kpi_error_update(request_data)
        
        # Extract error information
        error_message = error_update.get_error_message()
        
        # Process the error
        await process_kpi_error(error_update)
        
        return {"status": "success", "traceId": error_update.trace_id}
        
    except ValueError as e:
        return {"status": "error", "message": str(e)}
```

## Key Design Principles

1. **Flexibility** - The `data` field in `KPIDataUpdate` accepts any structure to accommodate different KPI types
2. **Extensibility** - Optional fields and metadata allow for future enhancements without breaking changes
3. **Error Resilience** - `KPIErrorUpdate` accepts any error structure while ensuring core tracking information
4. **Type Safety** - Strong typing with dataclasses and validation methods
5. **Backward Compatibility** - Schema evolution guidelines ensure existing integrations continue working

## Schema Evolution

When adding new KPI types or data sources:

1. Create new response interfaces extending base schemas
2. Update parsing functions to handle new types
3. Maintain backward compatibility with existing schemas
4. Document changes and migration paths

## Testing

The schemas include validation methods and comprehensive parsing functions to ensure data integrity:

```python
# Validation example
kpi_update = KPIDataUpdate(...)
if kpi_update.validate():
    # Process the update
    pass
else:
    # Handle validation error
    pass
```

This data contract provides a solid foundation for the Ingestion Worker development while maintaining the flexibility needed for diverse KPI types and data sources.