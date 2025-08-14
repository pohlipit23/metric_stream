---
title: "Data Schema Documentation"
type: "spec"
---

# Data Schema Documentation

This document defines all data schemas and classes used in the Daily Index Tracker system for communication between N8N workflows and Cloudflare Workers.

## Webhook Trigger Schemas

### Individual KPI Trigger
Schema for triggering individual KPI workflows from Cloudflare Scheduler Worker to N8N.

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime

@dataclass
class IndividualKPITrigger:
    trace_id: str              # Unique job identifier (e.g., "trace_20250814_143022_abc123")
    kpi_id: str                # Single KPI identifier (e.g., "cmc-btc-price")
    timestamp: str             # ISO 8601 timestamp when job was triggered
    kpi_type: str              # KPI type for processing logic (e.g., "price", "ratio", "index")
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata fields
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "kpiId": self.kpi_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type
        }
        if self.metadata:
            result["metadata"] = self.metadata
        return result
```

### Multi-KPI Trigger
Schema for triggering workflows that collect multiple KPIs from a single data source.

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class MultiKPITrigger:
    trace_id: str              # Unique job identifier
    kpi_ids: List[str]         # Array of KPI identifiers to be collected
    timestamp: str             # ISO 8601 timestamp when job was triggered
    kpi_type: str              # Multi-KPI type identifier (e.g., "cbbi-multi")
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata fields
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "kpiIds": self.kpi_ids,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type
        }
        if self.metadata:
            result["metadata"] = self.metadata
        return result
```

## N8N Response Schemas

### CBBI Multi-KPI Response
Schema for N8N workflow responses containing multiple KPIs from the CBBI data source.

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class CBBIData:
    cbbi_btc_price_usd: float      # BTC price in USD
    cbbi_rhodl: float              # RHODL ratio (0-1 range)
    cbbi_mvrv: float               # MVRV ratio (0-1 range)
    cbbi_confidence: float         # Confidence index (0-1 range)
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for JSON serialization"""
        return {
            "cbbi-btc-price-usd": self.cbbi_btc_price_usd,
            "cbbi-rhodl": self.cbbi_rhodl,
            "cbbi-mvrv": self.cbbi_mvrv,
            "cbbi-confidence": self.cbbi_confidence
        }

@dataclass
class CBBIMultiKPIResponse:
    trace_id: str                  # Must match the trigger traceId
    timestamp: str                 # Data timestamp (may differ from trigger timestamp)
    kpi_type: str = "cbbi-multi"   # Fixed type identifier for CBBI multi-KPI responses
    kpi_ids: Optional[List[str]] = None  # Array of KPI identifiers included in this response
    data: Optional[CBBIData] = None      # CBBI data structure
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata fields
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type
        }
        if self.kpi_ids:
            result["kpiIds"] = self.kpi_ids
        if self.data:
            result["data"] = self.data.to_dict()
        if self.metadata:
            result["metadata"] = self.metadata
        return result
```

### CMC Multi-KPI Response
Schema for N8N workflow responses containing multiple KPIs from the CoinMarketCap data source.

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class CMCData:
    cmc_btc_dominance: float           # BTC dominance percentage (0-100 range)
    cmc_eth_dominance: float           # ETH dominance percentage (0-100 range)
    cmc_totalmarketcap_usd: float      # Total crypto market cap in USD
    cmc_stablecoinmarketcap_usd: float # Total stablecoin market cap in USD
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for JSON serialization"""
        return {
            "cmc-btc-dominance": self.cmc_btc_dominance,
            "cmc-eth-dominance": self.cmc_eth_dominance,
            "cmc-totalmarketcap-usd": self.cmc_totalmarketcap_usd,
            "cmc-stablecoinmarketcap-usd": self.cmc_stablecoinmarketcap_usd
        }

@dataclass
class CMCMultiKPIResponse:
    trace_id: str                  # Must match the trigger traceId
    timestamp: str                 # Data timestamp (may differ from trigger timestamp)
    kpi_type: str = "cmc-multi"    # Fixed type identifier for CMC multi-KPI responses
    kpi_ids: Optional[List[str]] = None  # Array of KPI identifiers included in this response
    data: Optional[CMCData] = None       # CMC data structure
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata fields
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type
        }
        if self.kpi_ids:
            result["kpiIds"] = self.kpi_ids
        if self.data:
            result["data"] = self.data.to_dict()
        if self.metadata:
            result["metadata"] = self.metadata
        return result
