"""
Shared schemas module for the Daily Index Tracker system.

This module defines all data schemas and classes used for communication 
between N8N workflows and Cloudflare Workers.
"""

from .core import (
    KPIDataUpdate,
    KPIErrorUpdate,
    ChartInfo,
    TimeSeriesPoint,
    TimeSeriesData,
    JobStatus,
    KPIPackage
)

from .triggers import (
    IndividualKPITrigger,
    MultiKPITrigger
)

from .responses import (
    IndividualKPIResponse,
    CBBIMultiKPIResponse,
    CMCMultiKPIResponse,
    FlexibleKPIErrorResponse,
    MultiKPIResponse,
    parse_multi_kpi_response,
    parse_error_response
)

__all__ = [
    # Core schemas
    "KPIDataUpdate",
    "KPIErrorUpdate", 
    "ChartInfo",
    "TimeSeriesPoint",
    "TimeSeriesData",
    "JobStatus",
    "KPIPackage",
    
    # Trigger schemas
    "IndividualKPITrigger",
    "MultiKPITrigger",
    
    # Response schemas
    "IndividualKPIResponse",
    "CBBIMultiKPIResponse", 
    "CMCMultiKPIResponse",
    "FlexibleKPIErrorResponse",
    "MultiKPIResponse",
    
    # Utility functions
    "parse_multi_kpi_response",
    "parse_error_response"
]