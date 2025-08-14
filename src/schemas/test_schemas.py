#!/usr/bin/env python3
"""
Basic test script to verify the schemas work correctly.

This script tests the core functionality of the KPIDataUpdate and KPIErrorUpdate
schemas to ensure they can be created, serialized, and parsed correctly.
"""

import json
from datetime import datetime
from typing import Dict, Any

# Import the schemas
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core import (
    KPIDataUpdate, 
    KPIErrorUpdate, 
    ChartInfo,
    parse_kpi_data_update,
    parse_kpi_error_update
)

# Import responses with absolute imports
import responses
from responses import (
    IndividualKPIResponse,
    CBBIMultiKPIResponse,
    CMCMultiKPIResponse,
    CBBIData,
    CMCData,
    parse_multi_kpi_response,
    parse_individual_kpi_response
)


def test_kpi_data_update():
    """Test KPIDataUpdate schema"""
    print("Testing KPIDataUpdate...")
    
    # Create a KPIDataUpdate instance
    chart = ChartInfo(
        url="https://example.com/chart.png",
        chart_type="line",
        time_range="24h"
    )
    
    update = KPIDataUpdate(
        trace_id="trace_20250814_143022_abc123",
        kpi_id="cmc-btc-price",
        timestamp="2025-08-14T14:30:22Z",
        kpi_type="price",
        data={"value": 45000.0, "volume": 1000000},
        chart=chart,
        metadata={"source": "coinmarketcap", "quality": "high"}
    )
    
    # Test validation
    assert update.validate(), "KPIDataUpdate validation failed"
    
    # Test serialization
    json_data = update.to_dict()
    print(f"Serialized: {json.dumps(json_data, indent=2)}")
    
    # Test deserialization
    parsed_update = parse_kpi_data_update(json_data)
    assert parsed_update.trace_id == update.trace_id
    assert parsed_update.kpi_id == update.kpi_id
    assert parsed_update.data == update.data
    
    print("✓ KPIDataUpdate test passed")


def test_kpi_error_update():
    """Test KPIErrorUpdate schema"""
    print("\nTesting KPIErrorUpdate...")
    
    # Create a KPIErrorUpdate instance with flexible error structure
    error_update = KPIErrorUpdate(
        trace_id="trace_20250814_143022_abc123",
        error={
            "message": "401 - API key missing",
            "name": "AxiosError",
            "code": "ERR_BAD_REQUEST",
            "status": 401,
            "stack": "AxiosError: Request failed with status code 401..."
        },
        kpi_id="cmc-btc-price",
        timestamp="2025-08-14T14:30:22Z",
        retry_count=2,
        component="data_collection"
    )
    
    # Test validation
    assert error_update.validate(), "KPIErrorUpdate validation failed"
    
    # Test error extraction methods
    assert error_update.get_error_message() == "401 - API key missing"
    assert error_update.get_error_code() == "ERR_BAD_REQUEST"
    assert error_update.get_error_type() == "AxiosError"
    
    # Test serialization
    json_data = error_update.to_dict()
    print(f"Serialized: {json.dumps(json_data, indent=2)}")
    
    # Test deserialization
    parsed_error = parse_kpi_error_update(json_data)
    assert parsed_error.trace_id == error_update.trace_id
    assert parsed_error.get_error_message() == error_update.get_error_message()
    
    print("✓ KPIErrorUpdate test passed")