```

### Individual KPI Response
Schema for N8N workflow responses containing a single KPI.

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class ChartInfo:
    url: str                   # URL to generated chart image
    chart_type: str            # Chart type (e.g., "line", "candlestick")
    time_range: str            # Time range covered by chart
    
    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for JSON serialization"""
        return {
            "url": self.url,
            "type": self.chart_type,
            "timeRange": self.time_range
        }

@dataclass
class IndividualKPIResponse:
    trace_id: str              # Must match the trigger traceId
    kpi_id: str                # Single KPI identifier
    timestamp: str             # ISO 8601 timestamp of the data
    kpi_type: str              # KPI type (e.g., "price", "ratio", "index")
    data: Dict[str, Any]       # KPI data with flexible structure
    chart: Optional[ChartInfo] = None      # Optional chart information
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata fields
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "kpiId": self.kpi_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type,
            "data": self.data
        }
        if self.chart:
            result["chart"] = self.chart.to_dict()
        if self.metadata:
            result["metadata"] = self.metadata
        return result
```

### Error Response
Schema for N8N workflow error responses with flexible error structure.

```python
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Union

@dataclass
class FlexibleKPIErrorResponse:
    """
    Flexible error response schema that accepts any key-value pairs.
    Based on actual N8N error payload structure.
    
    Example payload:
    {
        "traceId": "test-trace-123",
        "error": {
            "message": "401 - API key missing",
            "name": "AxiosError", 
            "stack": "AxiosError: Request failed...",
            "code": "ERR_BAD_REQUEST",
            "status": 401
        }
    }
    """
    trace_id: str                           # Must match the trigger traceId (required)
    error: Dict[str, Any]                   # Flexible error object with any structure
    timestamp: Optional[str] = None         # ISO 8601 timestamp when error occurred
    kpi_id: Optional[str] = None           # KPI identifier (if applicable)
    kpi_ids: Optional[List[str]] = None    # Multiple KPI identifiers (for multi-KPI workflows)
    retry_count: Optional[int] = None      # Number of retry attempts made
    component: Optional[str] = None        # Component where error occurred
    workflow_id: Optional[str] = None      # N8N workflow identifier
    execution_id: Optional[str] = None     # N8N execution identifier
    additional_fields: Optional[Dict[str, Any]] = None  # Any additional fields from N8N
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "error": self.error
        }
        
        # Add optional fields if present
        if self.timestamp:
            result["timestamp"] = self.timestamp
        if self.kpi_id:
            result["kpiId"] = self.kpi_id
        if self.kpi_ids:
            result["kpiIds"] = self.kpi_ids
        if self.retry_count is not None:
            result["retryCount"] = self.retry_count
        if self.component:
            result["component"] = self.component
        if self.workflow_id:
            result["workflowId"] = self.workflow_id
        if self.execution_id:
            result["executionId"] = self.execution_id
        if self.additional_fields:
            result.update(self.additional_fields)
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FlexibleKPIErrorResponse':
        """Create instance from dictionary with flexible parsing"""
        # Extract known fields
        trace_id = data.get("traceId")
        if not trace_id:
            raise ValueError("traceId is required in error response")
            
        error = data.get("error", {})
        if not error:
            raise ValueError("error field is required in error response")
        
        # Extract optional fields
        timestamp = data.get("timestamp")
        kpi_id = data.get("kpiId")
        kpi_ids = data.get("kpiIds")
        retry_count = data.get("retryCount")
        component = data.get("component")
        workflow_id = data.get("workflowId")
        execution_id = data.get("executionId")
        
        # Collect any additional fields not explicitly handled
        known_fields = {
            "traceId", "error", "timestamp", "kpiId", "kpiIds", 
            "retryCount", "component", "workflowId", "executionId"
        }
        additional_fields = {k: v for k, v in data.items() if k not in known_fields}
        
        return cls(
            trace_id=trace_id,
            error=error,
            timestamp=timestamp,
            kpi_id=kpi_id,
            kpi_ids=kpi_ids,
            retry_count=retry_count,
            component=component,
            workflow_id=workflow_id,
            execution_id=execution_id,
            additional_fields=additional_fields if additional_fields else None
        )
    
    def get_error_message(self) -> str:
        """Extract human-readable error message from flexible error structure"""
        if isinstance(self.error, dict):
            # Try common error message fields
            return (
                self.error.get("message") or 
                self.error.get("error") or 
                self.error.get("description") or
                str(self.error)
            )
        return str(self.error)
    
    def get_error_code(self) -> Optional[str]:
        """Extract error code from flexible error structure"""
        if isinstance(self.error, dict):
            return (
                self.error.get("code") or
                self.error.get("errorCode") or
                self.error.get("status")
            )
        return None
    
    def get_error_type(self) -> Optional[str]:
        """Extract error type/name from flexible error structure"""
        if isinstance(self.error, dict):
            return (
                self.error.get("name") or
                self.error.get("type") or
                self.error.get("errorType")
            )
        return None

# Legacy error response for backward compatibility
@dataclass
class ErrorInfo:
    message: str               # Human-readable error message
    code: Optional[str] = None # Error code for programmatic handling
    component: Optional[str] = None  # Component where error occurred
    details: Optional[Any] = None    # Additional error details
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {"message": self.message}
        if self.code:
            result["code"] = self.code
        if self.component:
            result["component"] = self.component
        if self.details:
            result["details"] = self.details
        return result

@dataclass
class KPIErrorResponse:
    """Legacy error response schema - maintained for backward compatibility"""
    trace_id: str              # Must match the trigger traceId
    timestamp: str             # ISO 8601 timestamp when error occurred
    error: ErrorInfo           # Error information
    kpi_id: Optional[str] = None       # KPI identifier (if applicable)
    kpi_ids: Optional[List[str]] = None # Multiple KPI identifiers (for multi-KPI workflows)
    retry_count: Optional[int] = None  # Number of retry attempts made
    metadata: Optional[Dict[str, Any]] = None  # Additional error context
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "timestamp": self.timestamp,
            "error": self.error.to_dict()
        }
        if self.kpi_id:
            result["kpiId"] = self.kpi_id
        if self.kpi_ids:
            result["kpiIds"] = self.kpi_ids
        if self.retry_count is not None:
            result["retryCount"] = self.retry_count
        if self.metadata:
            result["metadata"] = self.metadata
        return result

# Union type for error responses
KPIErrorResponseUnion = Union[FlexibleKPIErrorResponse, KPIErrorResponse]

def parse_error_response(data: Dict[str, Any]) -> FlexibleKPIErrorResponse:
    """
    Parse any error response JSON into FlexibleKPIErrorResponse.
    This function handles the flexible structure and accepts any key-value pairs.
    """
    return FlexibleKPIErrorResponse.from_dict(data)
```

