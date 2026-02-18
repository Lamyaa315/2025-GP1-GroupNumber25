/*********************************
 * AWTAD - Profile Page (Client)
 * - Load client by auth email
 * - Edit profile (Fname, Lname, Phone_Number)
 * - Coach handshake (coach_id + request_status)
 * - Profile pic upload (Storage bucket: profile-pics)
 *********************************/

// 1) SUPABASE CONFIG

const SUPABASE_URL = "https://mtxungnwzittdxnfdhvd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pPnHK3uF-_roE6wmByPKxw_-kt5gpgr";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// 2) Helpers
const $ = (id) => document.getElementById(id);

function normalizeStatus(s) {
  if (!s) return "none";
  return String(s).toLowerCase();
}

function setCoachMsg(text, ok = true) {
  const msg = $("coachMsg");
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? "#bff0c8" : "#ffb0b0";
}

function setCoachStatus(pillClass, pillText, helperText = "") {
  const pill = $("coachStatusPill");
  const helper = $("coachStatusText");
  if (!pill || !helper) return;

  pill.className = `status-pill ${pillClass}`;
  pill.textContent = pillText;
  helper.textContent = helperText;
}

// 3) DB config (match your schema)
const TABLE_CLIENT = "Client";
const TABLE_COACH = "Coach";

const CLIENT_COLS =
  "client_id,email,Fname,Lname,Phone_Number,coach_id,request_status,profile_pic_url";
const COACH_COLS = "coach_id,email,Fname,Lname,Specialty";

// 4) State
let clientRow = null;
let editing = false;

// 5) Auth + DB
async function getLoggedInUserEmail() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  const email = data?.user?.email;
  if (!email) throw new Error("No logged-in user. Please login first.");
  return email;
}

async function loadClientByEmail(email) {
  // IMPORTANT: if email casing differs in DB, consider switching to ilike
  const { data, error } = await supabaseClient
    .from(TABLE_CLIENT)
    .select(CLIENT_COLS)
    .eq("email", email)
    .single();

  if (error) throw error;
  return data;
}

async function loadCoachById(coachId) {
  const { data, error } = await supabaseClient
    .from(TABLE_COACH)
    .select(COACH_COLS)
    .eq("coach_id", coachId)
    .single();

  if (error) throw error;
  return data;
}

async function loadCoachByEmail(email) {
  const { data, error } = await supabaseClient
    .from(TABLE_COACH)
    .select(COACH_COLS)
    .ilike("email", email.trim())
    .maybeSingle();

  if (error) throw error;
  return data; // null if not found
}

async function updateClient(clientId, patch) {
  const { error } = await supabaseClient
    .from(TABLE_CLIENT)
    .update(patch)
    .eq("client_id", clientId);

  if (error) throw error;
}

// 6) Render UI
function renderClientUI() {
  const fullName =
    `${clientRow?.Fname ?? ""} ${clientRow?.Lname ?? ""}`.trim() || "Profile";

  if ($("profileTitle")) $("profileTitle").textContent = `${fullName}'s Profile`;
  if ($("nameDisplay")) $("nameDisplay").textContent = fullName;

  // Optional placeholders if you don’t have these in DB yet:
  if ($("titleDisplay")) $("titleDisplay").textContent = "Fitness Enthusiast";
  if ($("bioDisplay"))
    $("bioDisplay").textContent =
      "Passionate about fitness and improving muscle balance.";

  // Fill right card values
  if ($("fnameValue")) $("fnameValue").textContent = clientRow?.Fname ?? "—";
  if ($("lnameValue")) $("lnameValue").textContent = clientRow?.Lname ?? "—";
  if ($("emailValue")) $("emailValue").textContent = clientRow?.email ?? "—";
  if ($("phoneValue"))
    $("phoneValue").textContent = clientRow?.Phone_Number ?? "—";

  // Prefill inputs (when entering edit mode)
  if ($("fnameInput")) $("fnameInput").value = clientRow?.Fname ?? "";
  if ($("lnameInput")) $("lnameInput").value = clientRow?.Lname ?? "";
  if ($("phoneInput")) $("phoneInput").value = clientRow?.Phone_Number ?? "";

  renderProfilePic();
}

function renderProfilePic() {
  const url = clientRow?.profile_pic_url;
  const img = $("avatarImg");
  if (!img) return;

  if (url) {
    img.src = url;
    img.style.display = "block";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
  }
}

