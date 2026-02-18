/*********************************
 * AWTAD - Coach Dashboard
 * Uses tables: "Coach" and "Client"
 * Client has: coach_id, request_status
 *********************************/

const SUPABASE_URL = "https://mtxungnwzittdxnfdhvd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pPnHK3uF-_roE6wmByPKxw_-kt5gpgr";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tables / columns (match your schema)
const TABLE_COACH = "Coach";
const TABLE_CLIENT = "Client";

const COACH_COLS = "coach_id,email,Fname,Lname,Specialty";
const CLIENT_COLS = "client_id,email,Fname,Lname,Phone_Number,coach_id,request_status,profile_pic_url";

// Helpers
const $ = (id) => document.getElementById(id);
const norm = (s) => (s ? String(s).toLowerCase() : "none");

function initials(f, l) {
  const a = (f || "").trim()[0] || "";
  const b = (l || "").trim()[0] || "";
  return (a + b).toUpperCase() || "CL";
}

function formatMonthYear(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Auth
async function getLoggedInEmail() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  const email = data?.user?.email;
  if (!email) throw new Error("No logged-in user. Please login as coach.");
  return email;
}

// DB
async function loadCoachByEmail(email) {
  const { data, error } = await supabaseClient
    .from(TABLE_COACH)
    .select(COACH_COLS)
    .ilike("email", email.trim())
    .maybeSingle();

  if (error) throw error;
  return data; // null if not found
}

async function loadClientsForCoach(coach_id, status) {
  const { data, error } = await supabaseClient
    .from(TABLE_CLIENT)
    .select(CLIENT_COLS)
    .eq("coach_id", coach_id)
    .eq("request_status", status)
    .order("email", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function updateClientRequest(client_id, status) {
  const { error } = await supabaseClient
    .from(TABLE_CLIENT)
    .update({ request_status: status })
    .eq("client_id", client_id);

  if (error) throw error;
}

// Render Coach badge
function renderCoachTop(coach) {
  const fullName = `${coach?.Fname ?? ""} ${coach?.Lname ?? ""}`.trim() || "Coach";

  if ($("coachNameTop")) $("coachNameTop").textContent = fullName;
  if ($("coachEmailTop")) $("coachEmailTop").textContent = coach?.email ?? "—";
  if ($("coachSpecialtyTop"))
    $("coachSpecialtyTop").textContent = `Specialty: ${coach?.Specialty ?? "—"}`;

  if ($("welcomeTitle")) $("welcomeTitle").textContent = `Welcome, ${fullName}`;
}

// Pending requests UI
function renderPending(pendingClients) {
  const grid = $("pendingGrid");
  const empty = $("pendingEmpty");
  if (!grid || !empty) return;

  grid.innerHTML = "";

  if (!pendingClients.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  pendingClients.forEach((c) => {
    const fullName = `${c.Fname ?? ""} ${c.Lname ?? ""}`.trim() || "Client";
    const init = initials(c.Fname, c.Lname);

    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:14px;">
        <div style="display:flex; gap:14px; align-items:center;">
          <div class="coach-avatar" style="width:56px;height:56px;">${escapeHtml(init)}</div>
          <div>
            <div style="font-size:1.25rem; font-weight:600; color:#ffccbb; margin-bottom:4px;">
              ${escapeHtml(fullName)}
            </div>
            <div style="opacity:.85; font-size:.95rem;">${escapeHtml(c.email || "")}</div>
          </div>
        </div>
        <span class="pill" style="margin-top:0;">Pending</span>
      </div>

      <div style="display:flex; gap:10px; margin-top:auto;">
        <button class="action-btn primary" style="padding:10px 14px;" data-accept="${c.client_id}">
          <i class="fa-solid fa-check"></i> Accept
        </button>
        <button class="action-btn" style="padding:10px 14px;" data-reject="${c.client_id}">
          <i class="fa-solid fa-xmark"></i> Reject
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-accept]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const clientId = btn.getAttribute("data-accept");
      await updateClientRequest(clientId, "accepted");
      await loadCoachDashboard();
    });
  });

  grid.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const clientId = btn.getAttribute("data-reject");
      await updateClientRequest(clientId, "rejected");
      await loadCoachDashboard();
    });
  });
}