## Internal Cloudflare Schemas

### Time Series Storage
Schema for storing KPI time series data in Cloudflare KV.

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class TimeSeriesPoint:
    timestamp: str             # ISO 8601 timestamp
    value: float               # Primary KPI value
    metadata: Optional[Dict[str, Any]] = None  # Additional point-specific metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "timestamp": self.timestamp,
            "value": self.value
        }
        if self.metadata:
            result["metadata"] = self.metadata
        return result

@dataclass
class TimeSeriesMetadata:
    source: str                # Primary data source
    created: str               # ISO 8601 timestamp when series was created
    total_points: int          # Total number of data points
    additional_fields: Optional[Dict[str, Any]] = None  # Additional metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "source": self.source,
            "created": self.created,
            "totalPoints": self.total_points
        }
        if self.additional_fields:
            result.update(self.additional_fields)
        return result

@dataclass
class TimeSeriesData:
    kpi_id: str                # KPI identifier
    kpi_type: str              # KPI type for processing logic
    data_points: List[TimeSeriesPoint]  # Time series data points
    last_updated: str          # ISO 8601 timestamp of last update
    metadata: TimeSeriesMetadata       # Series metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "kpiId": self.kpi_id,
            "kpiType": self.kpi_type,
            "dataPoints": [point.to_dict() for point in self.data_points],
            "lastUpdated": self.last_updated,
            "metadata": self.metadata.to_dict()
        }