async function renderCoachUI() {
  const status = normalizeStatus(clientRow?.request_status);
  const coachId = clientRow?.coach_id;

  // Hide coach card unless accepted
  if ($("currentCoachBox")) $("currentCoachBox").style.display = "none";
  if ($("cancelRequestBtn")) $("cancelRequestBtn").style.display = "none";

  if ($("coachName")) $("coachName").textContent = "—";
  if ($("coachDesc")) $("coachDesc").textContent = "—";
  if ($("coachSpecialty")) $("coachSpecialty").textContent = "Specialty: —";

  if (!coachId && status === "none") {
    setCoachStatus("none", "No coach", "Send a request using coach email.");
    return;
  }

  if (coachId && status === "pending") {
    setCoachStatus("pending", "Pending", "Waiting for coach approval.");
    if ($("cancelRequestBtn")) $("cancelRequestBtn").style.display = "inline-flex";
    return;
  }

  if (status === "rejected") {
    setCoachStatus("bad", "Rejected", "Request declined. You can send another request.");
    return;
  }

  if (coachId && status === "accepted") {
    setCoachStatus("ok", "Connected", "Coach can view your sessions and results.");

    const coach = await loadCoachById(coachId);
    if ($("coachName"))
      $("coachName").textContent =
        `${coach.Fname ?? ""} ${coach.Lname ?? ""}`.trim() || "Coach";
    if ($("coachDesc")) $("coachDesc").textContent = coach.email ?? "—";
    if ($("coachSpecialty"))
      $("coachSpecialty").textContent = `Specialty: ${coach.Specialty ?? "—"}`;

    if ($("currentCoachBox")) $("currentCoachBox").style.display = "flex";
    return;
  }

  setCoachStatus("none", "Unknown", "Check request_status values in Client table.");
}

// 7) Coach handshake actions
async function sendCoachRequest() {
  const inputEmail = $("coachEmailInput")?.value?.trim();
  if (!inputEmail) return setCoachMsg("Please enter a coach email.", false);

  const status = normalizeStatus(clientRow?.request_status);
  if (status === "pending")
    return setCoachMsg("You already have a pending request. Cancel it first.", false);
  if (status === "accepted")
    return setCoachMsg("You already have a connected coach.", false);

  const coach = await loadCoachByEmail(inputEmail);
  if (!coach) return setCoachMsg("Coach not found. Check the email.", false);

  await updateClient(clientRow.client_id, {
    coach_id: coach.coach_id,
    request_status: "pending",
  });

  clientRow.coach_id = coach.coach_id;
  clientRow.request_status = "pending";

  setCoachMsg("Request sent! Waiting for coach approval.", true);
  await renderCoachUI();
}

async function cancelCoachRequest() {
  const status = normalizeStatus(clientRow?.request_status);
  if (status !== "pending") return setCoachMsg("No pending request to cancel.", false);

  await updateClient(clientRow.client_id, {
    coach_id: null,
    request_status: "none",
  });

  clientRow.coach_id = null;
  clientRow.request_status = "none";

  setCoachMsg("Request cancelled.", true);
  await renderCoachUI();
}

// 8) Edit Profile (toggle + save to DB)
function enterEditMode() {
  editing = true;
  if ($("editToggleBtn"))
    $("editToggleBtn").innerHTML = `<i class="fa-solid fa-xmark"></i> Cancel`;
  if ($("saveBtn")) $("saveBtn").style.display = "inline-flex";

  // show inputs
  if ($("fnameValue")) $("fnameValue").style.display = "none";
  if ($("lnameValue")) $("lnameValue").style.display = "none";
  if ($("phoneValue")) $("phoneValue").style.display = "none";

  if ($("fnameInput")) $("fnameInput").style.display = "block";
  if ($("lnameInput")) $("lnameInput").style.display = "block";
  if ($("phoneInput")) $("phoneInput").style.display = "block";

  // prefill
  if ($("fnameInput")) $("fnameInput").value = clientRow?.Fname ?? "";
  if ($("lnameInput")) $("lnameInput").value = clientRow?.Lname ?? "";
  if ($("phoneInput")) $("phoneInput").value = clientRow?.Phone_Number ?? "";
}

