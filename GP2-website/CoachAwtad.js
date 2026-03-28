/*********************************
 * AWTAD - Professional Coach Dashboard
 * Logic: Updated to use Client_Coach_Relationship table
 *********************************/

const SUPABASE_URL = "https://mtxungnwzittdxnfdhvd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pPnHK3uF-_roE6wmByPKxw_-kt5gpgr";
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache for current coach data
let currentCoach = null;
let coachRequestsChannel = null;

/**
 * 1. AUTH & INITIALIZATION
 * Checks if a coach is logged in and loads their specific profile data.
 */
async function initDashboard() {
    try {
        const { data: { user }, error: authError } = await supa.auth.getUser();
        if (authError || !user) {
            window.location.href = "loginawtad.html";
            return;
        }

        // # Fetch Coach Profile using their auth email
        const { data: coach, error: coachError } = await supa
            .from('Coach')
            .select('*')
            .eq('email', user.email)
            .single();

        if (coachError || !coach) throw new Error("Coach profile not found.");
        
        currentCoach = coach;
        
        // # Update UI with Coach's name and specialty
        renderHeader(coach);
        
        // # Fetch requests and active clients
        await refreshData();

        // # Start listening for realtime changes
        subscribeToCoachRequests();

    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

/**
 * 2. DATA FETCHING
 * This pulls from the Client_Coach_Relationship table and joins with the Client table
 * so we can see the Athlete's name and details.
 */
async function refreshData() {
    if (!currentCoach) return;

    // # Fetch Pending Requests from the Relationship table
    // We use .select('*, Client(*)') to get the athlete's name from the joined Client table
const { data: pendingRequests, error: pError } = await supa
    .from('Client_Coach_Relationship')
    .select('request_id, status, client_id, Client(client_id, Fname, Lname, email, profile_pic_url)')
    .eq('coach_id', currentCoach.coach_id)
    .eq('status', 'pending');

    // # Fetch Accepted Clients
const { data: activeClients, error: aError } = await supa
    .from('Client_Coach_Relationship')
    .select('request_id, status, client_id, Client(client_id, Fname, Lname, email, profile_pic_url)')
    .eq('coach_id', currentCoach.coach_id)
    .eq('status', 'accepted');

    renderPendingList(pendingRequests || []);
    renderAcceptedList(activeClients || []);
    
    // # Update the "Active Clients" counter on the dashboard
    if (document.getElementById('statActiveClients')) {
        document.getElementById('statActiveClients').textContent = (activeClients || []).length;
    }
}

function subscribeToCoachRequests() {
    if (!currentCoach) return;

    // remove old channel if it already exists
    if (coachRequestsChannel) {
        supa.removeChannel(coachRequestsChannel);
    }

    coachRequestsChannel = supa
        .channel(`coach-requests-${currentCoach.coach_id}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'Client_Coach_Relationship'
            },
            async (payload) => {
                console.log("Realtime change:", payload);

                const newRow = payload.new;
                const oldRow = payload.old;

                // refresh only if this change belongs to the logged-in coach
                if (
                    newRow?.coach_id === currentCoach.coach_id ||
                    oldRow?.coach_id === currentCoach.coach_id
                ) {
                    await refreshData();
                }
            }
        )
        .subscribe((status) => {
            console.log("Realtime status:", status);
        });
}

/**
 * 3. ACTIONS (Accept/Reject)
 * This updates the status in the Relationship table AND the Client table.
 */
async function handleRequest(requestId, clientId, newStatus) {
    // # STEP A: Update the Relationship table (The primary source of truth)
    const { error: relError } = await supa
        .from('Client_Coach_Relationship')
        .update({ status: newStatus })
        .eq('request_id', requestId);

    // # STEP B: Synchronize the status back to the Client table for the Athlete's view
    const { error: clientError } = await supa
        .from('Client')
        .update({ request_status: newStatus })
        .eq('client_id', clientId);

    if (relError || clientError) {
        alert("Error updating status.");
    } else {
        // # Refresh UI to show the client moved from "Pending" to "Your Clients"
        await refreshData();
    }
}

/**
 * 4. UI RENDERING
 */
function renderHeader(coach) {
    document.getElementById('coachNameSide').textContent = `${coach.Fname} ${coach.Lname}`;
    document.getElementById('coachEmailSide').textContent = coach.email;
    document.getElementById('coachNameTop').textContent = `${coach.Fname} ${coach.Lname}`;
    document.getElementById('coachEmailTop').textContent = coach.email;
    document.getElementById('coachSpecialtyTop').textContent = `Specialty: ${coach.Specialty}`;
    document.getElementById('welcomeTitle').textContent = `Welcome, Coach ${coach.Fname}`;
}

// # Function to handle default images if the athlete hasn't uploaded one
function getProfileImage(client) {
    if (client.profile_pic_url) return client.profile_pic_url;
    // Defaulting to a UI Avatar based on their initials
    return `https://ui-avatars.com/api/?name=${client.Fname}+${client.Lname}&background=ffd2c2&color=4B3A57`;
}

function renderPendingList(requests) {
    const container = document.getElementById('pendingGrid');
    const emptyMsg = document.getElementById('pendingEmpty');
    if (!container) return;

    container.innerHTML = "";
    emptyMsg.style.display = requests.length ? "none" : "block";

    requests.forEach(req => {
        const c = req.Client; // Access the joined Client data
        const div = document.createElement('div');
        div.className = "client-card";
        div.innerHTML = `
            <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px;">
                <img src="${getProfileImage(c)}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
                <div>
                    <h4 style="color:#ffd2c2; margin:0;">${c.Fname} ${c.Lname}</h4>
                    <small style="opacity:0.7;">${c.email}</small>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="action-btn primary" onclick="handleRequest('${req.request_id}', '${req.client_id}', 'accepted')">Accept</button>
                <button class="action-btn" onclick="handleRequest('${req.request_id}', '${req.client_id}', 'rejected')">Reject</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderAcceptedList(relationships) {
    const container = document.getElementById('clientsGrid');
    if (!container) return;

    container.innerHTML = relationships.length ? "" : "<p style='opacity:0.5;'>No active athletes connected.</p>";

    relationships.forEach(rel => {
        const c = rel.Client;
        const card = document.createElement('div');
        card.className = "client-card active-athlete";
        
        // # Link to the detailed athlete profile for the coach to view EMG data

        card.onclick = () => {
    if (c && c.client_id) {
        window.location.href = `athlete-dashboard.html?id=${c.client_id}`;
    } else {
        console.error("Client ID is missing in the data object", c);
    }
};
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <img src="${getProfileImage(c)}" style="width:60px; height:60px; border-radius:50%; border: 2px solid #ffd2c2;">
                    <div>
                        <h3 style="margin:0; color:#ffd2c2;">${c.Fname} ${c.Lname}</h3>
                        <span class="pill">Active Athlete</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right" style="opacity:0.5;"></i>
            </div>
            <div class="stats-row" style="display:flex; justify-content:space-around; margin-top:20px; text-align:center;">
                <div><strong style="display:block; font-size:1.2rem;">View</strong><small>Profile</small></div>
                <div><strong style="display:block; font-size:1.2rem;">Live</strong><small>Feedback</small></div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * 5. EVENTS & LOGOUT
 */
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    document.getElementById('logoutModal')?.classList.add('active');
});

document.getElementById('cancelLogout')?.addEventListener('click', () => {
    document.getElementById('logoutModal')?.classList.remove('active');
});

document.getElementById('confirmLogout')?.addEventListener('click', async () => {
    await supa.auth.signOut();
    window.location.href = "loginawtad.html";
});

// Run once the page loads
document.addEventListener("DOMContentLoaded", initDashboard);