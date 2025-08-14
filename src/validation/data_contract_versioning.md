# Data Contract Versioning Scheme

## Overview

This document defines a comprehensive versioning scheme for data contracts between N8N workflows and Cloudflare Workers, enabling graceful schema migrations and maintaining system stability during evolution.

## Versioning Strategy

### Semantic Versioning for Data Contracts

We adopt a semantic versioning approach adapted for data contracts:

**Format**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require code updates
- **MINOR**: Backward-compatible additions and enhancements  
- **PATCH**: Bug fixes and clarifications without structural changes

### Version Field Implementation

All data payloads include an optional version field:

```json
{
  "version": "1.0.0",
  "traceId": "trace_123",
  "timestamp": "2025-08-14T14:30:22Z",
  "kpiType": "cbbi-multi",
  "kpiIds": [...],
  "data": {...}
}
```

## Version Evolution Examples

### Version 1.0.0 (Current - Baseline)

**CBBI Multi-KPI Response**:
```json
{
  "version": "1.0.0",
  "traceId": "trace_123",
  "timestamp": "2025-08-14T14:30:22Z",
  "kpiType": "cbbi-multi",
  "kpiIds": ["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"],
  "data": {
    "cbbi-btc-price-usd": 120668.6251,
    "cbbi-rhodl": 0.7593,
    "cbbi-mvrv": 0.8252,
    "cbbi-confidence": 0.7849
  }
}
```

### Version 1.1.0 (Minor - Backward Compatible Additions)

**Enhanced with Optional Metadata**:
```json
{
  "version": "1.1.0",
  "traceId": "trace_123",
  "timestamp": "2025-08-14T14:30:22Z",
  "kpiType": "cbbi-multi",
  "kpiIds": ["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"],
  "data": {
    "cbbi-btc-price-usd": 120668.6251,
    "cbbi-rhodl": 0.7593,
    "cbbi-mvrv": 0.8252,
    "cbbi-confidence": 0.7849
  },
  "metadata": {
    "dataQuality": "high",
    "confidence": 0.95,
    "processingTimeMs": 1250,
    "source": "cbbi_api_v2"
  }
}
```

### Version 1.2.0 (Minor - Enhanced Data Structure)

**Optional Enhanced Data Format**:
```json
{
  "version": "1.2.0",
  "traceId": "trace_123",
  "timestamp": "2025-08-14T14:30:22Z",
  "kpiType": "cbbi-multi",
  "kpiIds": ["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"],
  "data": {
    "cbbi-btc-price-usd": {
      "value": 120668.6251,
      "confidence": 0.98,
      "lastUpdated": "2025-08-14T14:29:45Z"
    },
    "cbbi-rhodl": 0.7593,  // Simple format still supported
    "cbbi-mvrv": 0.8252,
    "cbbi-confidence": 0.7849
  },
  "metadata": {
    "dataQuality": "high",
    "mixedFormat": true  // Indicates mixed simple/enhanced data
  }
}
```

### Version 2.0.0 (Major - Breaking Changes)

**Restructured Data Format** (Breaking):
```json
{
  "version": "2.0.0",
  "traceId": "trace_123",
  "timestamp": "2025-08-14T14:30:22Z",
  "kpiType": "cbbi-multi",
  "kpis": [  // Changed from separate kpiIds + data to unified structure
    {
      "id": "cbbi-btc-price-usd",
      "value": 120668.6251,
      "confidence": 0.98,
      "metadata": {
        "lastUpdated": "2025-08-14T14:29:45Z",
        "source": "cbbi_api"
      }
    },
    {
      "id": "cbbi-rhodl",
      "value": 0.7593,
      "confidence": 0.95
    }
  ],
  "metadata": {
    "dataQuality": "high",
    "totalKpis": 4
  }
}
```

## Version Parsing Implementation

### Version-Aware Parser

