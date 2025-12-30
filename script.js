// Supabase client
const SUPABASE_URL = "https://fzgljqihruhafuqxvduy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2xqcWlocnVoYWZ1cXh2ZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzkyNjMsImV4cCI6MjA4MjUxNTI2M30.Wz0f7Ss7rosusVAumaa1e1LenvNc4d5a6DGVfYQlTm0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Tabs ---------- */
function openTab(id) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  document.getElementById(id).classList.add("active");
  document.querySelector(`[data-tab="${id}"]`).classList.add("active");
}

/* ---------- Drawing ---------- */
function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  }

  canvas.addEventListener("mousedown", e => {
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener("mousemove", e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  canvas.addEventListener("mouseup", () => drawing = false);
  canvas.addEventListener("mouseout", () => drawing = false);

  canvas.addEventListener("touchstart", e => {
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener("touchmove", e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    e.preventDefault();
  });

  canvas.addEventListener("touchend", () => drawing = false);
}

function clearCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function loadTemplate(canvasId, imagePath) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = imagePath;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
}

/* ---------- Save ---------- */
function downloadImage(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function savePatientMetadata(name, age, stage, timestamp) {
  try {
    // Convert timestamp format to ISO 8601
    const [date, time] = timestamp.split("-");
    const [year, month, day] = date.split("_");
    const [hours, minutes, seconds] = time.split("_");
    const isoTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const { data, error } = await supabaseClient
      .from("patients")
      .insert([
        {
          name: name,
          age: parseInt(age) || null,
          stage: stage,
          timestamp: isoTimestamp
        }
      ])
      .select();

    if (error) throw error;
    alert("Metadata saved to Supabase!");
    return data[0].id; // Extract and return the patient ID
  } catch (error) {
    console.error("Error saving to Supabase:", error.message);
    alert("Error saving metadata: " + error.message);
    return null;
  }
}

function canvasToBlob(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(blob);
    }, "image/png");
  });
}


async function saveImage(patientId, spiralNumber, canvas, subfolder) {
  try {
    // Convert canvas to PNG Blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

    const filePath = `${subfolder}/spiral_${patientId}_${spiralNumber}_${Date.now()}.png`;

    // Upload Blob to Supabase Storage
    const { data, error } = await supabaseClient
      .storage
      .from("images")
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/png"
      });

    if (error) throw error;

  } catch (err) {
    alert("Error saving image: " + err.message);
  }
}





function saveAll() {
  const now = new Date();
  const timestamp = now.getFullYear() + "_" +
                    String(now.getMonth() + 1).padStart(2, "0") + "_" +
                    String(now.getDate()).padStart(2, "0") + "-" +
                    String(now.getHours()).padStart(2, "0") + "_" +
                    String(now.getMinutes()).padStart(2, "0") + "_" +
                    String(now.getSeconds()).padStart(2, "0");

  const name = document.getElementById("name").value;
  const age = document.getElementById("age").value;
  const stage = document.getElementById("stage").value;

  // Validate inputs
  if (!name.trim()) {
    alert("Please enter a name");
    return;
  }

  // Save metadata to Supabase
  savePatientMetadata(name, age, stage, timestamp).then(patientId => {
    if (patientId) {
      // Save spirals linked to patient
      saveImage(patientId, 1, document.getElementById("canvas_spiral1"), "spiral");
      saveImage(patientId, 2, document.getElementById("canvas_spiral2"), "spiral");
      saveImage(patientId, 1, document.getElementById("canvas_wave1"), "wave");
      saveImage(patientId, 2, document.getElementById("canvas_wave2"), "wave");
    }
  });

  // Save spirals with delays
  // setTimeout(() => downloadImage(document.getElementById("canvas_spiral1"), `spiral1_${timestamp}.png`), 0);
  // setTimeout(() => downloadImage(document.getElementById("canvas_spiral2"), `spiral2_${timestamp}.png`), 100);
  // setTimeout(() => downloadImage(document.getElementById("canvas_wave1"), `wave1_${timestamp}.png`), 200);
  // setTimeout(() => downloadImage(document.getElementById("canvas_wave2"), `wave2_${timestamp}.png`), 300);
}

/* ---------- Initialize ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Setup canvas drawing
  setupCanvas(document.getElementById("canvas_spiral1"));
  setupCanvas(document.getElementById("canvas_spiral2"));
  setupCanvas(document.getElementById("canvas_wave1"));
  setupCanvas(document.getElementById("canvas_wave2"));

  // Load templates
  loadTemplate("template_spiral1", "templates/spiral_template.png");
  loadTemplate("template_spiral2", "templates/spiral_template.png");
  loadTemplate("template_wave1", "templates/wave_template.png");
  loadTemplate("template_wave2", "templates/wave_template.png");

  // Setup tab switching
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      openTab(tabId);
    });
  });

  // Setup clear buttons
  document.querySelectorAll(".clear-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const canvasId = btn.getAttribute("data-canvas");
      clearCanvas(canvasId);
    });
  });

  document.querySelectorAll(".previous-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextTabId = btn.getAttribute("data-next");
      if (nextTabId) openTab(nextTabId);
    });
  });

  document.querySelectorAll(".next-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextTabId = btn.getAttribute("data-next");
      if (nextTabId) openTab(nextTabId);
    });
  });

  // Setup save button
  document.getElementById("saveBtn").addEventListener("click", saveAll);
});
