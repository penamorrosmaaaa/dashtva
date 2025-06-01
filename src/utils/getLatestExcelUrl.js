import { supabase } from "../supabaseClient";

export async function getLatestExcelUrl() {
  const { data: files, error } = await supabase.storage
    .from("files")
    .list("", { sortBy: { column: "created_at", order: "desc" } });

  if (error || !files || files.length === 0) return null;

  const latestFile = files[0];
  const oldFiles = files.slice(1);

  for (const f of oldFiles) {
    await supabase.storage.from("files").remove([f.name]);
  }

  const { data: publicUrlData } = supabase
    .storage
    .from("files")
    .getPublicUrl(latestFile.name);

  await supabase.from("upload_logs").insert([
    { name: latestFile.name, uploaded_at: new Date().toISOString() }
  ]);

  return `${publicUrlData.publicUrl}?t=${Date.now()}`;
}