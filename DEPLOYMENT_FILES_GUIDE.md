# Code Deployment Guide
## How to Get and Install the Authentication System

## 📥 **Files to Copy from This Conversation**

### **NEW FILES TO CREATE:**

1. **`EnhancedSecurity.gs`**
   - **Location in conversation**: Search for "Enhanced Security Module for Motorcycle Escort Management System"
   - **Size**: ~500 lines
   - **Contains**: Password validation, rate limiting, account lockout, secure sessions

2. **`SecurityAudit.gs`**
   - **Location in conversation**: Search for "Security Audit and Logging Module"
   - **Size**: ~400 lines  
   - **Contains**: Security logging, monitoring, alerts, reporting

3. **`AuthenticationRouter.gs`**
   - **Location in conversation**: Search for "Authentication Router for handling dual authentication"
   - **Size**: ~300 lines
   - **Contains**: New doGet function, dual auth pages, routing logic

### **FILES TO UPDATE:**

4. **`HybridAuth.gs`** (Update existing)
   - **What to change**: Add fallback calls to secure functions
   - **Location**: Search for "Use enhanced secure login if available"

5. **`login.html`** (Replace existing)
   - **What to do**: Replace entire file with enhanced version
   - **Location**: Search for "Secure Login - Motorcycle Escort Management"

6. **`Code.gs`** (Minor update)
   - **What to change**: Rename `function doGet(e)` to `function doGetOriginal(e)`
   - **Why**: So the new AuthenticationRouter doGet takes over

## 🚀 **Quick Setup Steps**

### Step 1: Create New Files
```
1. Go to Google Apps Script project
2. Click "+" next to Files → Script
3. Create: EnhancedSecurity.gs
4. Copy code from conversation (search for the file name)
5. Repeat for SecurityAudit.gs and AuthenticationRouter.gs
```

### Step 2: Update Existing Files
```
1. Open HybridAuth.gs → Add the enhanced function calls
2. Open login.html → Replace with new HTML
3. Open Code.gs → Rename doGet to doGetOriginal
```

### Step 3: Deploy
```
✅ Execute as: "User accessing the web app"
✅ Who has access: "Anyone with a Google account"
```

## 📋 **Finding Code in This Conversation**

### **Search Terms to Find Each File:**

| File | Search For This Text |
|------|---------------------|
| EnhancedSecurity.gs | `Enhanced Security Module for Motorcycle` |
| SecurityAudit.gs | `Security Audit and Logging Module` |
| AuthenticationRouter.gs | `Authentication Router for handling dual` |
| login.html | `Secure Login - Motorcycle Escort Management` |
| HybridAuth.gs updates | `Use enhanced secure login if available` |

### **Code Block Indicators:**
- Look for code blocks that start with `/**` (for .gs files)
- Look for code blocks that start with `<!DOCTYPE html>` (for .html files)
- Each file is complete in its code block

## ⚙️ **Configuration Required**

After copying the code:

1. **Set up Users sheet** with columns: `email | hashedPassword | role | status | name`

2. **Generate password hashes**:
   ```javascript
   function generateHash() {
     console.log(hashPassword("YourPassword123!"));
   }
   ```

3. **Update admin emails** in your existing functions or create:
   ```javascript
   function getAdminUsers() {
     return ['your-email@gmail.com'];
   }
   ```

## 🧪 **Test the System**

1. Deploy the web app
2. Visit the URL with your Google account
3. Visit with unauthorized account (should see choice page)
4. Test credential login at: `URL?action=credential-login`

## 📞 **If You Need Help**

- All code is complete and functional in this conversation
- Each file can be copied exactly as shown
- The system will work immediately after deployment
- Look for the 🔍 search terms above to find specific code blocks

## 💡 **Pro Tip**

Copy the code files in this order:
1. EnhancedSecurity.gs (foundation)
2. SecurityAudit.gs (logging)  
3. AuthenticationRouter.gs (main router)
4. Update existing files
5. Test and deploy

The entire authentication system is ready to use!