```python
from typing import Dict, Any, Union
from dataclasses import dataclass
from packaging import version  # For version comparison

@dataclass
class VersionedKPIResponse:
    """Base class for versioned KPI responses"""
    version: str
    trace_id: str
    timestamp: str
    kpi_type: str
    raw_data: Dict[str, Any]

class VersionedParser:
    """Parser that handles multiple data contract versions"""
    
    SUPPORTED_VERSIONS = ["1.0.0", "1.1.0", "1.2.0"]
    CURRENT_VERSION = "1.2.0"
    
    def parse_kpi_response(self, data: Dict[str, Any]) -> KPIResponse:
        """Parse KPI response with version awareness"""
        
        # Extract version, default to 1.0.0 for backward compatibility
        payload_version = data.get("version", "1.0.0")
        
        # Validate version format
        try:
            parsed_version = version.parse(payload_version)
        except version.InvalidVersion:
            raise ValueError(f"Invalid version format: {payload_version}")
        
        # Route to appropriate parser
        if parsed_version.major == 1:
            return self._parse_v1_response(data, payload_version)
        elif parsed_version.major == 2:
            return self._parse_v2_response(data, payload_version)
        else:
            raise ValueError(f"Unsupported major version: {parsed_version.major}")
    
    def _parse_v1_response(self, data: Dict[str, Any], payload_version: str) -> KPIResponse:
        """Parse version 1.x responses"""
        
        parsed_version = version.parse(payload_version)
        
        if parsed_version >= version.parse("1.2.0"):
            return self._parse_v1_2_response(data)
        elif parsed_version >= version.parse("1.1.0"):
            return self._parse_v1_1_response(data)
        else:
            return self._parse_v1_0_response(data)
    
    def _parse_v1_0_response(self, data: Dict[str, Any]) -> KPIResponse:
        """Parse version 1.0.0 response (baseline)"""
        
        if data.get("kpiType") == "cbbi-multi":
            return CBBIMultiKPIResponse(
                trace_id=data["traceId"],
                timestamp=data["timestamp"],
                kpi_ids=data["kpiIds"],
                data=self._parse_cbbi_data(data["data"]),
                metadata={}  # No metadata in v1.0.0
            )
        # Handle other KPI types...
    
    def _parse_v1_1_response(self, data: Dict[str, Any]) -> KPIResponse:
        """Parse version 1.1.0 response (with metadata)"""
        
        if data.get("kpiType") == "cbbi-multi":
            return CBBIMultiKPIResponse(
                trace_id=data["traceId"],
                timestamp=data["timestamp"],
                kpi_ids=data["kpiIds"],
                data=self._parse_cbbi_data(data["data"]),
                metadata=data.get("metadata", {})  # Metadata support added
            )
    
    def _parse_v1_2_response(self, data: Dict[str, Any]) -> KPIResponse:
        """Parse version 1.2.0 response (with enhanced data)"""
        
        if data.get("kpiType") == "cbbi-multi":
            return CBBIMultiKPIResponse(
                trace_id=data["traceId"],
                timestamp=data["timestamp"],
                kpi_ids=data["kpiIds"],
                data=self._parse_enhanced_cbbi_data(data["data"]),  # Enhanced parsing
                metadata=data.get("metadata", {})
            )
    
    def _parse_enhanced_cbbi_data(self, data: Dict[str, Any]) -> CBBIData:
        """Parse enhanced data format with backward compatibility"""
        
        def extract_value(key: str, data_entry: Any) -> float:
            if isinstance(data_entry, (int, float)):
                return float(data_entry)
            elif isinstance(data_entry, dict) and "value" in data_entry:
                return float(data_entry["value"])
            else:
                raise ValueError(f"Cannot extract value for {key}")
        
        return CBBIData(
            cbbi_btc_price_usd=extract_value("cbbi-btc-price-usd", data["cbbi-btc-price-usd"]),
            cbbi_rhodl=extract_value("cbbi-rhodl", data["cbbi-rhodl"]),
            cbbi_mvrv=extract_value("cbbi-mvrv", data["cbbi-mvrv"]),
            cbbi_confidence=extract_value("cbbi-confidence", data["cbbi-confidence"])
        )
```

### Version Compatibility Matrix

```python
class VersionCompatibility:
    """Manage version compatibility rules"""
    
    COMPATIBILITY_MATRIX = {
        "1.0.0": {
            "canParse": ["1.0.0"],
            "canUpgrade": ["1.1.0", "1.2.0"],
            "deprecated": False
        },
        "1.1.0": {
            "canParse": ["1.0.0", "1.1.0"],
            "canUpgrade": ["1.2.0"],
            "deprecated": False
        },
        "1.2.0": {
            "canParse": ["1.0.0", "1.1.0", "1.2.0"],
            "canUpgrade": [],
            "deprecated": False
        }
    }
    
    def can_parse_version(self, parser_version: str, payload_version: str) -> bool:
        """Check if parser version can handle payload version"""
        
        if parser_version not in self.COMPATIBILITY_MATRIX:
            return False
        
        return payload_version in self.COMPATIBILITY_MATRIX[parser_version]["canParse"]
    
    def is_version_deprecated(self, version: str) -> bool:
        """Check if version is deprecated"""
        
        return self.COMPATIBILITY_MATRIX.get(version, {}).get("deprecated", True)
```

