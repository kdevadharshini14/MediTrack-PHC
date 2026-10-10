/**
 * MediTrack PHC - Single Hospital Dashboard Controller
 * Scoped to authenticated hospital: metrics, surplus finder across other hospitals, incoming actions
 */

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
  setupSurplusFinder();
});

async function loadDashboardData() {
  try {
    await Promise.all([
      loadMetricCounts(),
      loadCriticalAlertBanner(),
      loadEpidemicRadar(),
      loadRescueSwapRadar(),
      loadIncomingRequests(),
      loadMyStockSnapshot()
    ]);
  } catch (err) {
    console.error("Dashboard data load error:", err);
  }
}

async function loadMetricCounts() {
  try {
    const [medRes, alertRes, inReqRes, outReqRes] = await Promise.all([
      fetch("/api/medicines"),
      fetch("/api/alerts/count"),
      fetch("/api/requests?type=incoming&status=pending"),
      fetch("/api/requests?type=outgoing&status=pending")
    ]);

    const meds = await medRes.json();
    const alerts = await alertRes.json();
    const inReqs = await inReqRes.json();
    const outReqs = await outReqRes.json();

    document.getElementById("countMedicines").textContent = meds.data ? meds.data.length : 0;
    document.getElementById("countCritical").textContent = alerts.data ? alerts.data.critical : 0;
    document.getElementById("countWarning").textContent = alerts.data ? alerts.data.warning : 0;
    document.getElementById("countIncomingReqs").textContent = inReqs.data ? inReqs.data.length : 0;
    document.getElementById("countOutgoingReqs").textContent = outReqs.data ? outReqs.data.length : 0;
  } catch (err) {
    console.error("Error loading metrics:", err);
  }
}