```

### Job Status Tracking
Schema for tracking job completion status in Cloudflare KV.

```python
from dataclasses import dataclass
from typing import Dict, Optional, Any
from enum import Enum

class JobStatusEnum(Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"

class KPIStatusEnum(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"

@dataclass
class KPIStatus:
    kpi_id: str                # KPI identifier
    status: KPIStatusEnum      # KPI completion status
    completed_at: Optional[str] = None  # ISO 8601 timestamp when KPI completed
    error: Optional[str] = None         # Error message if failed
    retry_count: Optional[int] = None   # Number of retry attempts
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "kpiId": self.kpi_id,
            "status": self.status.value
        }
        if self.completed_at:
            result["completedAt"] = self.completed_at
        if self.error:
            result["error"] = self.error
        if self.retry_count is not None:
            result["retryCount"] = self.retry_count
        return result

@dataclass
class JobMetadata:
    total_kpis: int            # Total number of KPIs in this job
    completed_kpis: int        # Number of completed KPIs
    failed_kpis: int           # Number of failed KPIs
    timeout_threshold: str     # ISO 8601 timestamp for job timeout
    additional_fields: Optional[Dict[str, Any]] = None  # Additional job metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "totalKPIs": self.total_kpis,
            "completedKPIs": self.completed_kpis,
            "failedKPIs": self.failed_kpis,
            "timeoutThreshold": self.timeout_threshold
        }
        if self.additional_fields:
            result.update(self.additional_fields)
        return result

@dataclass
class JobStatus:
    trace_id: str              # Unique job identifier
    status: JobStatusEnum      # Overall job status
    created_at: str            # ISO 8601 timestamp when job was created
    updated_at: str            # ISO 8601 timestamp of last update
    kpis: Dict[str, KPIStatus] # KPI status mapping
    metadata: JobMetadata      # Job metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "traceId": self.trace_id,
            "status": self.status.value,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "kpis": {kpi_id: kpi_status.to_dict() for kpi_id, kpi_status in self.kpis.items()},
            "metadata": self.metadata.to_dict()
        }
```

### KPI Package
Schema for individual KPI packages stored in Cloudflare KV.

```python
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

@dataclass
class KPIAnalysis:
    individual: Optional[str] = None    # Individual KPI analysis from LLM
    insights: Optional[List[str]] = None # Key insights
    alerts: Optional[List[str]] = None   # Alert messages
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {}
        if self.individual:
            result["individual"] = self.individual
        if self.insights:
            result["insights"] = self.insights
        if self.alerts:
            result["alerts"] = self.alerts
        return result

@dataclass
class KPIPackageMetadata:
    source: str                # Data source
    created_at: str            # Package creation timestamp
    quality: Optional[str] = None       # Data quality
    confidence: Optional[float] = None  # Confidence score
    additional_fields: Optional[Dict[str, Any]] = None  # Additional metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "source": self.source,
            "createdAt": self.created_at
        }
        if self.quality:
            result["quality"] = self.quality
        if self.confidence is not None:
            result["confidence"] = self.confidence
        if self.additional_fields:
            result.update(self.additional_fields)
        return result

@dataclass
class KPIPackage:
    trace_id: str              # Job identifier
    kpi_id: str                # KPI identifier
    timestamp: str             # Data timestamp
    kpi_type: str              # KPI type
    data: Dict[str, Any]       # KPI data with flexible structure
    metadata: KPIPackageMetadata        # Package metadata
    chart: Optional[ChartInfo] = None   # Optional chart information
    analysis: Optional[KPIAnalysis] = None  # Optional analysis information
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "kpiId": self.kpi_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type,
            "data": self.data,
            "metadata": self.metadata.to_dict()
        }
        if self.chart:
            result["chart"] = self.chart.to_dict()
        if self.analysis:
            result["analysis"] = self.analysis.to_dict()
        return result
