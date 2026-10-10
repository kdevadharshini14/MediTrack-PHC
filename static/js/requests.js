/**
 * MediTrack PHC - Single Hospital Requests Controller
 * Separates Incoming Requests (to approve/reject) from Outgoing Requests (tracking)
 */

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

    json.data.forEach(r => {
      const tr = document.createElement("tr");

      const urgencyBadge = r.urgency === "EMERGENCY" 
        ? `<span class="badge badge-emergency">EMERGENCY</span>` 
        : `<span class="badge badge-yellow">NORMAL</span>`;

      let statusBadge = "";
      if (r.status === "approved") {
        statusBadge = `<span class="badge badge-green">✓ Approved</span>`;
      } else if (r.status === "rejected") {
        statusBadge = `<span class="badge badge-red">✕ Rejected</span>`;
      } else {
        statusBadge = `<span class="badge badge-yellow">⏳ Pending</span>`;
      }

      let actions = "—";
      if (r.status === "pending") {
        actions = `
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-success btn-sm" onclick="approveRequest(${r.id}, '${r.medicine_name}', ${r.quantity})">
              Approve
            </button>
            <button class="btn btn-outline btn-sm text-danger" onclick="rejectRequest(${r.id})">
              Reject
            </button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td>${urgencyBadge}</td>
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
      tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-muted">You haven't submitted any transfer requests to donor hospitals yet.</td></tr>`;
      return;
    }

    json.data.forEach(r => {
      const tr = document.createElement("tr");

      const urgencyBadge = r.urgency === "EMERGENCY" 
        ? `<span class="badge badge-emergency">EMERGENCY</span>` 
        : `<span class="badge badge-yellow">NORMAL</span>`;

      let statusBadge = "";
      if (r.status === "approved") {
        statusBadge = `<span class="badge badge-green">✓ Stock Transferred</span>`;
      } else if (r.status === "rejected") {
        statusBadge = `<span class="badge badge-red">✕ Request Rejected</span>`;
      } else {
        statusBadge = `<span class="badge badge-yellow">⏳ Awaiting Donor Action</span>`;
      }

      tr.innerHTML = `
        <td>${urgencyBadge}</td>
        <td><strong>${r.medicine_name}</strong> (${r.medicine_unit})</td>
        <td><strong>🏥 ${r.donor_name}</strong></td>
        <td><span class="badge badge-outline font-weight-bold" style="font-size:0.85rem;">${r.quantity}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:var(--slate-500);">${r.created_at}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading outgoing requests:", err);
  }
}

async function approveRequest(requestId, medName, qty) {
  if (!confirm(`Are you sure you want to approve this transfer of ${qty} units of ${medName} from your surplus inventory?`)) return;

  try {
    const res = await fetch(`/api/requests/${requestId}/approve`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      showToast("Transfer approved! Stock transferred and alerts updated.", "success");
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
