export async function uploadToStorage(file: File, folder: string): Promise<string> {
  const res = await fetch('/.netlify/functions/get-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, contentType: file.type, fileName: file.name }),
  });

  if (!res.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, publicUrl } = await res.json();

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) throw new Error('Upload to storage failed');
  return publicUrl;
}