```

## Schema Evolution Guidelines

### Adding New KPI Types
When adding new KPI types or data sources:

1. **Create new response interface** extending the base response schema
2. **Update kpiType enumeration** to include new type identifiers
3. **Document data structure** in the response schema
4. **Update Ingestion Worker** parsing logic to handle new type

### Backward Compatibility
- All schema changes must maintain backward compatibility
- Optional fields should be used for new additions
- Deprecated fields should be marked but not removed immediately
- Version identifiers may be added to schemas if breaking changes are necessary

### CMC Multi-KPI Response
Schema for N8N workflow responses containing multiple KPIs from the CoinMarketCap data source.

```typescript
interface CMCMultiKPIResponse {
  traceId: string;           // Must match the trigger traceId
  timestamp: string;         // Data timestamp (may differ from trigger timestamp)
  kpiType: "cmc-multi";      // Fixed type identifier for CMC multi-KPI responses
  kpiIds: string[];          // Array of KPI identifiers included in this response
  data: {
    "cmc-btc-dominance": number;        // Bitcoin dominance percentage
    "cmc-eth-dominance": number;        // Ethereum dominance percentage
    "cmc-totalmarketcap": number;       // Total crypto market cap in USD
    "cmc-stablecoinmarketcap": number;  // Total stablecoin market cap in USD
  };
  metadata?: {
    source?: string;         // Data source identifier
    quality?: string;        // Data quality indicator
    dataSource?: string;     // Specific data source identifier
    [key: string]: any;      // Additional metadata fields
  };
}
```

### Multi-KPI Response Union Type
Union type for all multi-KPI response schemas.

```python
from typing import Union

# Union type for all multi-KPI response schemas
MultiKPIResponse = Union[CBBIMultiKPIResponse, CMCMultiKPIResponse]

def parse_multi_kpi_response(data: Dict[str, Any]) -> MultiKPIResponse:
    """Parse JSON data into appropriate multi-KPI response type"""
    kpi_type = data.get("kpiType")
    
    if kpi_type == "cbbi-multi":
        return CBBIMultiKPIResponse(
            trace_id=data["traceId"],
            timestamp=data["timestamp"],
            kpi_ids=data.get("kpiIds"),
            data=CBBIData(**{k.replace("-", "_"): v for k, v in data.get("data", {}).items()}),
            metadata=data.get("metadata")
        )
    elif kpi_type == "cmc-multi":
        return CMCMultiKPIResponse(
            trace_id=data["traceId"],
            timestamp=data["timestamp"],
            kpi_ids=data.get("kpiIds"),
            data=CMCData(**{k.replace("-", "_"): v for k, v in data.get("data", {}).items()}),
            metadata=data.get("metadata")
        )
    else:
        raise ValueError(f"Unknown KPI type: {kpi_type}")
```

### Example: Adding New Data Source
```python
# New schema for a hypothetical "coingecko-multi" data source
from dataclasses import dataclass

@dataclass
class CoingeckoData:
    cg_btc_price_usd: float
    cg_market_cap: float
    cg_volume_24h: float
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "cg-btc-price-usd": self.cg_btc_price_usd,
            "cg-market-cap": self.cg_market_cap,
            "cg-volume-24h": self.cg_volume_24h
        }

@dataclass
class CoingeckoMultiKPIResponse:
    trace_id: str
    timestamp: str
    kpi_type: str = "coingecko-multi"
    kpi_ids: Optional[List[str]] = None
    data: Optional[CoingeckoData] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "traceId": self.trace_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type
        }
        if self.kpi_ids:
            result["kpiIds"] = self.kpi_ids
        if self.data:
            result["data"] = self.data.to_dict()
        if self.metadata:
            result["metadata"] = self.metadata
        return result
```

## Ingestion Worker Error Processing

### Error Endpoint Implementation
The Ingestion Worker's `/api/kpi-error` endpoint must handle the flexible error structure:

```python
# Example Ingestion Worker error processing implementation
from typing import Dict, Any
import json
import logging

