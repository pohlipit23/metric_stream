#!/usr/bin/env python3
"""
Example usage of the Daily Index Tracker schemas.

This file demonstrates how to use the schemas in real-world scenarios
that the Ingestion Worker will encounter.
"""

import json
from datetime import datetime
from typing import Dict, Any

# Import the schemas
from core import KPIDataUpdate, KPIErrorUpdate, ChartInfo
from responses import (
    IndividualKPIResponse,
    CBBIMultiKPIResponse, 
    CMCMultiKPIResponse,
    CBBIData,
    CMCData
)


def example_individual_kpi_workflow():
    """Example: Individual KPI workflow sends data to Ingestion Worker"""
    print("=== Individual KPI Workflow Example ===")
    
    # Simulate N8N workflow collecting BTC price data
    n8n_response = IndividualKPIResponse(
        trace_id="trace_20250814_143022_abc123",
        kpi_id="binance-btc-usdt",
        timestamp="2025-08-14T14:30:22Z",
        kpi_type="price",
        data={
            "value": 45123.45,
            "volume": 987654321,
            "change_24h": 2.5,
            "high_24h": 46000.0,
            "low_24h": 44500.0
        },
        chart=ChartInfo(
            url="https://chart-service.com/btc-24h.png",
            chart_type="candlestick",
            time_range="24h"
        ),
        metadata={
            "exchange": "binance",
            "pair": "BTC/USDT",
            "data_quality": "high"
        }
    )
    
    # Convert to KPIDataUpdate for Ingestion Worker
    kpi_update = n8n_response.to_kpi_data_update()
    
    # Serialize for HTTP transmission
    json_payload = kpi_update.to_dict()
    print(f"JSON Payload to Ingestion Worker:")
    print(json.dumps(json_payload, indent=2))
    
    # Simulate Ingestion Worker processing
    print(f"\nIngestion Worker would:")
    print(f"- Store in KV: timeseries:{kpi_update.kpi_id}")
    print(f"- Create package: package:{kpi_update.trace_id}:{kpi_update.kpi_id}")
    print(f"- Update job: job:{kpi_update.trace_id}")
    
    return kpi_update


def example_multi_kpi_workflow():
    """Example: Multi-KPI workflow sends multiple KPIs to Ingestion Worker"""
    print("\n=== Multi-KPI Workflow Example ===")
    
    # Simulate N8N workflow collecting CBBI data (multiple KPIs)
    cbbi_data = CBBIData(
        cbbi_btc_price_usd=45123.45,
        cbbi_rhodl=0.75,
        cbbi_mvrv=0.65,
        cbbi_confidence=0.80
    )
    
    n8n_response = CBBIMultiKPIResponse(
        trace_id="trace_20250814_143022_def456",
        timestamp="2025-08-14T14:30:22Z",
        kpi_ids=["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"],
        data=cbbi_data,
        metadata={
            "source": "cbbi",
            "data_quality": "high",
            "collection_time_ms": 1250
        }
    )
    
    # Convert to individual KPI updates for processing
    kpi_updates = n8n_response.to_kpi_data_updates()
    
    print(f"Multi-KPI response converted to {len(kpi_updates)} individual updates:")
    for i, update in enumerate(kpi_updates, 1):
        print(f"\n{i}. KPI: {update.kpi_id}")
        print(f"   Data: {update.data}")
        print(f"   Would store in: timeseries:{update.kpi_id}")
    
    return kpi_updates


