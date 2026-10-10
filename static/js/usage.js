/**
 * MediTrack PHC - Single Hospital Daily Usage Controller
 * Preloaded with authenticated hospital inventory, instant overdraft checks
 */

let phcStockCache = {};

document.addEventListener("DOMContentLoaded", () => {
  setupUsagePage();
});

async function setupUsagePage() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("usageDate").value = today;

  await loadMyInventory();
  updateUsageOfflineBanner();

  document.getElementById("addRowBtn").addEventListener("click", () => addUsageRow());
  document.getElementById("usageForm").addEventListener("submit", handleUsageSubmit);
}

async function loadMyInventory() {
  try {
    const res = await fetch("/api/stock");
    const json = await res.json();
    if (json.success) {
      phcStockCache = {};
      json.data.forEach(s => {
        phcStockCache[s.medicine_id] = s;
      });
      localStorage.setItem("meditrack_cached_stock", JSON.stringify(phcStockCache));

      const container = document.getElementById("usageItemsContainer");
      container.innerHTML = "";
      addUsageRow(); // Add initial fresh row
      return;
    }
  } catch (err) {
    console.warn("Network error loading inventory; falling back to offline cache:", err);
  }

  // Fallback to offline cached stock
  const cached = localStorage.getItem("meditrack_cached_stock");
  if (cached) {
    try {
      phcStockCache = JSON.parse(cached);
      const container = document.getElementById("usageItemsContainer");
      container.innerHTML = "";
      addUsageRow();
      showToast("Loaded stock from offline cache", "info");
    } catch (e) {
      console.error(e);
    }
  }
}

function addUsageRow() {
  const container = document.getElementById("usageItemsContainer");
  const rowIndex = container.children.length;

  const row = document.createElement("div");
  row.className = "card p-3 mb-3 usage-row";
  row.id = `usageRow_${rowIndex}`;

  let medOptions = `<option value="" disabled selected>Choose medicine to dispense...</option>`;
  Object.values(phcStockCache).forEach(s => {
    medOptions += `<option value="${s.medicine_id}" data-qty="${s.quantity}" data-unit="${s.medicine_unit}">${s.medicine_name} (${s.medicine_unit}) - Stock: ${s.quantity}</option>`;
  });

  row.innerHTML = `
    <div style="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: end;">
      <div class="form-group mb-0">
        <label class="form-label">Medicine</label>
        <select class="form-select med-select" onchange="onMedicineSelected(${rowIndex})">
          ${medOptions}
        </select>
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Available Stock</label>
        <div class="form-control bg-light stock-indicator" id="stockIndicator_${rowIndex}" style="background:#f8fafc; font-weight:700;">
          —
        </div>
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Quantity Dispensed</label>
        <input type="number" class="form-control qty-input" id="qtyInput_${rowIndex}" min="1" placeholder="Enter qty" oninput="validateRow(${rowIndex})">
      </div>
      <div>
        <button type="button" class="btn btn-outline btn-sm text-danger" onclick="removeRow(${rowIndex})" title="Remove row">
          ✕
        </button>
      </div>
    </div>
    <div class="text-danger small mt-1 error-msg" id="errorMsg_${rowIndex}" style="display:none;"></div>
  `;

  container.appendChild(row);
}

function removeRow(index) {
  const row = document.getElementById(`usageRow_${index}`);
  if (row) row.remove();
}

function onMedicineSelected(index) {
  const row = document.getElementById(`usageRow_${index}`);
  const select = row.querySelector(".med-select");
  const indicator = document.getElementById(`stockIndicator_${index}`);
  const medId = select.value;

  const stock = phcStockCache[medId];
  if (stock) {
    indicator.textContent = `${stock.quantity} ${stock.medicine_unit}`;
    if (stock.quantity <= 0) {
      indicator.style.color = "var(--danger)";
    } else {
      indicator.style.color = "var(--primary-dark)";
    }
  } else {
    indicator.textContent = "0";
  }

  validateRow(index);
}

