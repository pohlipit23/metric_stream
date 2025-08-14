"""
Trigger schemas for initiating N8N workflows from Cloudflare Workers.

This module defines the data structures used when Cloudflare Workers
trigger N8N workflows via webhook calls.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any, List


@dataclass
class IndividualKPITrigger:
    """
    Schema for triggering individual KPI workflows from Cloudflare Scheduler Worker to N8N.
    
    This trigger is used for KPIs that have their own dedicated N8N workflow.
    """
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
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'IndividualKPITrigger':
        """Create instance from dictionary"""
        return cls(
            trace_id=data["traceId"],
            kpi_id=data["kpiId"],
            timestamp=data["timestamp"],
            kpi_type=data["kpiType"],
            metadata=data.get("metadata")
        )


@dataclass
class MultiKPITrigger:
    """
    Schema for triggering workflows that collect multiple KPIs from a single data source.
    
    This trigger is used for workflows that can efficiently collect multiple related
    KPIs in a single operation (e.g., CBBI multi-KPI workflow).
    """
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
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MultiKPITrigger':
        """Create instance from dictionary"""
        return cls(
            trace_id=data["traceId"],
            kpi_ids=data["kpiIds"],
            timestamp=data["timestamp"],
            kpi_type=data["kpiType"],
            metadata=data.get("metadata")
        )


@dataclass
class QueueTrigger:
    """
    Schema for triggering aggregate workflows via Cloudflare Queues.
    
    This trigger is used for LLM Analysis, Packaging, and Delivery workflows
    that are triggered by queue messages.
    """
    trace_id: str              # Unique job identifier
    queue_type: str            # Queue type (e.g., "llm_analysis", "packaging", "delivery")
    timestamp: str             # ISO 8601 timestamp when message was queued
    metadata: Optional[Dict[str, Any]] = None  # Additional queue metadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "traceId": self.trace_id,
            "queueType": self.queue_type,
            "timestamp": self.timestamp
        }
        if self.metadata:
            result["metadata"] = self.metadata
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'QueueTrigger':
        """Create instance from dictionary"""
        return cls(
            trace_id=data["traceId"],
            queue_type=data["queueType"],
            timestamp=data["timestamp"],
            metadata=data.get("metadata")
        )