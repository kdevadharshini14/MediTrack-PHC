/**
 * MediTrack PHC - Common Utilities, Language Toggle (English/Tamil), Toasts & Alert Poller
 */

const translations = {
  en: {
    // Brand & Nav
    brand_title: "MediTrack PHC",
    brand_sub: "Medicine Stock & Lateral Redistribution System",
    nav_dashboard: "Dashboard",
    nav_stock: "Stock Inventory",
    nav_usage: "Daily Usage Entry",
    nav_requests: "Peer Transfers",
    nav_alerts: "Shortage Alerts",
    nav_analytics: "Analytics & Forecast",
    nav_activity: "Activity Log",

    // Dashboard Cards
    metric_phcs: "Total PHCs",
    metric_medicines: "Tracked Medicines",
    metric_critical: "Critical Shortages",
    metric_warning: "Warning Level",
    metric_pending_reqs: "Pending Transfers",
    block_rebalance_title: "Block Lateral Redistribution Overview",
    heatmap_title: "PHC Stock Health Heatmap (Days of Supply Remaining)",

    // Status Badges & Trends
    status_safe: "Adequate (>=2x Min)",
    status_warning: "Buffer Warning (<2x Min)",
    status_critical: "Critical Shortage (<Min)",
    trend_up: "Burning Faster",
    trend_down: "Slowing Down",
    trend_stable: "Stable",
    days_left: "days left",

    // Actions
    btn_request: "Request Transfer",
    btn_approve: "Approve",
    btn_reject: "Reject",
    btn_save: "Save Entry",
    btn_update: "Update Stock",
    btn_generate_indent: "Generate District Indent",
    btn_download_csv: "Download CSV",
    filter_all_phcs: "All PHCs (Namakkal Block)",
    
    // Alert Messages
    donor_suggested: "Suggested peer donor",
    can_give: "can supply",
    distance: "distance",
    emergency_tag: "EMERGENCY"
  },
  ta: {
    // Brand & Nav
    brand_title: "மெடிட்ராக் PHC",
    brand_sub: "மருந்து இருப்பு & உடனடி பகிர்வு அமைப்பு",
    nav_dashboard: "முகப்பு",
    nav_stock: "மருந்து இருப்பு",
    nav_usage: "தினசரி பயன்பாடு",
    nav_requests: "பகிர்வு கோரிக்கைகள்",
    nav_alerts: "பற்றாக்குறை எச்சரிக்கை",
    nav_analytics: "பகுப்பாய்வு & முன்னறிவிப்பு",
    nav_activity: "நடவடிக்கை பதிவு",

    // Dashboard Cards
    metric_phcs: "மொத்த ஆரம்ப சுகாதார நிலையங்கள்",
    metric_medicines: "கண்காணிக்கப்படும் மருந்துகள்",
    metric_critical: "தீவிர பற்றாக்குறை",
    metric_warning: "எச்சரிக்கை நிலை",
    metric_pending_reqs: "நிலுவையில் உள்ள கோரிக்கைகள்",
    block_rebalance_title: "வட்டார சுகாதார நிலையங்கள் உடனடி மறுபகிர்வு",
    heatmap_title: "மருந்து இருப்பு வெப்ப வரைபடம் (மீதமுள்ள நாட்கள்)",

    // Status Badges & Trends
    status_safe: "போதுமான இருப்பு",
    status_warning: "எச்சரிக்கை நிலை",
    status_critical: "அவசர பற்றாக்குறை",
    trend_up: "விரைவாக கரைகிறது",
    trend_down: "குறைவான பயன்பாடு",
    trend_stable: "சீரான நிலை",
    days_left: "நாட்கள் மீதம்",

    // Actions
    btn_request: "பகிர்வு கோரு",
    btn_approve: "ஒப்புதல் அளி",
    btn_reject: "நிராகரி",
    btn_save: "பதிவு செய்",
    btn_update: "இருப்பை மாற்று",
    btn_generate_indent: "மாவட்ட தேவையை உருவாக்கு",
    btn_download_csv: "CSV பதிவிறக்கு",
    filter_all_phcs: "அனைத்து PHC-கள்",

    // Alert Messages
    donor_suggested: "பரிந்துரைக்கப்பட்ட பகிர்வாளர்",
    can_give: "வழங்கக்கூடிய அளவு",
    distance: "தூரம்",
    emergency_tag: "அவசரம்"
  }
};

let currentLang = localStorage.getItem("meditrack_lang") || "en";

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("meditrack_lang", lang);

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) {
    langBtn.textContent = lang === "en" ? "தமிழ்" : "English";
  }

  // Update all elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      if (el.tagName === "INPUT" && el.hasAttribute("placeholder")) {
        el.placeholder = translations[lang][key];
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });
}

function toggleLanguage() {
  const nextLang = currentLang === "en" ? "ta" : "en";
  applyLanguage(nextLang);
}

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || key;
}

// Toast Notifications
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ"}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("show");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("show");
}

// Refresh active alert badge count
async function refreshAlertCount() {
  try {
    const res = await fetch("/api/alerts/count");
    const json = await res.json();
    if (json.success) {
      const badge = document.getElementById("alertBellBadge");
      if (badge) {
        if (json.data.total > 0) {
          badge.textContent = json.data.total;
          badge.style.display = "inline-block";
          if (json.data.critical > 0) {
            badge.style.backgroundColor = "var(--danger)";
          } else {
            badge.style.backgroundColor = "var(--warning)";
          }
        } else {
          badge.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.error("Error fetching alert count:", err);
  }
}

// Close modals on clicking outside or escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.show").forEach(m => m.classList.remove("show"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage(currentLang);
  refreshAlertCount();

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) {
    langBtn.addEventListener("click", toggleLanguage);
  }

  // Dismiss modal on backdrop click
  document.querySelectorAll(".modal-backdrop").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
      }
    });
  });
});