## Migration Management

### Migration Planning

```python
@dataclass
class MigrationPlan:
    """Define migration between versions"""
    from_version: str
    to_version: str
    migration_type: str  # "automatic", "manual", "breaking"
    migration_date: str
    deprecation_date: str
    removal_date: str
    migration_guide: str
    
class MigrationManager:
    """Manage version migrations"""
    
    MIGRATION_PLANS = [
        MigrationPlan(
            from_version="1.0.0",
            to_version="1.1.0",
            migration_type="automatic",
            migration_date="2025-09-01",
            deprecation_date="2025-12-01",
            removal_date="2026-03-01",
            migration_guide="https://docs.example.com/migration/v1.0-to-v1.1"
        ),
        MigrationPlan(
            from_version="1.1.0",
            to_version="1.2.0",
            migration_type="automatic",
            migration_date="2025-10-01",
            deprecation_date="2026-01-01",
            removal_date="2026-06-01",
            migration_guide="https://docs.example.com/migration/v1.1-to-v1.2"
        )
    ]
    
    def get_migration_plan(self, from_version: str, to_version: str) -> Optional[MigrationPlan]:
        """Get migration plan between versions"""
        
        for plan in self.MIGRATION_PLANS:
            if plan.from_version == from_version and plan.to_version == to_version:
                return plan
        return None
    
    def is_migration_required(self, current_version: str) -> bool:
        """Check if migration is required"""
        
        for plan in self.MIGRATION_PLANS:
            if plan.from_version == current_version:
                migration_date = datetime.fromisoformat(plan.migration_date)
                if datetime.now() >= migration_date:
                    return True
        return False
```

### Automatic Migration

```python
class AutoMigrator:
    """Automatically migrate data between compatible versions"""
    
    def migrate_payload(self, data: Dict[str, Any], target_version: str) -> Dict[str, Any]:
        """Migrate payload to target version"""
        
        current_version = data.get("version", "1.0.0")
        
        if current_version == target_version:
            return data
        
        # Apply migration chain
        migrated_data = data.copy()
        
        if current_version == "1.0.0" and target_version >= "1.1.0":
            migrated_data = self._migrate_1_0_to_1_1(migrated_data)
        
        if current_version <= "1.1.0" and target_version >= "1.2.0":
            migrated_data = self._migrate_1_1_to_1_2(migrated_data)
        
        migrated_data["version"] = target_version
        return migrated_data
    
    def _migrate_1_0_to_1_1(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate from 1.0.0 to 1.1.0"""
        
        # Add default metadata if not present
        if "metadata" not in data:
            data["metadata"] = {
                "dataQuality": "unknown",
                "migrated": True,
                "originalVersion": data.get("version", "1.0.0")
            }
        
        return data
    
    def _migrate_1_1_to_1_2(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate from 1.1.0 to 1.2.0"""
        
        # No structural changes needed for 1.2.0
        # Enhanced data format is optional
        return data
```

## Version Validation

### Schema Validation

```python
from jsonschema import validate, ValidationError

class VersionedSchemaValidator:
    """Validate payloads against versioned schemas"""
    
    SCHEMAS = {
        "1.0.0": {
            "type": "object",
            "required": ["traceId", "timestamp", "kpiType"],
            "properties": {
                "version": {"type": "string", "const": "1.0.0"},
                "traceId": {"type": "string"},
                "timestamp": {"type": "string", "format": "date-time"},
                "kpiType": {"type": "string"},
                "kpiIds": {"type": "array", "items": {"type": "string"}},
                "data": {"type": "object"}
            }
        },
        "1.1.0": {
            "type": "object",
            "required": ["traceId", "timestamp", "kpiType"],
            "properties": {
                "version": {"type": "string", "const": "1.1.0"},
                "traceId": {"type": "string"},
                "timestamp": {"type": "string", "format": "date-time"},
                "kpiType": {"type": "string"},
                "kpiIds": {"type": "array", "items": {"type": "string"}},
                "data": {"type": "object"},
                "metadata": {"type": "object"}  # Added in 1.1.0
            }
        }
    }
    
    def validate_payload(self, data: Dict[str, Any]) -> bool:
        """Validate payload against its declared version schema"""
        
        payload_version = data.get("version", "1.0.0")
        
        if payload_version not in self.SCHEMAS:
            raise ValueError(f"No schema available for version {payload_version}")
        
        try:
            validate(instance=data, schema=self.SCHEMAS[payload_version])
            return True
        except ValidationError as e:
            raise ValueError(f"Schema validation failed: {e.message}")
```

