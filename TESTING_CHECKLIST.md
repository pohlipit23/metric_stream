# ✅ KPI Registry Testing Checklist

## 🎯 Implementation Status: READY FOR TESTING

All automated checks passed! The KPI Registry Management UI implementation is complete and ready for testing.

## 🚀 Quick Start (2 minutes)

### Step 1: Start the Services
```bash
# Terminal 1: Frontend
cd src/admin-console
npm run dev

# Terminal 2: Backend  
cd src/workers/admin-console
npm run dev
```

### Step 2: Open the Application
Navigate to: `http://localhost:5173/kpi-registry`

## ✅ Testing Checklist

### Basic Functionality
- [ ] Page loads without errors
- [ ] "Add KPI" button is visible
- [ ] Empty state shows when no KPIs exist
- [ ] Loading spinner appears during data fetch

### Create KPI Flow
- [ ] Click "Add KPI" opens modal
- [ ] Form has all required fields:
  - [ ] Name (required)
  - [ ] Description (optional)
  - [ ] Webhook URL (required)
  - [ ] Analysis Configuration section
  - [ ] Active checkbox
- [ ] Form validation works:
  - [ ] Empty name shows error
  - [ ] Invalid URL shows error
  - [ ] Required fields are enforced
- [ ] "Test Webhook" button works
- [ ] Form submits successfully with valid data
- [ ] New KPI appears in table

### Analysis Configuration
- [ ] Chart Method dropdown works (External/N8N/Cloudflare/None)
- [ ] Chart Type dropdown works (Line/Candlestick/Bar/Area)
- [ ] LLM Priority dropdown works (High/Standard/Low/None)
- [ ] Custom prompt text area accepts input
- [ ] Retention days accepts numbers (30-3650)
- [ ] Alert thresholds accept numbers
- [ ] High threshold > Low threshold validation

### Edit KPI Flow
- [ ] Edit button (pencil icon) opens form
- [ ] Form pre-fills with existing data
- [ ] Changes can be made and saved
- [ ] Updated data appears in table

### Delete KPI Flow
- [ ] Delete button (trash icon) opens confirmation
- [ ] Confirmation shows KPI details
- [ ] "Cancel" closes modal without deleting
- [ ] "Delete KPI" removes item from table

### Webhook Testing
- [ ] "Test Webhook" button in form works
- [ ] "Test Webhook" button in table works
- [ ] Shows "Testing..." state during request
- [ ] Shows success/failure result
- [ ] Handles network errors gracefully

### Error Handling
- [ ] Network errors show user-friendly messages
- [ ] Validation errors are clear and specific
- [ ] Loading states prevent multiple submissions
- [ ] Error messages can be dismissed

### UI/UX
- [ ] Responsive design works on mobile
- [ ] Icons are properly displayed
- [ ] Colors and styling look correct
- [ ] Modals can be closed with X button
- [ ] Form fields have proper labels
- [ ] Success/error states are visually clear

## 🔧 API Testing

Test the backend endpoints directly:

### List KPIs
```bash
curl http://localhost:8787/api/kpis
```
**Expected**: JSON array of KPIs

### Create KPI
```bash
curl -X POST http://localhost:8787/api/kpis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test KPI",
    "description": "Test description", 
    "webhook_url": "https://n8n.example.com/webhook/test",
    "analysis_config": {
      "chart_method": "external",
      "chart_type": "line",
      "llm_priority": "standard"
    },
    "active": true
  }'
```
**Expected**: Created KPI object

### Test Validation
```bash
curl -X POST http://localhost:8787/api/kpis \
  -H "Content-Type: application/json" \
  -d '{"name": "", "webhook_url": "invalid"}'
```
**Expected**: Validation error response

## 🐛 Troubleshooting

### Frontend Issues
- **Page won't load**: Check if frontend is running on port 5173
- **API errors**: Check if backend is running on port 8787
- **Console errors**: Open browser dev tools and check console

### Backend Issues
- **Worker won't start**: Check if port 8787 is available
- **API not responding**: Verify worker is running and accessible
- **CORS errors**: Check browser network tab for blocked requests

### Common Solutions
1. **Restart both services** if you see connection issues
2. **Clear browser cache** if seeing old data
3. **Check browser console** for JavaScript errors
4. **Verify ports** are not blocked by firewall

## 🎯 Success Criteria

The implementation is successful if:
- ✅ All UI components render correctly
- ✅ CRUD operations work without errors  
- ✅ Form validation provides clear feedback
- ✅ Error handling is user-friendly
- ✅ Analysis configuration saves properly
- ✅ Webhook testing functions
- ✅ Authentication integration works
- ✅ API endpoints respond correctly

## 📊 Test Results Template

Copy and fill out as you test:

```
KPI Registry Testing Results
===========================

Basic Functionality: ✅/❌
Create KPI Flow: ✅/❌  
Analysis Configuration: ✅/❌
Edit KPI Flow: ✅/❌
Delete KPI Flow: ✅/❌
Webhook Testing: ✅/❌
Error Handling: ✅/❌
UI/UX: ✅/❌
API Testing: ✅/❌

Overall Status: ✅ PASS / ❌ FAIL

Notes:
- 
- 
- 
```

## 🚀 Next Steps After Testing

1. **Document any issues found**
2. **Test with real N8N webhooks** (if available)
3. **Performance test with many KPIs**
4. **Test on different browsers**
5. **Deploy to staging environment**

---

**Status**: ✅ Ready for comprehensive testing
**Implementation**: Complete
**Test Coverage**: Full manual testing required