function validateRow(index) {
  const row = document.getElementById(`usageRow_${index}`);
  if (!row) return true;

  const select = row.querySelector(".med-select");
  const qtyInput = document.getElementById(`qtyInput_${index}`);
  const errorMsg = document.getElementById(`errorMsg_${index}`);

  const medId = select.value;
  const enteredQty = parseInt(qtyInput.value) || 0;
  const stock = phcStockCache[medId];

  if (!stock) {
    errorMsg.style.display = "none";
    return false;
  }

  if (enteredQty > stock.quantity) {
    errorMsg.textContent = `Insufficient stock: requested ${enteredQty}, but only ${stock.quantity} available!`;
    errorMsg.style.display = "block";
    qtyInput.style.borderColor = "var(--danger)";
    return false;
  } else if (enteredQty <= 0 && qtyInput.value !== "") {
    errorMsg.textContent = `Quantity must be greater than 0.`;
    errorMsg.style.display = "block";
    qtyInput.style.borderColor = "var(--danger)";
    return false;
  } else {
    errorMsg.style.display = "none";
    qtyInput.style.borderColor = "var(--slate-300)";
    return true;
  }
}

async function handleUsageSubmit(e) {
  e.preventDefault();
  const usageDate = document.getElementById("usageDate").value;

  const rows = document.querySelectorAll(".usage-row");
  if (rows.length === 0) {
    showToast("Please add at least one medicine item", "error");
    return;
  }

  const items = [];
  let hasErrors = false;

  rows.forEach(r => {
    const medSelect = r.querySelector(".med-select");
    const qtyInput = r.querySelector(".qty-input");

    const medId = medSelect.value;
    const qty = parseInt(qtyInput.value);

    if (!medId || isNaN(qty) || qty <= 0) {
      hasErrors = true;
      return;
    }

    const stock = phcStockCache[medId];
    if (stock && qty > stock.quantity) {
      hasErrors = true;
      showToast(`Cannot dispense ${qty} units of ${stock.medicine_name} (only ${stock.quantity} available)`, "error");
      return;
    }

    items.push({ medicine_id: parseInt(medId), quantity: qty });
  });

  if (hasErrors || items.length === 0) {
    if (!hasErrors) showToast("Please check all quantities and medicine selections", "error");
    return;
  }

  // If browser is actively offline, store directly into local outbox
  if (!navigator.onLine) {
    saveToOfflineOutboxLocally(usageDate, items);
    return;
  }

  try {
    const res = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: usageDate,
        items: items
      })
    });

    const json = await res.json();
    if (json.success) {
      showToast("Daily dispensing saved & stock deducted successfully!", "success");
      await loadMyInventory();
      refreshAlertCount();
      updateUsageOfflineBanner();
    } else {
      showToast(json.error || "Failed to record usage", "error");
    }
  } catch (err) {
    console.warn("Network error during submission; queuing into offline outbox:", err);
    saveToOfflineOutboxLocally(usageDate, items);
  }
}

function saveToOfflineOutboxLocally(usageDate, items) {
  // Store session in offline queue
  addOfflineOutboxEntry({
    date: usageDate,
    items: items
  });

  // Locally deduct from cached inventory so pharmacist sees immediate update
  items.forEach(item => {
    if (phcStockCache[item.medicine_id]) {
      phcStockCache[item.medicine_id].quantity = Math.max(0, phcStockCache[item.medicine_id].quantity - item.quantity);
    }
  });
  localStorage.setItem("meditrack_cached_stock", JSON.stringify(phcStockCache));

  // Reset form to fresh row
  const container = document.getElementById("usageItemsContainer");
  container.innerHTML = "";
  addUsageRow();

  updateUsageOfflineBanner();
  showToast("⚡ Network Offline: Dispensing saved safely in Local Outbox! Will sync automatically when network returns.", "warning");
}

function updateUsageOfflineBanner() {
  const card = document.getElementById("offlineOutboxCard");
  if (!card) return;

  const outbox = getOfflineOutbox();
  const isOnline = navigator.onLine;

  if (outbox.length > 0 || !isOnline) {
    card.style.display = "block";
    const title = document.getElementById("offlineStatusTitle");
    const desc = document.getElementById("offlineStatusDesc");

    if (!isOnline) {
      title.textContent = `Offline Mode Active • Outbox: ${outbox.length} Batches Pending Sync`;
      desc.textContent = "Unreliable health centre connectivity detected. Entries are stored securely on this computer and will sync automatically once network returns.";
    } else {
      title.textContent = `Online • ${outbox.length} Offline Dispensing Batches Pending Sync`;
      desc.textContent = "Network restored. Click 'Sync Now' below or system will auto-sync in the background.";
    }
  } else {
    card.style.display = "none";
  }
}

async function manualSyncOfflineOutbox() {
  await syncOfflineOutbox();
  updateUsageOfflineBanner();
}
