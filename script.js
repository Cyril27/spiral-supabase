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
  ctx.strokeStyle = "black";

  let drawing = false;
  let start_time = 0;
  let reset_draw = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDraw(e) {

    if (reset_draw) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      reset_draw = false;
    }
    
    drawing = true;
    start_time = Date.now();
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {

    if (!drawing) return;

    if (drawing) {
      canvasDrawn[canvas.id] = true;
      updateSaveButton();
    }

    drawing = false;
    reset_draw = true;
    const end_time = Date.now();
    const duration = end_time - start_time;
    console.log(`Drawing duration: ${duration} ms`);
  }

  // Mouse
  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);

  // Touch
  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", e => {
    draw(e);
    e.preventDefault();
  });
  canvas.addEventListener("touchend", endDraw);

  // Pressure sensitivity (if supported)
  canvas.addEventListener("pointerdown", (e) => {
    console.log("Pressure:", e.pressure); // 0 to 1
    document.getElementById("pressure").textContent = `Pressure: ${e.pressure}`;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (e.pressure > 0) {
      console.log("Drawing pressure:", e.pressure);
      document.getElementById("pressure").textContent = `Pressure: ${e.pressure}`;
    }
  });
  
}



function clearCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  canvasDrawn[canvasId] = false;
  updateSaveButton();
}


const canvasDrawn = {
  canvas_spiral1: false,
  canvas_spiral2: false,
  canvas_wave1: false,
  canvas_wave2: false
};

function isCanvasEmpty(canvas) {
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return !pixels.some(value => value !== 0);
}

function markCanvasUsed() {
  updateSaveButton();
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

async function savePatientMetadata(first_name, last_name, age, sex, stage, smoker, writing_hand, timestamp) {
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
          first_name: first_name,
          last_name: last_name,
          age: parseInt(age),
          sex: sex,
          stage: parseInt(stage),
          smoker: smoker,
          writing_hand: writing_hand,
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

    const filePath = `${subfolder}/${subfolder}_${patientId}_${spiralNumber}.png`;

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


function canSave() {
  return (
    document.getElementById("first-name").value.trim() &&
    document.getElementById("last-name").value.trim() &&
    document.getElementById("age").value &&
    document.querySelector('input[name="sex"]:checked') &&
    document.querySelector('input[name="stage"]:checked') &&
    document.querySelector('input[name="smoker"]:checked') &&
    document.querySelector('input[name="writing-hand"]:checked') &&
    Object.values(canvasDrawn).every(Boolean)
  );
}


function updateSaveButton() {
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = !canSave();
}






async function saveAll() {
  
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {

    const now = new Date();
    const timestamp = now.getFullYear() + "_" +
                      String(now.getMonth() + 1).padStart(2, "0") + "_" +
                      String(now.getDate()).padStart(2, "0") + "-" +
                      String(now.getHours()).padStart(2, "0") + "_" +
                      String(now.getMinutes()).padStart(2, "0") + "_" +
                      String(now.getSeconds()).padStart(2, "0");

    const first_name = document.getElementById("first-name").value;
    const last_name = document.getElementById("last-name").value;
    const age = document.getElementById("age").value ? document.getElementById("age").value : "";
    const sex = document.querySelector('input[name="sex"]:checked') ? document.querySelector('input[name="sex"]:checked').value : "";
    const stage = document.querySelector('input[name="stage"]:checked') ? document.querySelector('input[name="stage"]:checked').value : "";
    const smoker = document.querySelector('input[name="smoker"]:checked') ? document.querySelector('input[name="smoker"]:checked').value === "true": null;
    const writing_hand = document.querySelector('input[name="writing-hand"]:checked') ? document.querySelector('input[name="writing-hand"]:checked').value : "";


    // Save metadata to Supabase
    savePatientMetadata(first_name, last_name, age, sex, stage, smoker, writing_hand, timestamp).then(patientId => {
      if (patientId) {
        // Save spirals linked to patient
        saveImage(patientId, 1, document.getElementById("canvas_spiral1"), "spiral");
        saveImage(patientId, 2, document.getElementById("canvas_spiral2"), "spiral");
        saveImage(patientId, 1, document.getElementById("canvas_wave1"), "wave");
        saveImage(patientId, 2, document.getElementById("canvas_wave2"), "wave");
      }
    });

    alert("Saved successfully!");
    saveBtn.textContent = "Save";
  } catch (err) {
    alert("Error during save process: " + err.message);
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

/* ---------- Initialize ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");
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

  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", updateSaveButton);
    input.addEventListener("input", updateSaveButton);
  });

  // Setup save button
  document.getElementById("saveBtn").addEventListener("click", saveAll);
  });
