# Testing the System Configuration Management UI

This guide will help you test the newly implemented System Configuration Management UI.

## Quick Start

### 1. Start the Development Environment

```bash
# Option A: Use the automated script
./scripts/start-admin-console.sh

# Option B: Manual startup
# Terminal 1: Start Admin Console Worker
cd src/workers/admin-console
wrangler dev --port 8787

# Terminal 2: Start React Frontend
cd src/admin-console
npm run dev
```

### 2. Initialize Test Data

```bash
# Initialize configuration with sample data
node scripts/initialize-config.js
```

### 3. Access the Admin Console

- **Frontend**: http://localhost:5173
- **System Configuration**: http://localhost:5173/system-config
- **Backend API**: http://localhost:8787

## Testing Scenarios

### 1. Load Configuration Test
**What to test**: Configuration loads properly on page load

**Steps**:
1. Navigate to http://localhost:5173/system-config
2. Verify the page loads without errors
3. Check that all configuration sections are populated with data
4. Verify loading states work correctly

**Expected Results**:
- Page loads successfully
- All form fields are populated with default values
- No error messages appear
- Loading spinner disappears after data loads

### 2. Schedule Configuration Test
**What to test**: Cron schedule and timezone settings

**Steps**:
1. Modify the cron expression (e.g., change from "0 9 * * *" to "0 12 * * *")
2. Change the timezone (e.g., from "UTC" to "America/New_York")
3. Toggle the "Enable scheduled execution" checkbox
4. Click "Save Changes"

**Expected Results**:
- Changes are saved successfully
- Success message appears
- Page reloads show the updated values

### 3. Job Lifecycle Management Test
**What to test**: Timeout and polling interval settings

**Steps**:
1. Change job timeout (try values like 15, 45, 60 minutes)
2. Modify orchestration polling interval (try 1, 3, 5 minutes)
3. Toggle "Enable partial data processing"
4. Save changes

**Expected Results**:
- Values are validated (1-120 for timeout, 1-10 for polling)
- Invalid values show error messages
- Valid changes save successfully

### 4. Retry Configuration Test
**What to test**: Component-specific retry settings

**Steps**:
1. Modify max retries for different components
2. Add/remove backoff intervals using the buttons
3. Test validation (max retries 0-10, intervals 100-60000ms)
4. Save changes

**Expected Results**:
- Dynamic interval management works
- Validation prevents invalid values
- Each component can have different settings

### 5. Fallback Configuration Test
**What to test**: Fallback settings for different components

**Steps**:
1. Update chart generation fallback image URL
2. Modify LLM analysis disclaimer text
3. Toggle data collection and delivery options
4. Save changes

**Expected Results**:
- URL validation works for image URLs
- Text fields accept custom messages
- Checkboxes toggle correctly

### 6. Validation Test
**What to test**: Client-side and server-side validation

**Steps**:
1. Enter invalid cron expression (e.g., "invalid cron")
2. Set job timeout to 200 (exceeds max of 120)
3. Enter invalid URL for fallback image
4. Try to save with validation errors

**Expected Results**:
- Error messages appear for invalid fields
- Save button is disabled with validation errors
- Specific error messages guide user to fix issues

### 7. Error Handling Test
**What to test**: API error handling and recovery

**Steps**:
1. Stop the Admin Console Worker (Ctrl+C in worker terminal)
2. Try to save configuration changes
3. Restart the worker
4. Try to reload the page

**Expected Results**:
- Clear error messages when API is unavailable
- Retry functionality works
- Page recovers when API comes back online

## API Testing

### Direct API Tests

```bash
# Test configuration endpoints directly
curl http://localhost:8787/health
curl http://localhost:8787/api/config
curl http://localhost:8787/api/config/schedules

# Test configuration update
curl -X PUT http://localhost:8787/api/config \
  -H "Content-Type: application/json" \
  -d '{"job_lifecycle":{"timeout_minutes":45}}'
```

### Browser Developer Tools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform actions in the UI
4. Verify API calls are made correctly
5. Check for any console errors

## Troubleshooting

### Common Issues

**1. "Failed to load configuration"**
- Check if Admin Console Worker is running on port 8787
- Verify the worker health endpoint: http://localhost:8787/health

**2. "Network error" when saving**
- Ensure both frontend and backend are running
- Check browser console for CORS errors
- Verify API proxy configuration in vite.config.js

**3. Validation errors not clearing**
- Check if validation logic is working correctly
- Verify error state management in React component

**4. Changes not persisting**
- Check if KV store is properly configured
- Verify API endpoints are saving data correctly
- Check worker logs for errors

### Debug Commands

```bash
# Check worker logs
cd src/workers/admin-console
wrangler dev --port 8787 --local

# Check frontend logs
cd src/admin-console
npm run dev

# Test API directly
curl -v http://localhost:8787/api/config
```

## Expected UI Features

### Visual Elements
- ✅ Loading spinners during data fetch
- ✅ Success/error message banners
- ✅ Form validation error messages
- ✅ Disabled save button during validation errors
- ✅ Responsive design for different screen sizes

### Functionality
- ✅ Auto-load configuration on page mount
- ✅ Real-time form validation
- ✅ Dynamic backoff interval management
- ✅ Batch save of all configuration sections
- ✅ Error recovery and retry mechanisms

### Data Persistence
- ✅ Configuration saved to Cloudflare KV
- ✅ Changes persist across page reloads
- ✅ Proper error handling for save failures

## Success Criteria

The System Configuration Management UI is working correctly if:

1. **Loading**: Page loads configuration data automatically
2. **Editing**: All form fields can be modified
3. **Validation**: Invalid inputs show appropriate error messages
4. **Saving**: Changes persist and show success confirmation
5. **Error Handling**: Network errors are handled gracefully
6. **Recovery**: System recovers from temporary failures

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Test with production-like data volumes
3. Perform security testing
4. Document any additional configuration needs