#!/usr/bin/env python3
"""
N8N Webhook Validation Script

This script validates the actual JSON payloads from N8N workflows against
the defined schemas to ensure data contract compliance.
"""

import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
import sys
import os

# Add schemas to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'schemas'))

from core import KPIDataUpdate, KPIErrorUpdate
from responses import parse_multi_kpi_response, CBBIMultiKPIResponse, CMCMultiKPIResponse
from triggers import MultiKPITrigger


class WebhookValidator:
    """Validates N8N webhook responses against defined schemas"""
    
    def __init__(self, base_url: str = "http://localhost:5678"):
        self.base_url = base_url
        self.validation_results = []
    
    def create_test_trigger(self, kpi_type: str, kpi_ids: List[str]) -> Dict[str, Any]:
        """Create a test trigger payload"""
        trigger = MultiKPITrigger(
            trace_id=f"validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{kpi_type}",
            kpi_ids=kpi_ids,
            timestamp=datetime.now().isoformat() + "Z",
            kpi_type=kpi_type,
            metadata={"validation": True, "test_run": True}
        )
        return trigger.to_dict()
    
    def test_webhook(self, webhook_path: str, trigger_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Test a webhook endpoint with a trigger payload"""
        url = f"{self.base_url}/webhook/{webhook_path}"
        
        try:
            response = requests.post(
                url,
                json=trigger_payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Webhook {webhook_path} returned {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to call webhook {webhook_path}: {e}")
            return None
    
    def validate_cbbi_response(self, response_data: Dict[str, Any]) -> bool:
        """Validate CBBI multi-KPI response"""
        try:
            # Parse using the schema
            cbbi_response = parse_multi_kpi_response(response_data)
            
            if not isinstance(cbbi_response, CBBIMultiKPIResponse):
                print(f"❌ Expected CBBIMultiKPIResponse, got {type(cbbi_response)}")
                return False
            
            # Validate required fields
            required_fields = ["trace_id", "timestamp", "kpi_type"]
            for field in required_fields:
                if not getattr(cbbi_response, field):
                    print(f"❌ Missing required field: {field}")
                    return False
            
            # Validate KPI type
            if cbbi_response.kpi_type != "cbbi-multi":
                print(f"❌ Expected kpiType 'cbbi-multi', got '{cbbi_response.kpi_type}'")
                return False
            
            # Validate data structure
            if cbbi_response.data:
                expected_kpis = ["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"]
                data_dict = cbbi_response.data.to_dict()
                
                for kpi in expected_kpis:
                    if kpi not in data_dict:
                        print(f"❌ Missing expected KPI in data: {kpi}")
                        return False
                    
                    if not isinstance(data_dict[kpi], (int, float)):
                        print(f"❌ KPI {kpi} should be numeric, got {type(data_dict[kpi])}")
                        return False
            
            # Test conversion to individual KPI updates
            kpi_updates = cbbi_response.to_kpi_data_updates()
            if len(kpi_updates) == 0:
                print(f"❌ Failed to convert to individual KPI updates")
                return False
            
            print(f"✅ CBBI response validation passed")
            print(f"   - Converted to {len(kpi_updates)} individual KPI updates")
            return True
            
        except Exception as e:
            print(f"❌ CBBI validation failed: {e}")
            return False
    
    def validate_cmc_response(self, response_data: Dict[str, Any]) -> bool:
        """Validate CMC multi-KPI response"""
        try:
            # Parse using the schema
            cmc_response = parse_multi_kpi_response(response_data)
            
            if not isinstance(cmc_response, CMCMultiKPIResponse):
                print(f"❌ Expected CMCMultiKPIResponse, got {type(cmc_response)}")
                return False
            
            # Validate required fields
            required_fields = ["trace_id", "timestamp", "kpi_type"]
            for field in required_fields:
                if not getattr(cmc_response, field):
                    print(f"❌ Missing required field: {field}")
                    return False
            
            # Validate KPI type
            if cmc_response.kpi_type != "cmc-multi":
                print(f"❌ Expected kpiType 'cmc-multi', got '{cmc_response.kpi_type}'")
                return False
            
            # Validate data structure
            if cmc_response.data:
                expected_kpis = ["cmc-btc-dominance", "cmc-eth-dominance", "cmc-totalmarketcap-usd", "cmc-stablecoinmarketcap-usd"]
                data_dict = cmc_response.data.to_dict()
                
                for kpi in expected_kpis:
                    if kpi not in data_dict:
                        print(f"❌ Missing expected KPI in data: {kpi}")
                        return False
                    
                    if not isinstance(data_dict[kpi], (int, float)):
                        print(f"❌ KPI {kpi} should be numeric, got {type(data_dict[kpi])}")
                        return False
            
            # Test conversion to individual KPI updates
            kpi_updates = cmc_response.to_kpi_data_updates()
            if len(kpi_updates) == 0:
                print(f"❌ Failed to convert to individual KPI updates")
                return False
            
            print(f"✅ CMC response validation passed")
            print(f"   - Converted to {len(kpi_updates)} individual KPI updates")
            return True
            
        except Exception as e:
            print(f"❌ CMC validation failed: {e}")
            return False
    
    def run_validation(self) -> Dict[str, bool]:
        """Run complete validation of both webhooks"""
        results = {}
        
        print("🔍 Starting N8N Webhook Validation")
        print("=" * 50)
        
        # Test CBBI webhook
        print("\n📊 Testing CBBI Multi-KPI Webhook")
        print("-" * 30)
        
        cbbi_trigger = self.create_test_trigger(
            "cbbi-multi",
            ["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"]
        )
        
        print(f"Trigger payload: {json.dumps(cbbi_trigger, indent=2)}")
        
        cbbi_response = self.test_webhook("kpi-cbbi", cbbi_trigger)
        if cbbi_response:
            print(f"Response received: {json.dumps(cbbi_response, indent=2)}")
            results["cbbi"] = self.validate_cbbi_response(cbbi_response)
        else:
            results["cbbi"] = False
        
        # Test CMC webhook
        print("\n📊 Testing CMC Multi-KPI Webhook")
        print("-" * 30)
        
        cmc_trigger = self.create_test_trigger(
            "cmc-multi",
            ["cmc-btc-dominance", "cmc-eth-dominance", "cmc-totalmarketcap-usd", "cmc-stablecoinmarketcap-usd"]
        )
        
        print(f"Trigger payload: {json.dumps(cmc_trigger, indent=2)}")
        
        cmc_response = self.test_webhook("kpi-cmc", cmc_trigger)
        if cmc_response:
            print(f"Response received: {json.dumps(cmc_response, indent=2)}")
            results["cmc"] = self.validate_cmc_response(cmc_response)
        else:
            results["cmc"] = False
        
        # Summary
        print("\n📋 Validation Summary")
        print("=" * 50)
        
        for webhook, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{webhook.upper()} webhook: {status}")
        
        all_passed = all(results.values())
        overall_status = "✅ ALL VALIDATIONS PASSED" if all_passed else "❌ SOME VALIDATIONS FAILED"
        print(f"\nOverall: {overall_status}")
        
        return results


def main():
    """Run webhook validation"""
    validator = WebhookValidator()
    results = validator.run_validation()
    
    # Exit with error code if any validation failed
    if not all(results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()