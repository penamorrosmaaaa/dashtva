import { supabase } from '../supabaseClient';

export async function getLastUploadDate() {
  const { data, error } = await supabase
    .from('upload_logs')
    .select('uploaded_at')
    .order('uploaded_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const date = new Date(data[0].uploaded_at);
  const formattedDate = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  const formattedTime = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return `${formattedDate} - ${formattedTime}`; // ejemplo: "31 may - 08:15 p. m."
}
