/**
 * MediTrack PHC - Single Hospital Requests Controller
 * Separates Incoming Requests (to approve/reject) from Outgoing Requests (tracking)
 * Includes Live Transit Tracking (Ambulance / Runner Dispatch Tracker)
 */

let incomingCache = [];
let outgoingCache = [];
let currentTrackingItem = null;

document.addEventListener("DOMContentLoaded", () => {
  setupRequestsPage();
});

async function setupRequestsPage() {
  await Promise.all([
    loadIncomingRequests(),
    loadOutgoingRequests(),
    loadDistrictIndent()
  ]);
}

async function loadIncomingRequests() {
  try {
    const res = await fetch("/api/requests?type=incoming");
    const json = await res.json();
    const tbody = document.getElementById("incomingRequestsBody");
    tbody.innerHTML = "";

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-muted">No incoming requests received from other hospitals.</td></tr>`;
      return;
    }

    incomingCache = json.data;

    json.data.forEach(r => {
      const tr = document.createElement("tr");

      const urgencyBadge = r.urgency === "EMERGENCY" 
        ? `<span class="badge badge-emergency">EMERGENCY</span>` 
        : `<span class="badge badge-yellow">NORMAL</span>`;

      let statusBadge = "";
      if (r.status === "approved") {
        statusBadge = `<span class="badge badge-green">✓ Approved & Dispatched</span>`;
      } else if (r.status === "rejected") {
        statusBadge = `<span class="badge badge-red">✕ Rejected</span>`;
      } else {
        statusBadge = `<span class="badge badge-yellow">⏳ Pending</span>`;
      }

      let dispatchBadge = "";
      if (r.dispatch_type === "AUTONOMOUS_TRIGGER") {
        dispatchBadge = `<div style="margin-top:2px;"><span class="badge" style="background:#4338ca; color:white; font-size:0.7rem;">⚡ Autonomous Waybill</span></div>`;
      } else if (r.dispatch_type === "RESCUE_SWAP") {
        dispatchBadge = `<div style="margin-top:2px;"><span class="badge" style="background:#d97706; color:white; font-size:0.7rem;">💡 Smart Rescue Swap</span></div>`;
      }

      let actions = "—";
      if (r.status === "pending") {
        actions = `
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <button class="btn btn-success btn-sm" onclick="approveRequest(${r.id}, '${r.medicine_name}', ${r.quantity})">
              Approve
            </button>
            <button class="btn btn-outline btn-sm text-danger" onclick="rejectRequest(${r.id})">
              Reject
            </button>
            <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${r.medicine_id}, null, '${r.batch_no || ''}', ${r.id})">
              📜 Passport
            </button>
          </div>
        `;
      } else if (r.status === "approved") {
        actions = `
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="openTrackModal(${r.id}, 'incoming')">
              🚑 Track Dispatch
            </button>
            <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${r.medicine_id}, null, '${r.batch_no || ''}', ${r.id})">
              📜 Passport
            </button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td>${urgencyBadge} ${dispatchBadge}</td>
        <td><strong>${r.medicine_name}</strong> (${r.medicine_unit})</td>
        <td><strong>🏥 ${r.requester_name}</strong></td>
        <td><span class="badge badge-outline font-weight-bold" style="font-size:0.85rem;">${r.quantity}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:var(--slate-500);">${r.created_at}</td>
        <td>${actions}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading incoming requests:", err);
  }
}

async function loadOutgoingRequests() {
  try {
    const res = await fetch("/api/requests?type=outgoing");
    const json = await res.json();
    const tbody = document.getElementById("outgoingRequestsBody");
    tbody.innerHTML = "";

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-muted">You haven't submitted any transfer requests to donor hospitals yet.</td></tr>`;
      return;
    }

    outgoingCache = json.data;

    json.data.forEach(r => {
      const tr = document.createElement("tr");

      const urgencyBadge = r.urgency === "EMERGENCY" 
        ? `<span class="badge badge-emergency">EMERGENCY</span>` 
        : `<span class="badge badge-yellow">NORMAL</span>`;

      let dispatchBadge = "";
      if (r.dispatch_type === "AUTONOMOUS_TRIGGER") {
        dispatchBadge = `<div style="margin-top:2px;"><span class="badge" style="background:#4338ca; color:white; font-size:0.7rem;">⚡ Autonomous Waybill</span></div>`;
      } else if (r.dispatch_type === "RESCUE_SWAP") {
        dispatchBadge = `<div style="margin-top:2px;"><span class="badge" style="background:#d97706; color:white; font-size:0.7rem;">💡 Smart Rescue Swap</span></div>`;
      }

      let statusBadge = "";
      let trackAction = "—";

      if (r.status === "approved") {
        statusBadge = `<span class="badge badge-green">✓ Stock Transferred & En Route</span>`;
        trackAction = `
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="openTrackModal(${r.id}, 'outgoing')" style="box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
              🚑 Track Live Transit
            </button>
            <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${r.medicine_id}, null, '${r.batch_no || ''}', ${r.id})">
              📜 Passport
            </button>
          </div>
        `;
      } else if (r.status === "rejected") {
        statusBadge = `<span class="badge badge-red">✕ Request Rejected</span>`;
        trackAction = `
          <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${r.medicine_id}, null, '${r.batch_no || ''}', ${r.id})">
            📜 Passport
          </button>
        `;
      } else {
        statusBadge = `<span class="badge badge-yellow">⏳ Awaiting Donor Action</span>`;
        trackAction = `
          <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${r.medicine_id}, null, '${r.batch_no || ''}', ${r.id})">
            📜 Passport
          </button>
        `;
      }

      tr.innerHTML = `
        <td>${urgencyBadge} ${dispatchBadge}</td>
        <td><strong>${r.medicine_name}</strong> (${r.medicine_unit})</td>
        <td><strong>🏥 ${r.donor_name}</strong></td>
        <td><span class="badge badge-outline font-weight-bold" style="font-size:0.85rem;">${r.quantity}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:var(--slate-500);">${r.created_at}</td>
        <td>${trackAction}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading outgoing requests:", err);
  }
}

function openTrackModal(requestId, type) {
  const list = type === 'incoming' ? incomingCache : outgoingCache;
  const item = list.find(r => r.id === requestId);
  if (!item) return;

  currentTrackingItem = item;

  document.getElementById("trackConsignmentId").textContent = 
    `Consignment: ${item.tracking_no || 'TN-MED-0001'} • Priority: ${item.urgency}`;
  document.getElementById("trackDonorName").textContent = item.donor_name;
  document.getElementById("trackRequesterName").textContent = item.requester_name;
  document.getElementById("trackDistanceBadge").textContent = `${item.distance_km || 8.4} km away`;
  document.getElementById("trackMedicineQty").textContent = 
    `${item.quantity} ${item.medicine_unit} of ${item.medicine_name}`;
  document.getElementById("trackEta").textContent = `~${item.eta_minutes || 22} Minutes`;
  document.getElementById("trackCarrier").textContent = item.carrier || "TN 108 Medical Van / Runner";
  document.getElementById("trackColdChain").textContent = `✓ ${item.temperature || 'Controlled Cold-Chain (4°C - 8°C)'}`;

  // Reset stepper to active in-transit state
  const stepTransit = document.getElementById("stepTransit");
  const stepDelivered = document.getElementById("stepDelivered");
  const circleDelivered = document.getElementById("circleDelivered");
  const trackStepLine = document.getElementById("trackStepLine");
  const btnMarkReceived = document.getElementById("btnMarkReceived");
  const trackNoticeBox = document.getElementById("trackNoticeBox");

  stepTransit.className = "transit-step-item active";
  stepDelivered.className = "transit-step-item";
  circleDelivered.textContent = "📦";
  trackStepLine.style.width = "65%";
  btnMarkReceived.disabled = false;
  btnMarkReceived.textContent = "✓ Mark as Received & Verified";
  trackNoticeBox.innerHTML = `
    <span style="font-size:1.5rem;">📍</span>
    <div>
      <strong>Live Vehicle Tracking Active:</strong> Emergency stock has departed ${item.donor_name} and is currently en route via highway. Expected at pharmacy counter in ~${item.eta_minutes || 22} mins.
    </div>
  `;

  openModal("transitTrackerModal");
}

function confirmDeliveryReceipt() {
  if (!currentTrackingItem) return;

  const stepTransit = document.getElementById("stepTransit");
  const stepDelivered = document.getElementById("stepDelivered");
  const circleDelivered = document.getElementById("circleDelivered");
  const trackStepLine = document.getElementById("trackStepLine");
  const btnMarkReceived = document.getElementById("btnMarkReceived");
  const trackNoticeBox = document.getElementById("trackNoticeBox");

  stepTransit.className = "transit-step-item completed";
  stepDelivered.className = "transit-step-item completed active";
  circleDelivered.textContent = "✓";
  trackStepLine.style.width = "100%";
  btnMarkReceived.disabled = true;
  btnMarkReceived.textContent = "✓ Stock Received & Added to Rack";

  trackNoticeBox.innerHTML = `
    <span style="font-size:1.5rem;">🎉</span>
    <div>
      <strong>Consignment Verified & Stored:</strong> All ${currentTrackingItem.quantity} units of ${currentTrackingItem.medicine_name} have safely arrived at ${currentTrackingItem.requester_name} and are placed on dispensary shelves!
    </div>
  `;

  showToast(`Consignment ${currentTrackingItem.tracking_no} received! Stock physically verified.`, "success");
}

async function approveRequest(requestId, medName, qty) {
  if (!confirm(`Are you sure you want to approve this transfer of ${qty} units of ${medName} from your surplus inventory?`)) return;

  try {
    const res = await fetch(`/api/requests/${requestId}/approve`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      showToast("Transfer approved! Stock dispatched and alerts updated.", "success");
      loadIncomingRequests();
      loadDistrictIndent();
      refreshAlertCount();
    } else {
      showToast(json.error || "Approval failed", "error");
    }
  } catch (err) {
    showToast("Error processing approval", "error");
  }
}

async function rejectRequest(requestId) {
  if (!confirm("Are you sure you want to reject this transfer request?")) return;

  try {
    const res = await fetch(`/api/requests/${requestId}/reject`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      showToast("Transfer request marked as rejected.", "warning");
      loadIncomingRequests();
    } else {
      showToast(json.error || "Rejection failed", "error");
    }
  } catch (err) {
    showToast("Error rejecting request", "error");
  }
}

async function loadDistrictIndent() {
  try {
    const res = await fetch("/api/indent");
    const json = await res.json();
    const tbody = document.getElementById("indentTableBody");
    tbody.innerHTML = "";

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-muted">All local shortages are covered or within safe levels. No district indent required.</td></tr>`;
      return;
    }

    json.data.forEach(it => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><strong>${it.medicine_name}</strong> (${it.medicine_unit})</td>
        <td>${it.current_stock}</td>
        <td>${it.avg_daily_usage} / day</td>
        <td>${it.target_30_day}</td>
        <td><span class="badge badge-green">+${it.peer_covered} units</span></td>
        <td><strong style="color:var(--danger);">${it.net_district_indent}</strong></td>
        <td>${it.suggested_top_donor}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading indent:", err);
  }
}
