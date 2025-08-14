"""
Core data schemas for the Daily Index Tracker system.

This module defines the primary data contracts used for communication
between N8N workflows and Cloudflare Workers, including the main
KPIDataUpdate and KPIErrorUpdate schemas.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, List, Union
from enum import Enum
from datetime import datetime


@dataclass
class ChartInfo:
    """Chart information for KPI visualizations."""
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
class KPIDataUpdate:
    """
    Primary schema for successful KPI data updates from N8N workflows.
    
    This is the main data contract that governs communication between
    N8N workflows and the Cloudflare Ingestion Worker.
    
    The schema is designed to be flexible to accommodate different KPI types
    while maintaining consistency for core tracking fields.
    """
    trace_id: str              # Unique job identifier for tracking
    kpi_id: str                # KPI identifier (for individual KPIs)
    timestamp: str             # ISO 8601 timestamp of the data
    kpi_type: str              # KPI type for processing logic
    data: Dict[str, Any]       # Flexible KPI data structure
    
    # Optional fields
    kpi_ids: Optional[List[str]] = None        # For multi-KPI responses
    chart: Optional[ChartInfo] = None          # Optional chart information
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "kpiId": self.kpi_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type,
            "data": self.data
        }
        
        if self.kpi_ids:
            result["kpiIds"] = self.kpi_ids
        if self.chart:
            result["chart"] = self.chart.to_dict()
        if self.metadata:
            result["metadata"] = self.metadata
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'KPIDataUpdate':
        """Create instance from dictionary with validation"""
        # Validate required fields
        required_fields = ["traceId", "kpiId", "timestamp", "kpiType", "data"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Required field '{field}' missing from KPI data")
        
        # Parse chart info if present
        chart = None
        if "chart" in data and data["chart"]:
            chart_data = data["chart"]
            chart = ChartInfo(
                url=chart_data["url"],
                chart_type=chart_data.get("type", "unknown"),
                time_range=chart_data.get("timeRange", "unknown")
            )
        
        return cls(
            trace_id=data["traceId"],
            kpi_id=data["kpiId"],
            timestamp=data["timestamp"],
            kpi_type=data["kpiType"],
            data=data["data"],
            kpi_ids=data.get("kpiIds"),
            chart=chart,
            metadata=data.get("metadata")
        )
    
    def validate(self) -> bool:
        """Validate the data structure"""
        if not self.trace_id or not self.kpi_id:
            return False
        if not self.timestamp or not self.kpi_type:
            return False
        if not isinstance(self.data, dict):
            return False
        return True


@dataclass
class KPIErrorUpdate:
    """
    Primary schema for KPI error updates from N8N workflows.
    
    This schema handles error reporting with maximum flexibility to accommodate
    different error structures from various N8N workflows and external services.
    
    The design accepts any error structure while ensuring core tracking
    information is always available.
    """
    trace_id: str                           # Required for job tracking
    error: Dict[str, Any]                   # Flexible error object
    
    # Optional identification fields
    timestamp: Optional[str] = None         # When error occurred
    kpi_id: Optional[str] = None           # Single KPI identifier
    kpi_ids: Optional[List[str]] = None    # Multiple KPI identifiers
    
    # Optional error context
    retry_count: Optional[int] = None      # Number of retry attempts
    component: Optional[str] = None        # Component where error occurred
    workflow_id: Optional[str] = None      # N8N workflow identifier
    execution_id: Optional[str] = None     # N8N execution identifier
    
    # Maximum flexibility for additional fields
    additional_fields: Optional[Dict[str, Any]] = None
    
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
    def from_dict(cls, data: Dict[str, Any]) -> 'KPIErrorUpdate':
        """Create instance from dictionary with flexible parsing"""
        # Validate required fields
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
            code = (
                self.error.get("code") or
                self.error.get("errorCode")
            )
            if code:
                return str(code)
            # Try status as fallback
            status = self.error.get("status")
            if status:
                return str(status)
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
    
    def validate(self) -> bool:
        """Validate the error structure"""
        if not self.trace_id:
            return False
        if not self.error:
            return False
        return True


# Supporting schemas for internal Cloudflare operations

class JobStatusEnum(Enum):
    """Job status enumeration"""
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class KPIStatusEnum(Enum):
    """Individual KPI status enumeration"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class TimeSeriesPoint:
    """Individual time series data point"""
    timestamp: str             # ISO 8601 timestamp
    value: float               # Primary KPI value
    metadata: Optional[Dict[str, Any]] = None  # Additional point metadata
    
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
class TimeSeriesData:
    """Time series storage schema for Cloudflare KV"""
    kpi_id: str                # KPI identifier
    kpi_type: str              # KPI type for processing logic
    data_points: List[TimeSeriesPoint]  # Time series data points
    last_updated: str          # ISO 8601 timestamp of last update
    metadata: Dict[str, Any]   # Series metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "kpiId": self.kpi_id,
            "kpiType": self.kpi_type,
            "dataPoints": [point.to_dict() for point in self.data_points],
            "lastUpdated": self.last_updated,
            "metadata": self.metadata
        }


