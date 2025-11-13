
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** osteo-app-v5.2
- **Date:** 2025-11-10
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** TC001-Consultation list loads correctly with descending date sorting
- **Test Code:** [TC001_Consultation_list_loads_correctly_with_descending_date_sorting.py](./TC001_Consultation_list_loads_correctly_with_descending_date_sorting.py)
- **Test Error:** The login to the application failed repeatedly with the provided credentials. The login form reloads with cleared fields and no navigation to the dashboard occurs. This prevents access to the consultation list page, making it impossible to verify the consultation list as requested. The issue has been reported. Task is now complete.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/29cc3022-920c-4c6a-9cc0-09913ec7e5d1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** TC002-Consultation detail view displays loading, error, and correct data states
- **Test Code:** [TC002_Consultation_detail_view_displays_loading_error_and_correct_data_states.py](./TC002_Consultation_detail_view_displays_loading_error_and_correct_data_states.py)
- **Test Error:** Unable to proceed with testing the detailed consultation view because login attempts with provided user and admin credentials failed. No alternative access or bypass is available on the login page. Please verify credentials or provide access to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/93852d1f-4ac2-4c26-8934-34bc936f4638
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** TC003-Consultation creation form - patient selection search functionality
- **Test Code:** [TC003_Consultation_creation_form___patient_selection_search_functionality.py](./TC003_Consultation_creation_form___patient_selection_search_functionality.py)
- **Test Error:** Login failed repeatedly with provided credentials, preventing access to the consultation creation form. Reporting issue and stopping further testing.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/22a0cd0b-ba8d-4982-9746-92c0042e5b74
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** TC004-Consultation creation form client-side validation for mandatory fields
- **Test Code:** [TC004_Consultation_creation_form_client_side_validation_for_mandatory_fields.py](./TC004_Consultation_creation_form_client_side_validation_for_mandatory_fields.py)
- **Test Error:** Login attempts failed repeatedly with provided credentials, preventing access to the consultation creation form. Unable to proceed with client-side validation testing of mandatory fields. Reporting the issue and stopping further actions.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/0acf1664-0898-4d57-ae33-984105be158d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** TC005-Consultation creation form client-side validation for date/time, duration, and price constraints
- **Test Code:** [TC005_Consultation_creation_form_client_side_validation_for_datetime_duration_and_price_constraints.py](./TC005_Consultation_creation_form_client_side_validation_for_datetime_duration_and_price_constraints.py)
- **Test Error:** The task to verify form validation for date/time, duration, and price could not be completed because login to the application failed repeatedly. The login form resets after submission and does not proceed further, preventing access to the consultation creation form. The issue has been reported. Task is now complete with failure to test the form validation due to access issues.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/78ba49a1-bb40-4088-a218-2d6dbe708903
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** TC006-Server-side validation error responses displayed clearly on consultation creation form
- **Test Code:** [TC006_Server_side_validation_error_responses_displayed_clearly_on_consultation_creation_form.py](./TC006_Server_side_validation_error_responses_displayed_clearly_on_consultation_creation_form.py)
- **Test Error:** Login attempts with both user and admin credentials failed. The admin login button is disabled preventing login. Cannot proceed to test server-side validation error handling. Reporting the issue and stopping further actions.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/ca8d655b-8f41-41c9-b058-e07dc6deb241
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** TC007-Successful consultation creation redirects to detail view with confirmation toast
- **Test Code:** [TC007_Successful_consultation_creation_redirects_to_detail_view_with_confirmation_toast.py](./TC007_Successful_consultation_creation_redirects_to_detail_view_with_confirmation_toast.py)
- **Test Error:** Testing halted due to inability to login as user or admin. The login button remains disabled on the admin login modal after entering password, preventing further progress. Please resolve the login issue to continue testing the consultation creation and verification task.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/c5989dfd-1cb9-4713-b20a-29fbc506050c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** TC008-Navigation from consultation list to detail view by clicking items
- **Test Code:** [TC008_Navigation_from_consultation_list_to_detail_view_by_clicking_items.py](./TC008_Navigation_from_consultation_list_to_detail_view_by_clicking_items.py)
- **Test Error:** Unable to proceed with the test as both user and admin login attempts failed with the provided credentials. Access to the consultations list page is not possible, so the test to click a consultation item and verify navigation to its detail view cannot be completed.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/9ad568cc-1cd7-42c5-a0a6-e1964eec7fd3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** TC009-Retry logic works on limited network errors during consultation operations
- **Test Code:** [TC009_Retry_logic_works_on_limited_network_errors_during_consultation_operations.py](./TC009_Retry_logic_works_on_limited_network_errors_during_consultation_operations.py)
- **Test Error:** Login attempts failed repeatedly with provided credentials, blocking access to the system. Reporting the issue and stopping further testing as login is prerequisite for retry logic tests.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/68480f09-d0a2-4474-80b7-f864834f96a6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** TC010-Accessibility and localization of messages follow ARIA standards
- **Test Code:** [TC010_Accessibility_and_localization_of_messages_follow_ARIA_standards.py](./TC010_Accessibility_and_localization_of_messages_follow_ARIA_standards.py)
- **Test Error:** Testing stopped due to inability to trigger validation errors and lack of ARIA compliance in admin login form. Validation error messages are not accessible to screen readers and no ARIA-live regions are used. Further testing cannot proceed reliably.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/00b46dba-a89a-438e-b5ba-65c555f666f5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** TC011-Unit tests cover consultation formatters, validators, and backend error handlers
- **Test Code:** [TC011_Unit_tests_cover_consultation_formatters_validators_and_backend_error_handlers.py](./TC011_Unit_tests_cover_consultation_formatters_validators_and_backend_error_handlers.py)
- **Test Error:** Admin login is not working as expected, preventing access to unit test pages. Unable to verify unit test coverage for consultation-related formatters, validators, and error handlers. Please resolve the login issue to proceed.
Browser Console Logs:
[WARNING] [2025-11-10T10:03:21.761Z]  @firebase/firestore: Firestore (10.14.1): enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead. (at http://localhost:5175/node_modules/.vite/deps/chunk-LI5F3G23.js?v=db281052:1062:19)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5175/node_modules/.vite/deps/react-router-dom.js?v=db281052:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5175/node_modules/.vite/deps/react-router-dom.js?v=db281052:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async http://localhost:5175/src/context/AuthContext.tsx:213:11 (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async http://localhost:5175/src/context/AuthContext.tsx:213:11 (at http://localhost:5175/src/services/authService.ts:46:14)
[WARNING] [2025-11-10T10:03:40.213Z]  @firebase/firestore: Firestore (10.14.1): enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead. (at http://localhost:5175/node_modules/.vite/deps/chunk-LI5F3G23.js?v=db281052:1062:19)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5175/node_modules/.vite/deps/react-router-dom.js?v=db281052:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5175/node_modules/.vite/deps/react-router-dom.js?v=db281052:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async http://localhost:5175/src/context/AuthContext.tsx:213:11 (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async http://localhost:5175/src/context/AuthContext.tsx:213:11 (at http://localhost:5175/src/services/authService.ts:46:14)
[WARNING] [2025-11-10T10:03:54.381Z]  @firebase/firestore: Firestore (10.14.1): enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead. (at http://localhost:5175/node_modules/.vite/deps/chunk-LI5F3G23.js?v=db281052:1062:19)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5175/node_modules/.vite/deps/react-router-dom.js?v=db281052:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5175/node_modules/.vite/deps/react-router-dom.js?v=db281052:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async http://localhost:5175/src/context/AuthContext.tsx:213:11 (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/86d8d2bf-8449-408e-86eb-c02a3f383475
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** TC012-End-to-end tests for successful consultation creation and backend error handling
- **Test Code:** [TC012_End_to_end_tests_for_successful_consultation_creation_and_backend_error_handling.py](./TC012_End_to_end_tests_for_successful_consultation_creation_and_backend_error_handling.py)
- **Test Error:** Login attempts with valid credentials repeatedly fail without error messages or page navigation. Password reset flow works but does not resolve the login issue. Unable to proceed with consultation creation testing. Reporting this as a critical blocker. Further testing halted until login issue is resolved.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD-L4R32GM-QZCOJBLzcfp69LpC7m8488s:0:0)
[ERROR] Erreur de connexion: FirebaseError: Firebase: Error (auth/too-many-requests).
    at createErrorInternal (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:699:37)
    at _fail (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:664:9)
    at _performFetchWithErrorHandling (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1122:9)
    at async _performSignInRequest (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:1133:26)
    at async _signInWithCredential (http://localhost:5175/node_modules/.vite/deps/firebase_auth.js?v=db281052:4329:20)
    at async AuthService.login (http://localhost:5175/src/services/authService.ts:28:30)
    at async http://localhost:5175/src/context/AuthContext.tsx:67:20
    at async handleSubmit (http://localhost:5175/src/pages/auth/UserLogin.tsx:77:20) (at http://localhost:5175/src/services/authService.ts:46:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/bea149cf-16ae-4a68-8575-fdcbbbe22b7b/1e545ecd-e2a2-4c62-baa3-ffd9c851d7eb
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---