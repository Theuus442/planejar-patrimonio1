# PDF Upload to Supabase - Complete Analysis and Fixes

## Issues Found and Fixed ✅

### 1. **Missing Environment Variables** ✅ FIXED
**Problem:** The application requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to connect to Supabase, but they weren't configured.

**Solution:** Set both environment variables with your Supabase credentials.
- `VITE_SUPABASE_URL`: https://puepexwgznjdtgrihxsa.supabase.co
- `VITE_SUPABASE_ANON_KEY`: Configured

### 2. **Missing Upload Handlers in App.tsx** ✅ FIXED
**Problem:** Two critical handlers were empty functions:
- `onUploadDocument()` - used by DocumentsView component
- `onUploadAndLinkDocument()` - used by Phase5 (ITBI) and Phase6 (Registration) components

These handlers were defined but did nothing, so files couldn't be uploaded to Supabase.

**Solution:** Implemented proper handlers that:
1. Upload the file to Supabase storage
2. Get the public URL from Supabase
3. Save the document metadata to the database
4. Reload projects to reflect changes

### 3. **Missing Generic Document Upload Function** ✅ FIXED
**Problem:** Only `uploadProjectContract()` existed for contract uploads. Other documents couldn't be uploaded properly.

**Solution:** Added new `uploadProjectDocument()` function in `services/supabaseDatabase.ts` that:
- Uploads files to the `project_documents` storage bucket
- Organizes files by project and phase: `projects/{projectId}/phase{phaseId}/{timestamp}-{filename}`
- Returns a public URL for accessing the document

### 4. **Temporary Object URLs** ⚠️ PARTIALLY FIXED
**Problem:** Some components (like Phase2Constitution) use `URL.createObjectURL(file)` which creates temporary URLs that:
- Only work while the page is open
- Break after page refresh
- Are not stored on Supabase

**Status:** This affects internal preview functionality and would require architectural changes to fully fix. For critical upload paths (DocumentsView, Phase5, Phase6), proper Supabase uploads are now implemented.

---

## What Still Needs to be Done

### 1. **Create Supabase Storage Buckets** ⚠️ REQUIRED
Your application needs two storage buckets in Supabase:

#### Bucket 1: `project_contracts`
- Used for: Contract files when creating new clients
- Path structure: `{projectId}/{timestamp}-{filename}`

#### Bucket 2: `project_documents`
- Used for: All project documents (phases 5, 6, and general uploads)
- Path structure: `projects/{projectId}/phase{phaseId}/{timestamp}-{filename}`

**Steps to create buckets in Supabase:**
1. Go to Supabase Dashboard → Your Project
2. Click "Storage" in the left sidebar
3. Click "Create a new bucket" for each bucket name above
4. Make the buckets **public** (so files can be downloaded by users)
5. Configure access permissions if needed

### 2. **Configure Storage Policies** ⚠️ RECOMMENDED
Set up Row-Level Security (RLS) policies for storage buckets to ensure:
- Only authenticated users can upload files
- Users can only access documents related to their projects
- Service role can manage files

### 3. **Test File Upload**
Once buckets are created:
1. Log in to the application
2. Navigate to a project
3. Go to "Documentos" (Documents) section
4. Click "Adicionar Documento" (Add Document)
5. Select a PDF file
6. Try to upload
7. Check Supabase dashboard → Storage → project_documents to verify the file appears

---

## Files Modified

### 1. `services/supabaseDatabase.ts`
**Changes:**
- Added `uploadProjectDocument()` function for generic document uploads
- Added `deleteProjectDocument()` function for deleting uploaded documents
- Kept existing `uploadProjectContract()` and `deleteProjectContract()` functions

### 2. `App.tsx`
**Changes:**
- Added `handleUploadDocument()` handler for DocumentsView uploads
- Added `handleUploadAndLinkDocument()` handler for Phase5/6 document uploads
- Updated imports to include `documentsDB`
- Connected handlers to DocumentsView and ProjectDetailView components

---

## How File Upload Works Now

### For DocumentsView (General Document Upload):
```
User selects file in DocumentsView
↓
onUploadDocument() is called
↓
filesDB.uploadProjectDocument() uploads to Supabase storage
↓
documentsDB.uploadDocument() saves metadata to database
↓
Document appears in Documents list with public URL
```

### For Phase 5 & 6 (Property Documents):
```
User uploads document in Phase5/6 component
↓
onUploadAndLinkDocument() is called
↓
filesDB.uploadProjectDocument() uploads to Supabase storage
↓
documentsDB.uploadDocument() saves metadata to database
↓
Callback function updates phase data with document ID
↓
Phase can reference the uploaded document
```

### For Contract Upload (Create Client):
```
User selects contract file when creating client
↓
handleCreateClient() is called
↓
filesDB.uploadProjectContract() uploads to Supabase storage
↓
Contract URL is logged (metadata not saved to DB yet)
```

---

## Troubleshooting

### Error: "Bucket not found"
**Solution:** Create the missing storage bucket in Supabase:
1. Go to Supabase → Storage
2. Create bucket with name `project_documents` or `project_contracts`
3. Make it public
4. Try upload again

### Error: "Permission denied"
**Solution:** Check bucket permissions:
1. Go to Supabase → Storage → Bucket policies
2. Ensure authenticated users can upload
3. Add policy if needed

### File uploads but doesn't appear
**Causes:**
- Browser cache issue → Clear cache and refresh
- Database not accepting metadata → Check browser console for errors
- URL is temporary → Ensure file is actually in Supabase storage

**Solution:**
1. Check browser DevTools → Network tab to see if upload succeeded
2. Check Supabase → Storage → Browse to verify file exists
3. Check Supabase → Database → documents table to verify metadata was saved

### Page reload loses uploaded documents (Phase2)
**Status:** Known issue - Phase2 uploads use temporary URLs
**Workaround:** Use DocumentsView or Phase5/6 for persistent document storage

---

## Testing Checklist

- [ ] Supabase buckets created (`project_contracts`, `project_documents`)
- [ ] Environment variables set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Can upload document in DocumentsView
- [ ] Document appears in Documents list
- [ ] Downloaded document opens correctly
- [ ] Can upload documents in Phase5 (ITBI)
- [ ] Can upload documents in Phase6 (Registration)
- [ ] Documents persist after page refresh
- [ ] Contract uploads when creating new client

---

## Summary of Bug Fixes

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| Missing env variables | Critical | ✅ Fixed | Configured |
| Empty onUploadDocument handler | Critical | ✅ Fixed | Implemented proper handler |
| Empty onUploadAndLinkDocument handler | Critical | ✅ Fixed | Implemented proper handler |
| No generic upload function | High | ✅ Fixed | Added uploadProjectDocument() |
| Temporary object URLs | Medium | ⚠️ Partial | Architectural limitation |
| Missing storage buckets | Critical | ⚠️ Manual | User must create in Supabase |
| No error handling for bucket errors | Medium | ✅ Fixed | Added error handling |

---

## Next Steps

1. **Create Supabase Storage Buckets** (REQUIRED)
2. **Test file uploads** with the application
3. **Monitor browser console** for any errors
4. **Check Supabase dashboard** to verify files are being stored correctly

---

**Last Updated:** 2024
**Status:** Ready for testing (pending bucket creation)
