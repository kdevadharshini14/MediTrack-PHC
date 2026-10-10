/**
 * MediTrack PHC - Single Hospital Stock Controller
 * Displays only current hospital's inventory, handles update, additions, and new medicine creation
 */

let myStocks = [];

document.addEventListener("DOMContentLoaded", () => {
  setupStockPage();
});

async function setupStockPage() {
  await loadMedicineDropdown();
  loadStockList();

  document.getElementById("stockSearch").addEventListener("input", filterStockTable);
  document.getElementById("updateStockForm").addEventListener("submit", handleStockUpdate);
  document.getElementById("addStockForm").addEventListener("submit", handleAddStock);
  
  const createForm = document.getElementById("createMedicineForm");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateNewMedicine);
  }
}

async function loadMedicineDropdown() {
  try {
    const res = await fetch("/api/medicines");
    const json = await res.json();
    if (!json.success) return;

    const modalMedSelect = document.getElementById("addModalMedicine");
    modalMedSelect.innerHTML = `<option value="" disabled selected>Select Medicine from catalog...</option>`;

    json.data.forEach(m => {
      modalMedSelect.innerHTML += `<option value="${m.id}">${m.name} (${m.unit}) - ${m.category}</option>`;
    });
  } catch (err) {
    console.error("Error loading medicines:", err);
  }
}

async function loadStockList() {
  try {
    const res = await fetch("/api/stock");
    const json = await res.json();
    if (json.success) {
      myStocks = json.data;
      renderStockTable(myStocks);
    }
  } catch (err) {
    console.error("Error loading stock:", err);
    showToast("Failed to load inventory data", "error");
  }
}

function filterStockTable() {
  const query = document.getElementById("stockSearch").value.toLowerCase().trim();
  if (!query) {
    renderStockTable(myStocks);
    return;
  }

  const filtered = myStocks.filter(s => 
    s.medicine_name.toLowerCase().includes(query) ||
    s.medicine_category.toLowerCase().includes(query)
  );
  renderStockTable(filtered);
}

