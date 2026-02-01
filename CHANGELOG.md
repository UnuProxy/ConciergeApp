# Changelog

## 2026-02-01 - Mobile Login Fix

### Issue
Mobile login was not working - users would be redirected to Google, authenticate successfully, but then be returned to the login screen without being logged in.

### Root Cause
Safari iOS privacy features were blocking the localStorage/sessionStorage needed for Firebase redirect-based authentication to complete successfully.

### Solution
Changed mobile authentication to use popup mode instead of redirect mode. Only in-app browsers (WhatsApp, Instagram, etc.) now use redirect mode with a warning to open in a real browser.

### Changes Made
- **`src/firebase/config.js`**: Modified `shouldUseRedirect()` to only return `true` for in-app browsers, not regular mobile Safari
- **`src/firebase/config.js`**: Added IndexedDB persistence as primary option with fallbacks to localStorage and sessionStorage
- **`src/pages/Login.jsx`**: Simplified debug panel to only show when `?debug=1` is in URL
- **Removed verbose console logging** throughout authentication flow

### Result
✅ Desktop login: Works with popup (as before)
✅ Mobile Safari login: Works with popup (FIXED)  
✅ In-app browser login: Shows warning to open in real browser

### Debug Mode
Add `?debug=1` to the login URL to see debug information:
- Auth ready status
- Current user
- Device detection
- Error messages (if any)
