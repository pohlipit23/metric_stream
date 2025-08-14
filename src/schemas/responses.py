"""
Response schemas for N8N workflow outputs.

This module defines the specific response structures that N8N workflows
send back to Cloudflare Workers, including multi-KPI responses and
individual KPI responses.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Union
from core import ChartInfo, KPIDataUpdate, KPIErrorUpdate


# Multi-KPI Data Structures

@dataclass
class CBBIData:
    """CBBI (Coin Bureau Bitcoin Index) data structure"""
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
class CMCData:
    """CoinMarketCap data structure"""
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


# Response Schemas

@dataclass
class IndividualKPIResponse:
    """
    Schema for N8N workflow responses containing a single KPI.
    
    This response type is used by individual KPI workflows that collect
    data for a single KPI and optionally generate a chart.
    """
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
    
    def to_kpi_data_update(self) -> KPIDataUpdate:
        """Convert to KPIDataUpdate for ingestion processing"""
        return KPIDataUpdate(
            trace_id=self.trace_id,
            kpi_id=self.kpi_id,
            timestamp=self.timestamp,
            kpi_type=self.kpi_type,
            data=self.data,
            chart=self.chart,
            metadata=self.metadata
        )


@dataclass
class CBBIMultiKPIResponse:
    """
    Schema for N8N workflow responses containing multiple KPIs from the CBBI data source.
    
    This response type is used by workflows that collect multiple related KPIs
    from the Coin Bureau Bitcoin Index in a single operation.
    """
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
    
    def to_kpi_data_updates(self) -> List[KPIDataUpdate]:
        """Convert to multiple KPIDataUpdate instances for ingestion processing"""
        if not self.data or not self.kpi_ids:
            return []
        
        updates = []
        data_dict = self.data.to_dict()
        
        for kpi_id in self.kpi_ids:
            # Extract the specific value for this KPI
            kpi_value = data_dict.get(kpi_id)
            if kpi_value is not None:
                updates.append(KPIDataUpdate(
                    trace_id=self.trace_id,
                    kpi_id=kpi_id,
                    timestamp=self.timestamp,
                    kpi_type=self.kpi_type,
                    data={"value": kpi_value},
                    kpi_ids=self.kpi_ids,
                    metadata=self.metadata
                ))
        
        return updates


@dataclass
class CMCMultiKPIResponse:
    """
    Schema for N8N workflow responses containing multiple KPIs from the CoinMarketCap data source.
    
    This response type is used by workflows that collect multiple related KPIs
    from CoinMarketCap in a single operation.
    """
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
    
    def to_kpi_data_updates(self) -> List[KPIDataUpdate]:
        """Convert to multiple KPIDataUpdate instances for ingestion processing"""
        if not self.data or not self.kpi_ids:
            return []
        
        updates = []
        data_dict = self.data.to_dict()
        
        for kpi_id in self.kpi_ids:
            # Extract the specific value for this KPI
            kpi_value = data_dict.get(kpi_id)
            if kpi_value is not None:
                updates.append(KPIDataUpdate(
                    trace_id=self.trace_id,
                    kpi_id=kpi_id,
                    timestamp=self.timestamp,
                    kpi_type=self.kpi_type,
                    data={"value": kpi_value},
                    kpi_ids=self.kpi_ids,
                    metadata=self.metadata
                ))
        
        return updates


# Flexible Error Response (alias to core KPIErrorUpdate)
FlexibleKPIErrorResponse = KPIErrorUpdate


# Union Types and Parsing Functions

# Union type for all multi-KPI response schemas
MultiKPIResponse = Union[CBBIMultiKPIResponse, CMCMultiKPIResponse]

# Union type for all response schemas
KPIResponse = Union[IndividualKPIResponse, CBBIMultiKPIResponse, CMCMultiKPIResponse]


def parse_multi_kpi_response(data: Dict[str, Any]) -> MultiKPIResponse:
    """
    Parse JSON data into appropriate multi-KPI response type.
    
    Args:
        data: Dictionary containing multi-KPI response data
        
    Returns:
        Appropriate MultiKPIResponse instance
        
    Raises:
        ValueError: If KPI type is unknown or data is invalid
    """
    kpi_type = data.get("kpiType")
    
    if kpi_type == "cbbi-multi":
        cbbi_data = None
        if "data" in data and data["data"]:
            # Convert kebab-case keys to snake_case for dataclass
            raw_data = data["data"]
            cbbi_data = CBBIData(
                cbbi_btc_price_usd=raw_data.get("cbbi-btc-price-usd", 0.0),
                cbbi_rhodl=raw_data.get("cbbi-rhodl", 0.0),
                cbbi_mvrv=raw_data.get("cbbi-mvrv", 0.0),
                cbbi_confidence=raw_data.get("cbbi-confidence", 0.0)
            )
        
        return CBBIMultiKPIResponse(
            trace_id=data["traceId"],
            timestamp=data["timestamp"],
            kpi_ids=data.get("kpiIds"),
            data=cbbi_data,
            metadata=data.get("metadata")
        )
    
    elif kpi_type == "cmc-multi":
        cmc_data = None
        if "data" in data and data["data"]:
            # Convert kebab-case keys to snake_case for dataclass
            raw_data = data["data"]
            cmc_data = CMCData(
                cmc_btc_dominance=raw_data.get("cmc-btc-dominance", 0.0),
                cmc_eth_dominance=raw_data.get("cmc-eth-dominance", 0.0),
                cmc_totalmarketcap_usd=raw_data.get("cmc-totalmarketcap-usd", 0.0),
                cmc_stablecoinmarketcap_usd=raw_data.get("cmc-stablecoinmarketcap-usd", 0.0)
            )
        
        return CMCMultiKPIResponse(
            trace_id=data["traceId"],
            timestamp=data["timestamp"],
            kpi_ids=data.get("kpiIds"),
            data=cmc_data,
            metadata=data.get("metadata")
        )
    
    else:
        raise ValueError(f"Unknown multi-KPI type: {kpi_type}")


def parse_individual_kpi_response(data: Dict[str, Any]) -> IndividualKPIResponse:
    """
    Parse JSON data into IndividualKPIResponse.
    
    Args:
        data: Dictionary containing individual KPI response data
        
    Returns:
        IndividualKPIResponse instance
        
    Raises:
        ValueError: If required fields are missing
    """
    # Parse chart info if present
    chart = None
    if "chart" in data and data["chart"]:
        chart_data = data["chart"]
        chart = ChartInfo(
            url=chart_data["url"],
            chart_type=chart_data.get("type", "unknown"),
            time_range=chart_data.get("timeRange", "unknown")
        )
    
    return IndividualKPIResponse(
        trace_id=data["traceId"],
        kpi_id=data["kpiId"],
        timestamp=data["timestamp"],
        kpi_type=data["kpiType"],
        data=data["data"],
        chart=chart,
        metadata=data.get("metadata")
    )


def parse_kpi_response(data: Dict[str, Any]) -> KPIResponse:
    """
    Parse JSON data into appropriate KPI response type.
    
    Args:
        data: Dictionary containing KPI response data
        
    Returns:
        Appropriate KPIResponse instance
        
    Raises:
        ValueError: If response type cannot be determined or data is invalid
    """
    kpi_type = data.get("kpiType")
    
    # Check if it's a multi-KPI response
    if kpi_type in ["cbbi-multi", "cmc-multi"]:
        return parse_multi_kpi_response(data)
    
    # Check if it has kpiId (individual KPI response)
    elif "kpiId" in data:
        return parse_individual_kpi_response(data)
    
    else:
        raise ValueError("Cannot determine KPI response type from data structure")


def parse_error_response(data: Dict[str, Any]) -> KPIErrorUpdate:
    """
    Parse any error response JSON into KPIErrorUpdate.
    
    This function handles the flexible error structure and accepts any key-value pairs.
    
    Args:
        data: Dictionary containing error response data
        
    Returns:
        KPIErrorUpdate instance
        
    Raises:
        ValueError: If required fields are missing
    """
    return KPIErrorUpdate.from_dict(data)