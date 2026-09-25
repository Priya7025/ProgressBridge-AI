-- Ensure the progress-documents bucket exists
insert into storage.buckets (id, name, public)
values ('progress-documents', 'progress-documents', false)
on conflict (id) do nothing;

-- Drop any previous or conflicting policies on storage.objects for progress-documents
drop policy if exists "Authenticated users can insert to progress-documents" on storage.objects;
drop policy if exists "Authenticated users can select from progress-documents" on storage.objects;
drop policy if exists "Authenticated users can update in progress-documents" on storage.objects;
drop policy if exists "Allow authenticated user upload to own folder" on storage.objects;
drop policy if exists "Allow authenticated user read own folder" on storage.objects;
drop policy if exists "Allow authenticated insert to progress-documents" on storage.objects;
drop policy if exists "Allow authenticated select from progress-documents" on storage.objects;
drop policy if exists "authenticated_insert_progress_documents" on storage.objects;
drop policy if exists "authenticated_select_progress_documents" on storage.objects;
drop policy if exists "Allow authenticated users to upload to progress-documents" on storage.objects;
drop policy if exists "Allow authenticated users to read from progress-documents" on storage.objects;

-- INSERT Policy: Authenticated users can only insert files inside their own user-id folder
create policy "Authenticated users can insert to progress-documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'progress-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.role() = 'authenticated'
);

-- SELECT Policy: Authenticated users can only select/read files inside their own user-id folder
create policy "Authenticated users can select from progress-documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'progress-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.role() = 'authenticated'
);

-- UPDATE Policy: Authenticated users can update/overwrite files inside their own user-id folder
create policy "Authenticated users can update in progress-documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'progress-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'progress-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.role() = 'authenticated'
);