def example_error_handling():
    """Example: N8N workflow reports error to Ingestion Worker"""
    print("\n=== Error Handling Example ===")
    
    # Simulate N8N workflow encountering an API error
    error_scenarios = [
        {
            "name": "API Authentication Error",
            "error_data": {
                "traceId": "trace_20250814_143022_error1",
                "kpiId": "coinmarketcap-btc-price",
                "timestamp": "2025-08-14T14:30:22Z",
                "error": {
                    "message": "401 - Invalid API key",
                    "name": "AxiosError",
                    "code": "ERR_BAD_REQUEST",
                    "status": 401,
                    "config": {
                        "url": "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
                        "method": "get"
                    }
                },
                "retryCount": 2,
                "component": "data_collection"
            }
        },
        {
            "name": "Network Timeout Error",
            "error_data": {
                "traceId": "trace_20250814_143022_error2",
                "kpiIds": ["cbbi-btc-price-usd", "cbbi-rhodl"],
                "error": {
                    "message": "Network timeout after 30 seconds",
                    "code": "TIMEOUT",
                    "details": {
                        "timeout_ms": 30000,
                        "url": "https://cbbi.info/api/data"
                    }
                },
                "workflowId": "cbbi-multi-kpi-workflow",
                "executionId": "exec_12345"
            }
        },
        {
            "name": "Simple Error Message",
            "error_data": {
                "traceId": "trace_20250814_143022_error3",
                "error": "Chart generation service unavailable"
            }
        }
    ]
    
    for scenario in error_scenarios:
        print(f"\n--- {scenario['name']} ---")
        
        # Parse the error using flexible schema
        error_update = KPIErrorUpdate.from_dict(scenario['error_data'])
        
        # Extract structured information
        print(f"Trace ID: {error_update.trace_id}")
        print(f"Error Message: {error_update.get_error_message()}")
        print(f"Error Code: {error_update.get_error_code()}")
        print(f"Error Type: {error_update.get_error_type()}")
        
        if error_update.kpi_id:
            print(f"Affected KPI: {error_update.kpi_id}")
        if error_update.kpi_ids:
            print(f"Affected KPIs: {', '.join(error_update.kpi_ids)}")
        
        # Show what Ingestion Worker would do
        print(f"Ingestion Worker would:")
        print(f"- Update job status: job:{error_update.trace_id}")
        print(f"- Store error details: error:{error_update.trace_id}:timestamp")
        print(f"- Log for monitoring: {error_update.get_error_message()}")


def example_ingestion_worker_processing():
    """Example: How Ingestion Worker processes different payload types"""
    print("\n=== Ingestion Worker Processing Example ===")
    
    # Simulate different types of incoming requests
    payloads = [
        {
            "type": "Individual KPI Success",
            "data": {
                "traceId": "trace_123",
                "kpiId": "btc-price",
                "timestamp": "2025-08-14T14:30:22Z",
                "kpiType": "price",
                "data": {"value": 45000.0}
            }
        },
        {
            "type": "Multi-KPI Success", 
            "data": {
                "traceId": "trace_456",
                "timestamp": "2025-08-14T14:30:22Z",
                "kpiType": "cmc-multi",
                "kpiIds": ["cmc-btc-dominance", "cmc-eth-dominance"],
                "data": {
                    "cmc-btc-dominance": 42.5,
                    "cmc-eth-dominance": 18.3
                }
            },
            "is_multi_kpi": True
        },
        {
            "type": "Error Report",
            "data": {
                "traceId": "trace_789",
                "kpiId": "failed-kpi",
                "error": {
                    "message": "Data source unavailable",
                    "code": "SERVICE_UNAVAILABLE"
                }
            }
        }
    ]
    
    for payload in payloads:
        print(f"\n--- Processing {payload['type']} ---")
        
        try:
            if "error" in payload['data']:
                # Handle as error
                error_update = KPIErrorUpdate.from_dict(payload['data'])
                print(f"✓ Parsed as KPIErrorUpdate")
                print(f"  Error: {error_update.get_error_message()}")
                print(f"  Action: Update job status with error")
            elif payload.get("is_multi_kpi"):
                # Handle as multi-KPI response (needs conversion)
                from responses import parse_multi_kpi_response
                multi_response = parse_multi_kpi_response(payload['data'])
                kpi_updates = multi_response.to_kpi_data_updates()
                print(f"✓ Parsed as Multi-KPI Response")
                print(f"  Converted to {len(kpi_updates)} individual KPI updates")
                for update in kpi_updates:
                    print(f"    - {update.kpi_id}: {update.data}")
                print(f"  Action: Process each KPI individually")
            else:
                # Handle as individual KPI data update
                kpi_update = KPIDataUpdate.from_dict(payload['data'])
                print(f"✓ Parsed as KPIDataUpdate")
                print(f"  KPI: {kpi_update.kpi_id}")
                print(f"  Data: {kpi_update.data}")
                print(f"  Action: Store in time series and create package")
                
        except Exception as e:
            print(f"✗ Parsing failed: {e}")


def main():
    """Run all examples"""
    print("Daily Index Tracker Schema Examples")
    print("=" * 50)
    
    example_individual_kpi_workflow()
    example_multi_kpi_workflow()
    example_error_handling()
    example_ingestion_worker_processing()
    
    print("\n" + "=" * 50)
    print("Examples completed successfully!")


if __name__ == "__main__":
    main()