// scrapers/utils/supabaseClient.js

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Zorg dat .env altijd uit de scrapers-map wordt geladen
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ENV PROBLEEM in supabaseClient.js", {
    supabaseUrlPresent: !!supabaseUrl,
    supabaseKeyPresent: !!supabaseKey,
  });
  throw new Error(
    "Supabase URL of SERVICE_ROLE_KEY ontbreekt. Controleer scrapers/.env"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
