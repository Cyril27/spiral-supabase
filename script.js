const SUPABASE_URL = "https://fzgljqihruhafuqxvduy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2xqcWlocnVoYWZ1cXh2ZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzkyNjMsImV4cCI6MjA4MjUxNTI2M30.Wz0f7Ss7rosusVAumaa1e1LenvNc4d5a6DGVfYQlTm0";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

document.getElementById("send").addEventListener("click", async () => {
  const code = document.getElementById("code").value;

  const { error } = await supabaseClient
    .from("spirals")
    .insert({
      participant_code: code,
      notes: "test entry"
    });

  document.getElementById("status").textContent =
    error ? `Error: ${error.message}` : "Saved ✔";
});