// Clients UI (your image style)
function renderClients(acceptedClients) {
  const grid = $("clientsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!acceptedClients.length) {
    grid.innerHTML = `<div style="opacity:.9; line-height:1.6;">No clients yet. Accept requests and they will appear here.</div>`;
    return;
  }

  acceptedClients.forEach((c) => {
    const fullName = `${c.Fname ?? ""} ${c.Lname ?? ""}`.trim() || "Client";
    const init = initials(c.Fname, c.Lname);

    // placeholders until you connect sessions/stats tables
    const sessions = "—";
    const imbalance = "—";
    const improvement = "—";

    const tags = ["VL Focus", "Consistent", "Squat Dominant"]; // later from DB

    const card = document.createElement("div");
    card.className = "client-card";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:16px;">
        <div style="display:flex; gap:14px; align-items:center;">
          <div class="coach-avatar" style="width:64px;height:64px;font-size:1.2rem;">${escapeHtml(init)}</div>
          <div>
            <div style="font-size:1.45rem; font-weight:700; color:#ffccbb; margin-bottom:4px;">
              ${escapeHtml(fullName)}
            </div>
            <div style="opacity:.85;">Client</div>
          </div>
        </div>

        <span style="
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 12px; border-radius:999px;
          background: rgba(141, 211, 161, 0.2);
          color: #8dd3a1;
          font-weight:600; font-size:.9rem;">
          Active
        </span>
      </div>

      <div style="display:flex; justify-content:space-between; gap:16px; margin: 6px 0 14px;">
        <div style="flex:1; text-align:center;">
          <div style="font-size:1.9rem; font-weight:300; color:#ffccbb;">${sessions}</div>
          <div style="opacity:.85; margin-top:4px;">Sessions</div>
        </div>
        <div style="flex:1; text-align:center;">
          <div style="font-size:1.9rem; font-weight:300; color:#ffccbb;">${imbalance}</div>
          <div style="opacity:.85; margin-top:4px;">Imbalance</div>
        </div>
        <div style="flex:1; text-align:center;">
          <div style="font-size:1.9rem; font-weight:300; color:#ffccbb;">${improvement}</div>
          <div style="opacity:.85; margin-top:4px;">Improvement</div>
        </div>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        ${tags.map(t => `<span class="pill" style="margin-top:0;">${escapeHtml(t)}</span>`).join("")}
      </div>

      <div style="display:flex; gap:12px; margin-top:auto;">
        <button class="action-btn primary" style="flex:1; justify-content:center; padding:12px 14px;" data-view="${c.client_id}">
          <i class="fa-solid fa-chart-line"></i> View Progress
        </button>
        <button class="action-btn" style="flex:1; justify-content:center; padding:12px 14px;" data-msg="${c.client_id}">
          <i class="fa-solid fa-envelope"></i> Message
        </button>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      goToClientPage(c.client_id);
    });

    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      goToClientPage(btn.getAttribute("data-view"));
    });
  });

  grid.querySelectorAll("[data-msg]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      alert("Messaging later 👍");
    });
  });
}

function goToClientPage(clientId) {
  // change this to YOUR real client page file
  window.location.href = `profileawtad.html?client_id=${encodeURIComponent(clientId)}`;
}

// Main loader
async function loadCoachDashboard() {
  try {
    const coachEmail = await getLoggedInEmail();

    const coach = await loadCoachByEmail(coachEmail);
    if (!coach) throw new Error("Coach not found in Coach table. Check coach email matches exactly.");
    renderCoachTop(coach);

    const pending = await loadClientsForCoach(coach.coach_id, "pending");
    renderPending(pending);

    const accepted = await loadClientsForCoach(coach.coach_id, "accepted");
    renderClients(accepted);

    if ($("statActiveClients")) $("statActiveClients").textContent = String(accepted.length);
  } catch (e) {
    console.error(e);
    alert(e.message || "Failed to load coach dashboard.");
  }
}

// Logout modal wiring (your same UI)
function wireLogoutModal() {
  const logoutBtn = $("logoutBtn");
  const logoutModal = $("logoutModal");
  const cancelLogout = $("cancelLogout");
  const confirmLogout = $("confirmLogout");

  if (!logoutBtn || !logoutModal || !cancelLogout || !confirmLogout) return;

  logoutBtn.addEventListener("click", () => logoutModal.classList.add("active"));
  cancelLogout.addEventListener("click", () => logoutModal.classList.remove("active"));
  logoutModal.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.classList.remove("active");
  });

  confirmLogout.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "loginawtad.html";
  });
}

function wireNavButtons() {
  const viewScheduleBtn = $("viewScheduleBtn");
  if (viewScheduleBtn) viewScheduleBtn.addEventListener("click", () => {
    window.location.href = "scheduleawtad.html";
  });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  wireLogoutModal();
  wireNavButtons();

  const refreshBtn = $("refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadCoachDashboard);

  loadCoachDashboard();
});
