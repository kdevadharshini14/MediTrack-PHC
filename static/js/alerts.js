/**
 * MediTrack PHC - Single Hospital Alerts Controller
 * Displays alerts for authenticated centre with lateral surplus donor suggestions
 */

let currentAlertStatus = "active";

document.addEventListener("DOMContentLoaded", () => {
  setupAlertsPage();
});

async function setupAlertsPage() {
  loadAlertsList();

  document.getElementById("btnActiveAlerts").addEventListener("click", () => {
    setAlertStatus("active");
  });

  document.getElementById("btnResolvedAlerts").addEventListener("click", () => {
    setAlertStatus("resolved");
  });
}

function setAlertStatus(status) {
  currentAlertStatus = status;
  if (status === "active") {
    document.getElementById("btnActiveAlerts").className = "btn btn-primary btn-sm";
    document.getElementById("btnResolvedAlerts").className = "btn btn-outline btn-sm";
  } else {
    document.getElementById("btnActiveAlerts").className = "btn btn-outline btn-sm";
    document.getElementById("btnResolvedAlerts").className = "btn btn-primary btn-sm";
  }
  loadAlertsList();
}

async function loadAlertsList() {
  const url = `/api/alerts?status=${currentAlertStatus}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) return;

    renderAlerts(json.data || []);
  } catch (err) {
    console.error("Error loading alerts:", err);
  }
}

function renderAlerts(alerts) {
  const container = document.getElementById("alertsListContainer");
  container.innerHTML = "";

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="card p-5 text-center text-muted">
        <h3>✓ No ${currentAlertStatus} alerts</h3>
        <p>All stock levels and dispensing velocities at your centre are within safe parameters.</p>
      </div>
    `;
    return;
  }

  alerts.forEach(a => {
    const card = document.createElement("div");
    card.className = `alert-card ${a.level.toLowerCase()}`;

    const levelBadge = a.level === "CRITICAL"
      ? `<span class="badge badge-emergency">${a.level}</span>`
      : `<span class="badge badge-yellow">${a.level}</span>`;

    const reasonBadge = a.reason === "FAST_BURN"
      ? `<span class="badge badge-red">🔥 FAST BURN RATE</span>`
      : `<span class="badge badge-outline">⚠️ LOW STOCK QUANTITY</span>`;

    let trendClass = a.trend === "UP" ? "trend-up" : a.trend === "DOWN" ? "trend-down" : "trend-stable";

    let donorSection = "";
    if (a.status === "active") {
      if (a.top_donor) {
        const d = a.top_donor;
        const urgency = a.level === "CRITICAL" ? "EMERGENCY" : "NORMAL";
        const urgencyLabel = a.level === "CRITICAL" ? "Request Transfer (EMERGENCY)" : "Request Transfer";

        donorSection = `
          <div class="donor-suggestion-box">
            <div class="donor-details">
              <strong>Suggested Donor: 🏥 ${d.phc_name}</strong>
              <div style="font-size:0.8rem; margin-top:2px;">
                Distance: <strong>${d.distance_km} km away</strong> • Current Stock: ${d.quantity} • Can supply: <strong>${d.can_give} ${a.medicine_unit}</strong>
              </div>
            </div>
            <div>
              <button class="btn btn-primary btn-sm" onclick="requestFromDonor(${d.phc_id}, ${a.medicine_id}, ${d.can_give}, '${urgency}')">
                ${urgencyLabel}
              </button>
            </div>
          </div>
        `;
      } else {
        donorSection = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:0.75rem 1rem; font-size:0.85rem; color:var(--slate-500);">
            ℹ️ No neighbouring PHC currently has surplus for this medicine. It must be fulfilled via district indent.
          </div>
        `;
      }
    }

    card.innerHTML = `
      <div class="alert-header">
        <div>
          <div class="alert-title-row">
            ${levelBadge}
            ${reasonBadge}
            <h4 class="alert-title">${a.medicine_name}</h4>
          </div>
          <div class="alert-meta" style="margin-top:0.35rem;">
            ${a.message} • Triggered: ${a.created_at}
          </div>
        </div>
        <div>
          <span class="badge badge-outline">${a.medicine_category}</span>
        </div>
      </div>

      <div class="alert-body-stats">
        <span><strong>Current Stock:</strong> ${a.current_quantity || 0} ${a.medicine_unit}</span>
        <span><strong>Min Safe Level:</strong> ${a.min_level}</span>
        <span><strong>Days Left:</strong> <strong style="color:${a.days_left < 3 ? 'var(--danger)' : 'var(--warning-dark)'};">${a.days_left_display} days</strong></span>
        <span><strong>Velocity:</strong> <span class="trend-badge ${trendClass}">${a.trend_symbol} ${a.trend_label} (${a.trend_pct})</span></span>
      </div>

      ${donorSection}
    `;

    container.appendChild(card);
  });
}

async function requestFromDonor(toPhcId, medId, qty, urgency) {
  try {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_phc_id: toPhcId,
        medicine_id: medId,
        quantity: qty,
        urgency: urgency
      })
    });

    const json = await res.json();
    if (json.success) {
      showToast(`Transfer request sent to donor! Priority: ${urgency}`, "success");
      loadAlertsList();
      refreshAlertCount();
    } else {
      showToast(json.error || "Failed to create request", "error");
    }
  } catch (err) {
    showToast("Network error creating request", "error");
  }
}
