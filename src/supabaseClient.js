// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://liomseivquhgogbnwron.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb21zZWl2cXVoZ29nYm53cm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzQzMzgsImV4cCI6MjA2NDMxMDMzOH0.PDOowFEDylMBdo3ZOUtl8bVaCP1Zf8TOsc7D8tKVj40';

export const supabase = createClient(supabaseUrl, supabaseKey);