def test_multi_kpi_responses():
    """Test multi-KPI response schemas"""
    print("\nTesting Multi-KPI Responses...")
    
    # Test CBBI Multi-KPI Response
    cbbi_data = CBBIData(
        cbbi_btc_price_usd=45000.0,
        cbbi_rhodl=0.75,
        cbbi_mvrv=0.65,
        cbbi_confidence=0.80
    )
    
    cbbi_response = CBBIMultiKPIResponse(
        trace_id="trace_123",
        timestamp="2025-08-14T14:30:22Z",
        kpi_ids=["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"],
        data=cbbi_data,
        metadata={"source": "cbbi"}
    )
    
    # Test conversion to KPIDataUpdate instances
    updates = cbbi_response.to_kpi_data_updates()
    assert len(updates) == 4, f"Expected 4 updates, got {len(updates)}"
    
    # Test serialization and parsing
    json_data = cbbi_response.to_dict()
    parsed_response = parse_multi_kpi_response(json_data)
    assert isinstance(parsed_response, CBBIMultiKPIResponse)
    assert parsed_response.trace_id == cbbi_response.trace_id
    
    print("✓ CBBI Multi-KPI Response test passed")
    
    # Test CMC Multi-KPI Response
    cmc_data = CMCData(
        cmc_btc_dominance=42.5,
        cmc_eth_dominance=18.3,
        cmc_totalmarketcap_usd=2500000000000,
        cmc_stablecoinmarketcap_usd=150000000000
    )
    
    cmc_response = CMCMultiKPIResponse(
        trace_id="trace_456",
        timestamp="2025-08-14T14:30:22Z",
        kpi_ids=["cmc-btc-dominance", "cmc-eth-dominance", "cmc-totalmarketcap-usd", "cmc-stablecoinmarketcap-usd"],
        data=cmc_data,
        metadata={"source": "coinmarketcap"}
    )
    
    # Test conversion to KPIDataUpdate instances
    updates = cmc_response.to_kpi_data_updates()
    assert len(updates) == 4, f"Expected 4 updates, got {len(updates)}"
    
    print("✓ CMC Multi-KPI Response test passed")


def test_individual_kpi_response():
    """Test individual KPI response schema"""
    print("\nTesting Individual KPI Response...")
    
    chart = ChartInfo(
        url="https://example.com/btc-chart.png",
        chart_type="candlestick",
        time_range="7d"
    )
    
    response = IndividualKPIResponse(
        trace_id="trace_789",
        kpi_id="btc-price-binance",
        timestamp="2025-08-14T14:30:22Z",
        kpi_type="price",
        data={"value": 45123.45, "volume": 987654321, "change_24h": 2.5},
        chart=chart,
        metadata={"exchange": "binance", "pair": "BTC/USDT"}
    )
    
    # Test conversion to KPIDataUpdate
    update = response.to_kpi_data_update()
    assert update.trace_id == response.trace_id
    assert update.kpi_id == response.kpi_id
    assert update.data == response.data
    
    # Test serialization and parsing
    json_data = response.to_dict()
    parsed_response = parse_individual_kpi_response(json_data)
    assert parsed_response.trace_id == response.trace_id
    assert parsed_response.kpi_id == response.kpi_id
    
    print("✓ Individual KPI Response test passed")


def test_flexible_error_parsing():
    """Test flexible error parsing with various error structures"""
    print("\nTesting Flexible Error Parsing...")
    
    # Test with minimal error structure
    minimal_error = {
        "traceId": "trace_minimal",
        "error": "Simple error message"
    }
    
    parsed = parse_kpi_error_update(minimal_error)
    assert parsed.trace_id == "trace_minimal"
    assert parsed.get_error_message() == "Simple error message"
    
    # Test with complex nested error structure
    complex_error = {
        "traceId": "trace_complex",
        "error": {
            "message": "Network timeout",
            "code": "TIMEOUT",
            "details": {
                "url": "https://api.example.com",
                "timeout": 30000,
                "retries": 3
            }
        },
        "kpiId": "test-kpi",
        "timestamp": "2025-08-14T14:30:22Z",
        "customField": "custom_value"
    }
    
    parsed = parse_kpi_error_update(complex_error)
    assert parsed.trace_id == "trace_complex"
    assert parsed.get_error_message() == "Network timeout"
    assert parsed.get_error_code() == "TIMEOUT"
    assert parsed.kpi_id == "test-kpi"
    assert parsed.additional_fields["customField"] == "custom_value"
    
    print("✓ Flexible Error Parsing test passed")


def main():
    """Run all tests"""
    print("Running Schema Tests...")
    print("=" * 50)
    
    try:
        test_kpi_data_update()
        test_kpi_error_update()
        test_multi_kpi_responses()
        test_individual_kpi_response()
        test_flexible_error_parsing()
        
        print("\n" + "=" * 50)
        print("✅ All tests passed! Schemas are working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        raise


if __name__ == "__main__":
    main()