async def handle_kpi_error(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process flexible error messages from N8N workflows.
    Accepts any JSON structure as long as traceId and error fields are present.
    """
    try:
        # Parse the flexible error response
        error_response = parse_error_response(request_data)
        
        # Extract key information for logging and processing
        trace_id = error_response.trace_id
        error_message = error_response.get_error_message()
        error_code = error_response.get_error_code()
        error_type = error_response.get_error_type()
        
        # Log the error with structured information
        logging.error(
            f"KPI Error - TraceID: {trace_id}, "
            f"Message: {error_message}, "
            f"Code: {error_code}, "
            f"Type: {error_type}"
        )
        
        # Update job status in KV store
        await update_job_status_with_error(
            trace_id=trace_id,
            kpi_id=error_response.kpi_id,
            kpi_ids=error_response.kpi_ids,
            error_message=error_message,
            error_code=error_code,
            retry_count=error_response.retry_count
        )
        
        # Store full error details for debugging
        await store_error_details(trace_id, error_response.to_dict())
        
        return {
            "status": "success",
            "message": "Error processed successfully",
            "traceId": trace_id
        }
        
    except Exception as e:
        logging.error(f"Failed to process error response: {str(e)}")
        return {
            "status": "error", 
            "message": f"Failed to process error: {str(e)}"
        }

async def update_job_status_with_error(
    trace_id: str,
    kpi_id: Optional[str],
    kpi_ids: Optional[List[str]],
    error_message: str,
    error_code: Optional[str],
    retry_count: Optional[int]
):
    """Update job status in KV store with error information"""
    # Implementation would update the job:{traceId} record
    # Mark affected KPIs as failed
    # Update overall job status if needed
    pass

async def store_error_details(trace_id: str, error_data: Dict[str, Any]):
    """Store complete error details for debugging"""
    # Store in KV with key: error:{traceId}:{timestamp}
    # Include full error payload for troubleshooting
    pass
```

### Error Processing Guidelines

1. **Accept All Key-Value Pairs**: The error endpoint must accept any JSON structure with flexible parsing
2. **Required Fields Only**: Only `traceId` and `error` fields are required - all others are optional
3. **Flexible Error Structure**: The `error` field can contain any nested structure (object, string, array)
4. **Graceful Degradation**: Extract what information is available, don't fail on missing optional fields
5. **Comprehensive Logging**: Log both structured data and full error payload for debugging
6. **Job Status Updates**: Update job tracking to reflect failed KPIs appropriately

### Example Error Payloads

```json
// Example 1: Axios HTTP Error (from your provided example)
{
  "traceId": "test-trace-123",
  "error": {
    "message": "401 - API key missing",
    "name": "AxiosError",
    "stack": "AxiosError: Request failed with status code 401...",
    "code": "ERR_BAD_REQUEST",
    "status": 401
  }
}

// Example 2: Simple string error
{
  "traceId": "test-trace-456", 
  "error": "Connection timeout after 30 seconds",
  "kpiId": "btc-price",
  "retryCount": 3
}

// Example 3: Complex nested error with additional fields
{
  "traceId": "test-trace-789",
  "error": {
    "type": "ValidationError",
    "message": "Invalid API response format",
    "details": {
      "expectedFields": ["price", "volume"],
      "receivedFields": ["price"],
      "apiEndpoint": "https://api.example.com/btc"
    }
  },
  "kpiIds": ["btc-price", "btc-volume"],
  "workflowId": "workflow-123",
  "executionId": "exec-456",
  "customField": "any additional data"
}

// Example 4: Minimal error (only required fields)
{
  "traceId": "test-trace-minimal",
  "error": {
    "message": "Unknown error occurred"
  }
}
```

## Validation Rules

### Required Fields
- All schemas must include `traceId` for job tracking
- Error responses must include `error` field (can be any structure)
- All timestamps must be in ISO 8601 format when present
- All numeric values must be finite numbers (not NaN or Infinity)

### Data Constraints
- KPI identifiers must follow kebab-case naming convention
- Ratio values (RHODL, MVRV, Confidence) should be in 0-1 range
- Dominance percentages should be in 0-100 range
- Market cap values must be positive numbers
- Price values must be positive numbers
- Timestamps must be chronologically valid

### Error Handling
- Invalid schema responses should be logged and reported
- Partial data should be accepted with appropriate warnings
- Timeout handling should preserve partial results when possible
- Error responses should be processed regardless of structure complexity
- Missing optional fields should not cause processing failures