@dataclass
class KPIStatus:
    """Individual KPI status within a job"""
    kpi_id: str                # KPI identifier
    status: KPIStatusEnum      # KPI completion status
    completed_at: Optional[str] = None  # ISO 8601 timestamp when completed
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
class JobStatus:
    """Job status tracking schema for Cloudflare KV"""
    trace_id: str              # Unique job identifier
    status: JobStatusEnum      # Overall job status
    created_at: str            # ISO 8601 timestamp when job was created
    updated_at: str            # ISO 8601 timestamp of last update
    kpis: Dict[str, KPIStatus] # KPI status mapping
    metadata: Dict[str, Any]   # Job metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "traceId": self.trace_id,
            "status": self.status.value,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "kpis": {kpi_id: kpi_status.to_dict() for kpi_id, kpi_status in self.kpis.items()},
            "metadata": self.metadata
        }


@dataclass
class KPIPackage:
    """Individual KPI package schema for Cloudflare KV"""
    trace_id: str              # Job identifier
    kpi_id: str                # KPI identifier
    timestamp: str             # Data timestamp
    kpi_type: str              # KPI type
    data: Dict[str, Any]       # KPI data with flexible structure
    metadata: Dict[str, Any]   # Package metadata
    chart: Optional[ChartInfo] = None   # Optional chart information
    analysis: Optional[Dict[str, Any]] = None  # Optional analysis information
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "kpiId": self.kpi_id,
            "timestamp": self.timestamp,
            "kpiType": self.kpi_type,
            "data": self.data,
            "metadata": self.metadata
        }
        if self.chart:
            result["chart"] = self.chart.to_dict()
        if self.analysis:
            result["analysis"] = self.analysis
        return result


# Utility functions for parsing and validation

def parse_kpi_data_update(data: Dict[str, Any]) -> KPIDataUpdate:
    """
    Parse JSON data into KPIDataUpdate with validation.
    
    Args:
        data: Dictionary containing KPI data from N8N workflow
        
    Returns:
        KPIDataUpdate instance
        
    Raises:
        ValueError: If required fields are missing or invalid
    """
    return KPIDataUpdate.from_dict(data)


def parse_kpi_error_update(data: Dict[str, Any]) -> KPIErrorUpdate:
    """
    Parse JSON data into KPIErrorUpdate with flexible error handling.
    
    Args:
        data: Dictionary containing error data from N8N workflow
        
    Returns:
        KPIErrorUpdate instance
        
    Raises:
        ValueError: If required fields are missing
    """
    return KPIErrorUpdate.from_dict(data)


# Type aliases for convenience
KPIUpdate = Union[KPIDataUpdate, KPIErrorUpdate]