function renderStockTable(stocks) {
  const tbody = document.getElementById("stockTableBody");
  tbody.innerHTML = "";

  if (stocks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center p-4 text-muted">No stock records found for your hospital.</td></tr>`;
    return;
  }

  stocks.forEach(s => {
    const tr = document.createElement("tr");

    // Quantity health badge
    let qtyBadge = "";
    if (s.qty_status === "GREEN") {
      qtyBadge = `<span class="badge badge-green">${s.quantity} ${s.medicine_unit}</span>`;
    } else if (s.qty_status === "YELLOW") {
      qtyBadge = `<span class="badge badge-yellow">${s.quantity} ${s.medicine_unit}</span>`;
    } else {
      qtyBadge = `<span class="badge badge-red">${s.quantity} ${s.medicine_unit}</span>`;
    }

    // Days left badge
    let daysBadge = "";
    if (s.days_left_status === "RED") {
      daysBadge = `<span class="badge badge-red font-weight-bold">${s.days_left_display} days</span>`;
    } else if (s.days_left_status === "YELLOW") {
      daysBadge = `<span class="badge badge-yellow font-weight-bold">${s.days_left_display} days</span>`;
    } else {
      const displayLabel = (s.days_left >= 999 || s.days_left_display === "∞") ? "∞ (Adequate)" : `${s.days_left_display} days`;
      daysBadge = `<span class="badge badge-green font-weight-bold">${displayLabel}</span>`;
    }

    // Trend
    let trendClass = s.trend === "UP" ? "trend-up" : s.trend === "DOWN" ? "trend-down" : "trend-stable";
    const trendHtml = `<span class="trend-badge ${trendClass}">
      ${s.trend_symbol} ${s.trend_label} (${s.trend_pct})
    </span>`;

    // Expiry
    let expiryHtml = s.expiry_date || "—";
    if (s.is_near_expiry) {
      let suggestionText = "";
      if (s.suggested_expiry_phc) {
        suggestionText = `<br><small style="color:var(--orange);">Suggest transfer to <strong>${s.suggested_expiry_phc.phc_name}</strong> (burns ${s.suggested_expiry_phc.daily_burn}/d)</small>`;
      }
      expiryHtml = `
        <span class="badge badge-orange">Expires in ${s.days_to_expiry}d</span>
        <div style="font-size:0.75rem; color:var(--slate-500);">${s.expiry_date}</div>
        ${suggestionText}
      `;
    }

    tr.innerHTML = `
      <td>
        <strong>${s.medicine_name}</strong>
        <div style="font-size:0.75rem; color:var(--slate-500);">${s.medicine_unit}</div>
      </td>
      <td><span class="badge badge-outline">${s.medicine_category}</span></td>
      <td>${qtyBadge}</td>
      <td>${s.min_level}</td>
      <td>${s.avg_daily_usage} / day</td>
      <td>${daysBadge}</td>
      <td>${trendHtml}</td>
      <td>${expiryHtml}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openUpdateModal(${s.stock_id})">
          Edit
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openUpdateModal(stockId) {
  const stock = myStocks.find(x => x.stock_id === stockId);
  if (!stock) return;
  document.getElementById("updateStockId").value = stock.stock_id;
  document.getElementById("updateMedId").value = stock.medicine_id;
  document.getElementById("updateTitle").textContent = `Update Stock: ${stock.medicine_name}`;
  document.getElementById("updateQuantity").value = stock.quantity;
  document.getElementById("updateMinLevel").value = stock.min_level;
  document.getElementById("updateExpiry").value = stock.expiry_date || "";

  openModal("updateStockModal");
}

async function handleStockUpdate(e) {
  e.preventDefault();
  const medId = document.getElementById("updateMedId").value;
  const qty = document.getElementById("updateQuantity").value;
  const minLvl = document.getElementById("updateMinLevel").value;
  const expiry = document.getElementById("updateExpiry").value;

  try {
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicine_id: medId,
        quantity: qty,
        min_level: minLvl,
        expiry_date: expiry || null
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast("Stock updated & health indicators re-evaluated!", "success");
      closeModal("updateStockModal");
      loadStockList();
      refreshAlertCount();
    } else {
      showToast(json.error || "Update failed", "error");
    }
  } catch (err) {
    showToast("Error updating stock", "error");
  }
}

async function handleAddStock(e) {
  e.preventDefault();
  const medId = document.getElementById("addModalMedicine").value;
  const qty = document.getElementById("addQuantity").value;
  const minLvl = document.getElementById("addMinLevel").value;
  const expiry = document.getElementById("addExpiry").value;

  try {
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicine_id: medId,
        quantity: qty,
        min_level: minLvl,
        expiry_date: expiry || null
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast("Medicine added to your inventory!", "success");
      closeModal("addStockModal");
      document.getElementById("addStockForm").reset();
      loadStockList();
      refreshAlertCount();
    } else {
      showToast(json.error || "Failed to add stock", "error");
    }
  } catch (err) {
    showToast("Error adding stock", "error");
  }
}

async function handleCreateNewMedicine(e) {
  e.preventDefault();
  const name = document.getElementById("newMedName").value.trim();
  const unit = document.getElementById("newMedUnit").value.trim();
  const category = document.getElementById("newMedCategory").value.trim();
  const qty = document.getElementById("newMedQuantity").value;
  const minLvl = document.getElementById("newMedMinLevel").value;
  const expiry = document.getElementById("newMedExpiry").value;

  try {
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_new_medicine: true,
        new_name: name,
        new_unit: unit,
        new_category: category,
        quantity: qty,
        min_level: minLvl,
        expiry_date: expiry || null
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Medicine "${name}" created and added to inventory!`, "success");
      closeModal("createMedicineModal");
      document.getElementById("createMedicineForm").reset();
      await loadMedicineDropdown();
      loadStockList();
      refreshAlertCount();
    } else {
      showToast(json.error || "Failed to create new medicine", "error");
    }
  } catch (err) {
    showToast("Error registering new medicine", "error");
  }
}