function exitEditMode(resetInputs = true) {
  editing = false;
  if ($("editToggleBtn"))
    $("editToggleBtn").innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Profile`;
  if ($("saveBtn")) $("saveBtn").style.display = "none";

  // hide inputs
  if ($("fnameValue")) $("fnameValue").style.display = "block";
  if ($("lnameValue")) $("lnameValue").style.display = "block";
  if ($("phoneValue")) $("phoneValue").style.display = "block";

  if ($("fnameInput")) $("fnameInput").style.display = "none";
  if ($("lnameInput")) $("lnameInput").style.display = "none";
  if ($("phoneInput")) $("phoneInput").style.display = "none";

  if (resetInputs) {
    if ($("fnameInput")) $("fnameInput").value = clientRow?.Fname ?? "";
    if ($("lnameInput")) $("lnameInput").value = clientRow?.Lname ?? "";
    if ($("phoneInput")) $("phoneInput").value = clientRow?.Phone_Number ?? "";
  }
}

async function saveProfileToDB() {
  const newF = $("fnameInput")?.value?.trim() || "";
  const newL = $("lnameInput")?.value?.trim() || "";
  const newP = $("phoneInput")?.value?.trim() || "";

  if (!newF || !newL) {
    alert("Please enter First Name and Last Name.");
    return;
  }

  await updateClient(clientRow.client_id, {
    Fname: newF,
    Lname: newL,
    Phone_Number: newP,
  });

  clientRow.Fname = newF;
  clientRow.Lname = newL;
  clientRow.Phone_Number = newP;

  renderClientUI();
  exitEditMode(false);

  // show your modal if you want
  const saveModal = $("saveModal");
  if (saveModal) saveModal.classList.add("show");
}

// 9) Profile picture upload (Supabase Storage)
async function uploadProfilePic(file) {
  // must have: bucket "profile-pics"
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${clientRow.client_id}.${ext}`;

  const { error: upErr } = await supabaseClient
    .storage
    .from("profile-pics")
    .upload(path, file, { upsert: true });

  if (upErr) throw upErr;

  const { data } = supabaseClient.storage.from("profile-pics").getPublicUrl(path);
  const url = data?.publicUrl;
  if (!url) throw new Error("Could not get public URL for image.");

  await updateClient(clientRow.client_id, { profile_pic_url: url });
  clientRow.profile_pic_url = url;

  renderProfilePic();
}

// 10) Logout
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// 11) Init
async function init() {
  setCoachStatus("none", "Loading...", "");

  const email = await getLoggedInUserEmail();
  clientRow = await loadClientByEmail(email);

  renderClientUI();
  await renderCoachUI();
listenForHandshakeUpdates(); 
}


function listenForHandshakeUpdates() {
  if (!clientRow?.client_id) return;

  supabaseClient
    .channel("client-handshake")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: TABLE_CLIENT,
        filter: `client_id=eq.${clientRow.client_id}`,
      },
      async (payload) => {
        // update local state then re-render coach UI
        clientRow = payload.new;
        renderClientUI();
        await renderCoachUI();
      }
    )
    .subscribe();
}

































// 12) Events (safe binding)
window.addEventListener("DOMContentLoaded", () => {
  // Logout
  if ($("logoutBtn")) $("logoutBtn").addEventListener("click", logout);

  // Save modal
  if ($("saveOkBtn")) {
    $("saveOkBtn").addEventListener("click", () => $("saveModal")?.classList.remove("show"));
  }

  // Coach
  if ($("sendRequestBtn")) $("sendRequestBtn").addEventListener("click", () => sendCoachRequest().catch(e => setCoachMsg(e.message, false)));
  if ($("cancelRequestBtn")) $("cancelRequestBtn").addEventListener("click", () => cancelCoachRequest().catch(e => setCoachMsg(e.message, false)));
  if ($("coachChangeBtn")) $("coachChangeBtn").addEventListener("click", () => $("coachEmailInput")?.focus());

  // Edit Profile
  if ($("editToggleBtn")) {
    $("editToggleBtn").addEventListener("click", () => {
      if (!editing) enterEditMode();
      else exitEditMode(true);
    });
  }
  if ($("saveBtn")) $("saveBtn").addEventListener("click", () => saveProfileToDB().catch(console.error));

  // Profile pic
  if ($("profilePicBtn") && $("profilePicInput")) {
    $("profilePicBtn").addEventListener("click", () => $("profilePicInput").click());
    $("profilePicInput").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      uploadProfilePic(file).catch((err) => {
        console.error(err);
        alert("Upload failed: " + (err.message || err));
      });
    });
  }

  // Share
  if ($("shareBtn")) {
    $("shareBtn").addEventListener("click", async () => {
      const text = `${$("nameDisplay")?.textContent || "AWTAD"} - Profile`;
      try {
        await navigator.clipboard.writeText(text);
        alert("Copied!");
      } catch {
        alert(text);
      }
    });
  }

  // Start
  init().catch((err) => {
    console.error(err);
    setCoachStatus("bad", "Error", err.message || "Something went wrong.");
    setCoachMsg(err.message || "Something went wrong.", false);
  });
});
