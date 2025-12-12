// api/greeting.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Ensure table 'messages' exists (if not, create it)
  // Supabase client doesn’t auto-create tables, so we use SQL via rpc if possible.
  // But simplest: attempt select, if fails, create manually using SQL.
  const { error: selectError } = await supabase.from("messages").select("text").limit(1);

  if (selectError && selectError.code === "42P01") {
    // Table missing → create it
    await supabase.rpc("exec_sql", {
      sql: `
        create table if not exists messages (
          id serial primary key,
          text text
        );
      `,
    });
  }

  // Fetch rows
  let { data, error } = await supabase.from("messages").select("text").limit(1);

  if (error && error.code === "42P01") {
    // fallback if rpc didn’t work; ignore
    return res.status(500).json({ error: "Table creation failed." });
  }

  if (!data || data.length === 0) {
    // Insert default message
    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert([{ text: "Hello User" }])
      .select()
      .limit(1);
    if (insertError) return res.status(500).json({ error: insertError.message });
    return res.status(200).json(inserted[0]);
  }

  // Return first message
  return res.status(200).json(data[0]);
}