async function loadCriticalAlertBanner() {
  try {
    const res = await fetch("/api/alerts?status=active");
    const json = await res.json();
    const bannerContainer = document.getElementById("criticalAlertBanner");

    if (!json.success || !json.data || json.data.length === 0) {
      bannerContainer.style.display = "none";
      return;
    }

    const criticals = json.data.filter(a => a.level === "CRITICAL");
    if (criticals.length > 0) {
      const topAlert = criticals[0];
      bannerContainer.style.display = "flex";
      document.getElementById("criticalBannerMessage").textContent = 
        `${topAlert.medicine_name}: ${topAlert.message}`;
    } else {
      bannerContainer.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading alert banner:", err);
  }
}

async function loadEpidemicRadar() {
  try {
    const res = await fetch("/api/epidemic_radar");
    const json = await res.json();
    const card = document.getElementById("epidemicRadarCard");
    if (!card) return;

    if (json.success && json.data && json.data.length > 0) {
      const topCluster = json.data[0];
      document.getElementById("radarDiseaseTitle").textContent = topCluster.disease_name;
      document.getElementById("radarSeverityBadge").textContent = topCluster.severity_label;
      document.getElementById("radarDescription").textContent = 
        `Simultaneous rapid consumption surge detected for ${topCluster.medicine_name} across ${topCluster.affected_count} health centres in Namakkal Block.`;
      document.getElementById("radarAdvisory").textContent = topCluster.advisory;
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading epidemic radar:", err);
  }
}

async function loadRescueSwapRadar() {
  try {
    const res = await fetch("/api/expiry_rescue");
    const json = await res.json();
    const card = document.getElementById("rescueSwapCard");
    if (!card) return;

    if (json.success && json.data && json.data.length > 0) {
      const cand = json.data[0];
      document.getElementById("rescueSwapTitle").textContent = 
        `Impending Expiry Wastage: ${cand.medicine_name} (${cand.batch_no})`;
      document.getElementById("rescueSwapDescription").textContent = 
        `Local burn at ${cand.source_phc_name} is only ${cand.source_daily_burn}/day. ${cand.wastage_risk_qty} units will expire unused in ${cand.days_to_expiry} days! Automated transfer to ${cand.target_phc.target_phc_name} (${cand.target_phc.target_daily_burn}/day burn rate) will prevent total loss.`;

      document.getElementById("rescueSwapMetrics").innerHTML = `
        <span>📅 <strong>Expires:</strong> ${cand.expiry_date} (${cand.days_to_expiry} days left)</span>
        <span>⚠️ <strong>At-Risk Wastage:</strong> ${cand.rescue_qty} ${cand.medicine_unit}</span>
        <span>🏥 <strong>Target:</strong> ${cand.target_phc.target_phc_name} (${cand.target_phc.distance_km} km)</span>
        <span style="color:#15803d;">💰 <strong>Prevented Loss:</strong> ₹${cand.loss_prevented_rs}</span>
      `;

      document.getElementById("rescueSwapActionContainer").innerHTML = `
        <button class="btn btn-warning btn-sm" style="background:#d97706; color:white; font-weight:700;" onclick="executeRescueSwap(${cand.source_phc_id}, ${cand.target_phc.target_phc_id}, ${cand.medicine_id}, ${cand.rescue_qty})">
          ⚡ Execute Smart Rescue Swap
        </button>
        <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${cand.medicine_id}, ${cand.source_phc_id}, '${cand.batch_no}')">
          📜 View Batch Passport
        </button>
      `;

      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading rescue swap radar:", err);
  }
}

async function executeRescueSwap(srcId, tgtId, medId, qty) {
  try {
    const res = await fetch("/api/expiry_rescue/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_phc_id: srcId,
        target_phc_id: tgtId,
        medicine_id: medId,
        quantity: qty
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message || "Smart Expiry Rescue Swap executed!", "success");
      loadDashboardData();
    } else {
      showToast(json.error || "Failed to execute rescue swap", "error");
    }
  } catch (err) {
    showToast("Network error executing swap", "error");
  }
}

async function triggerAutoRebalance(medId, medName) {
  try {
    const res = await fetch("/api/auto_rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicine_id: medId })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, "success");
      loadDashboardData();
      refreshAlertCount();
    } else {
      showToast(json.error || "Auto-rebalance failed", "error");
    }
  } catch (err) {
    showToast("Network error executing auto-rebalance", "error");
  }
}

async function setupSurplusFinder() {
  // Load medicines into search dropdown
  try {
    const res = await fetch("/api/medicines");
    const json = await res.json();
    if (!json.success) return;

    const select = document.getElementById("surplusSearchSelect");
    json.data.forEach(m => {
      select.innerHTML += `<option value="${m.id}">${m.name} (${m.unit}) - ${m.category}</option>`;
    });

    document.getElementById("btnSearchSurplus").addEventListener("click", performSurplusSearch);
  } catch (err) {
    console.error("Error setting up surplus finder:", err);
  }
}

async function performSurplusSearch() {
  const medId = document.getElementById("surplusSearchSelect").value;
  if (!medId) {
    showToast("Please choose a medicine to search across hospitals", "warning");
    return;
  }

  const resultsBox = document.getElementById("surplusResultsContainer");
  const listContainer = document.getElementById("surplusDonorsList");
  resultsBox.style.display = "block";
  listContainer.innerHTML = `<div class="p-3 text-center text-muted">Scanning neighbouring PHCs within 25 km...</div>`;

  try {
    const res = await fetch(`/api/search_surplus?medicine_id=${medId}`);
    const json = await res.json();
    if (!json.success) return;

    const donors = json.data || [];
    const medText = document.getElementById("surplusSearchSelect").options[document.getElementById("surplusSearchSelect").selectedIndex].text;

    document.getElementById("surplusResultHeader").textContent = 
      `Nearby Surplus Donors for ${medText}:`;

    listContainer.innerHTML = "";

    if (donors.length === 0) {
      listContainer.innerHTML = `
        <div class="card p-3 text-muted" style="background:#fff7ed; border-color:#fed7aa;">
          ⚠️ <strong>No neighbouring PHC currently has extra surplus stock</strong> for this medicine.
          <div style="font-size:0.8rem; margin-top:4px;">
            Neighbouring centres either hold only safe buffer or are also in demand. Please use the <strong>District Indent</strong> feature to request from the central drug warehouse.
          </div>
        </div>
      `;
      return;
    }

    donors.forEach(d => {
      const row = document.createElement("div");
      row.className = "rebalance-pair-row";

      row.innerHTML = `
        <div>
          <strong style="color:var(--slate-900); font-size:0.95rem;">🏥 ${d.phc_name}</strong>
          <div style="font-size:0.8rem; color:var(--slate-500); margin-top:2px;">
            ${d.phc_location}
          </div>
        </div>
        <div>
          <span style="font-size:0.85rem; color:var(--success-dark); font-weight:700;">
            ✓ Distance: ${d.distance_km} km away
          </span>
          <div style="font-size:0.75rem; color:var(--slate-500); margin-top:2px;">
            Current Stock: ${d.quantity} (Safety buffer: ${d.safe_floor})
          </div>
        </div>
        <div>
          <span class="badge badge-green" style="font-size:0.85rem;">Extra: +${d.can_give} units</span>
        </div>
        <div>
          <span class="badge badge-emergency">EMERGENCY</span>
        </div>
        <div>
          <button class="btn btn-primary btn-sm w-100" onclick="requestFromSearchedDonor(${d.phc_id}, ${medId}, ${d.can_give}, 'EMERGENCY')">
            Request Stock
          </button>
        </div>
      `;
      listContainer.appendChild(row);
    });
  } catch (err) {
    console.error("Error searching surplus:", err);
  }
}

async function requestFromSearchedDonor(donorPhcId, medId, qty, urgency) {
  try {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_phc_id: donorPhcId,
        medicine_id: medId,
        quantity: qty,
        urgency: urgency
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast("Transfer request sent to donor hospital! Priority: EMERGENCY", "success");
      loadDashboardData();
      refreshAlertCount();
    } else {
      showToast(json.error || "Failed to create request", "error");
    }
  } catch (err) {
    showToast("Network error creating request", "error");
  }
}

async function loadIncomingRequests() {
  try {
    const res = await fetch("/api/requests?type=incoming&status=pending");
    const json = await res.json();
    const section = document.getElementById("incomingRequestsSection");
    const tbody = document.getElementById("incomingRequestsTableBody");

    if (!json.success || !json.data || json.data.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    tbody.innerHTML = "";

    json.data.forEach(r => {
      const tr = document.createElement("tr");

      const urgencyBadge = r.urgency === "EMERGENCY" 
        ? `<span class="badge badge-emergency">EMERGENCY</span>` 
        : `<span class="badge badge-yellow">NORMAL</span>`;

      tr.innerHTML = `
        <td>${urgencyBadge}</td>
        <td><strong>${r.medicine_name}</strong> (${r.medicine_unit})</td>
        <td><strong>🏥 ${r.requester_name}</strong></td>
        <td><span class="badge badge-outline font-weight-bold">${r.quantity}</span></td>
        <td style="font-size:0.8rem; color:var(--slate-500);">${r.created_at}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-success btn-sm" onclick="approveIncomingRequest(${r.id}, '${r.medicine_name}', ${r.quantity})">
              Approve
            </button>
            <button class="btn btn-outline btn-sm text-danger" onclick="rejectIncomingRequest(${r.id})">
              Reject
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading incoming requests:", err);
  }
}

async function approveIncomingRequest(reqId, medName, qty) {
  if (!confirm(`Are you sure you want to approve transfer of ${qty} units of ${medName} from your surplus inventory?`)) return;

  try {
    const res = await fetch(`/api/requests/${reqId}/approve`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      showToast("Transfer approved and stock moved!", "success");
      loadDashboardData();
      refreshAlertCount();
    } else {
      showToast(json.error || "Approval failed", "error");
    }
  } catch (err) {
    showToast("Error processing approval", "error");
  }
}

async function rejectIncomingRequest(reqId) {
  if (!confirm("Are you sure you want to reject this request?")) return;

  try {
    const res = await fetch(`/api/requests/${reqId}/reject`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      showToast("Request marked as rejected", "warning");
      loadDashboardData();
    } else {
      showToast(json.error || "Rejection failed", "error");
    }
  } catch (err) {
    showToast("Error rejecting request", "error");
  }
}

async function loadMyStockSnapshot() {
  try {
    const res = await fetch("/api/stock");
    const json = await res.json();
    const tbody = document.getElementById("myStockSnapshotBody");
    tbody.innerHTML = "";

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-muted">No stock records found for this centre.</td></tr>`;
      return;
    }

    json.data.forEach(s => {
      const tr = document.createElement("tr");

      // Health badge
      let qtyBadge = "";
      if (s.qty_status === "GREEN") {
        qtyBadge = `<span class="badge badge-green">${s.quantity} ${s.medicine_unit}</span>`;
      } else if (s.qty_status === "YELLOW") {
        qtyBadge = `<span class="badge badge-yellow">${s.quantity} ${s.medicine_unit}</span>`;
      } else {
        qtyBadge = `<span class="badge badge-red">${s.quantity} ${s.medicine_unit}</span>`;
      }

      // Days badge
      let daysBadge = "";
      if (s.days_left_status === "RED") {
        daysBadge = `<span class="badge badge-red font-weight-bold">${s.days_left_display} days</span>`;
      } else if (s.days_left_status === "YELLOW") {
        daysBadge = `<span class="badge badge-yellow font-weight-bold">${s.days_left_display} days</span>`;
      } else {
        const displayLabel = (s.days_left >= 999 || s.days_left_display === "∞") ? "∞ (Adequate)" : `${s.days_left_display} days`;
        daysBadge = `<span class="badge badge-green font-weight-bold">${displayLabel}</span>`;
      }

      let trendClass = s.trend === "UP" ? "trend-up" : s.trend === "DOWN" ? "trend-down" : "trend-stable";

      const isCriticalDeficit = (s.days_left_status === "RED" || s.qty_status === "RED");
      const autoRebalanceBtn = isCriticalDeficit
        ? `<button class="btn btn-danger btn-sm" style="margin-right:4px;" onclick="triggerAutoRebalance(${s.medicine_id}, '${s.medicine_name}')" title="Autonomous Lateral Rebalance (0s delay)">⚡ Auto-Rebalance</button>`
        : "";

      tr.innerHTML = `
        <td><strong>${s.medicine_name}</strong> <div style="font-size:0.75rem; color:var(--slate-500);">${s.medicine_unit}</div></td>
        <td><span class="badge badge-outline">${s.medicine_category}</span></td>
        <td>${qtyBadge}</td>
        <td>${s.min_level}</td>
        <td>${s.avg_daily_usage} / day</td>
        <td>${daysBadge}</td>
        <td><span class="trend-badge ${trendClass}">${s.trend_symbol} ${s.trend_label}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
            ${autoRebalanceBtn}
            <button class="btn btn-outline btn-sm" onclick="viewDigitalBatchPassport(${s.medicine_id}, ${s.phc_id}, '${s.batch_no}')">
              📜 Passport
            </button>
            <a href="/stock" class="btn btn-secondary btn-sm">Inspect</a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading stock snapshot:", err);
  }
}