## Monitoring and Metrics

### Version Usage Tracking

```python
class VersionMetrics:
    """Track version usage and migration progress"""
    
    def __init__(self):
        self.version_counts = {}
        self.migration_events = []
    
    def record_version_usage(self, version: str, kpi_type: str):
        """Record usage of a specific version"""
        
        key = f"{version}:{kpi_type}"
        self.version_counts[key] = self.version_counts.get(key, 0) + 1
        
        # Send to monitoring system
        self._send_metric("version_usage", {
            "version": version,
            "kpiType": kpi_type,
            "timestamp": datetime.now().isoformat()
        })
    
    def record_migration_event(self, from_version: str, to_version: str, success: bool):
        """Record migration event"""
        
        event = {
            "fromVersion": from_version,
            "toVersion": to_version,
            "success": success,
            "timestamp": datetime.now().isoformat()
        }
        
        self.migration_events.append(event)
        self._send_metric("migration_event", event)
    
    def get_version_distribution(self) -> Dict[str, int]:
        """Get current version distribution"""
        
        distribution = {}
        for key, count in self.version_counts.items():
            version = key.split(":")[0]
            distribution[version] = distribution.get(version, 0) + count
        
        return distribution
```

## Documentation and Communication

### Version Documentation Template

```markdown
# Data Contract Version X.Y.Z

## Release Information
- **Version**: X.Y.Z
- **Release Date**: YYYY-MM-DD
- **Migration Required**: Yes/No
- **Backward Compatible**: Yes/No

## Changes
### Added
- New optional field `fieldName`
- Enhanced error reporting

### Changed
- Improved timestamp precision
- Updated validation rules

### Deprecated
- Field `oldField` (use `newField` instead)
- Will be removed in version X+1.0.0

### Removed
- None

## Migration Guide
### Automatic Migration
This version supports automatic migration from versions X.Y-1.Z.

### Manual Steps Required
1. Update N8N workflows to include version field
2. Test with new optional fields
3. Update error handling logic

## Compatibility Matrix
- ✅ Can parse: X.Y-1.Z, X.Y.Z
- ✅ Can upgrade from: X.Y-1.Z
- ❌ Breaking changes from: X-1.Y.Z

## Examples
[Include payload examples]

## Testing
[Include test cases and validation steps]
```

## Implementation Checklist

### For Each Version Release

- [ ] **Schema Definition**: Define JSON schema for validation
- [ ] **Parser Implementation**: Update parsers to handle new version
- [ ] **Migration Logic**: Implement automatic migration where possible
- [ ] **Validation Tests**: Create comprehensive test suite
- [ ] **Documentation**: Update version documentation
- [ ] **Compatibility Matrix**: Update compatibility rules
- [ ] **Monitoring**: Add version tracking metrics
- [ ] **Communication**: Notify stakeholders of changes

### For Major Version Changes

- [ ] **Breaking Change Analysis**: Document all breaking changes
- [ ] **Migration Timeline**: Define migration and deprecation dates
- [ ] **Migration Tools**: Provide tools for manual migration
- [ ] **Rollback Plan**: Define rollback procedures
- [ ] **Extended Testing**: Comprehensive integration testing
- [ ] **Stakeholder Approval**: Get approval for breaking changes

## Conclusion

This versioning scheme provides:

✅ **Clear Evolution Path**: Semantic versioning guides development
✅ **Backward Compatibility**: Automatic handling of older versions
✅ **Migration Safety**: Structured migration with validation
✅ **Monitoring**: Track version usage and migration progress
✅ **Documentation**: Clear communication of changes
✅ **Flexibility**: Support for both automatic and manual migrations

The scheme balances innovation with stability, enabling the system to evolve while maintaining reliability and developer experience.