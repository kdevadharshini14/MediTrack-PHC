/**
 * MediTrack PHC - Single Hospital Analytics & Forecast Controller
 * Chart.js Integration for consumption trends and 7-day moving average forecast
 */

let consumptionChart = null;
let forecastChart = null;
let currentPeriod = "weekly";

document.addEventListener("DOMContentLoaded", () => {
  setupAnalyticsPage();
});

async function setupAnalyticsPage() {
  await loadForecastMedicineOptions();
  loadConsumptionAnalytics();
  loadForecastData();

  document.getElementById("btnPeriodWeekly").addEventListener("click", () => setPeriod("weekly"));
  document.getElementById("btnPeriodMonthly").addEventListener("click", () => setPeriod("monthly"));
  document.getElementById("forecastMedicineSelect").addEventListener("change", loadForecastData);
}

function setPeriod(period) {
  currentPeriod = period;
  if (period === "weekly") {
    document.getElementById("btnPeriodWeekly").className = "btn btn-primary btn-sm";
    document.getElementById("btnPeriodMonthly").className = "btn btn-outline btn-sm";
  } else {
    document.getElementById("btnPeriodWeekly").className = "btn btn-outline btn-sm";
    document.getElementById("btnPeriodMonthly").className = "btn btn-primary btn-sm";
  }
  loadConsumptionAnalytics();
}

async function loadForecastMedicineOptions() {
  try {
    const res = await fetch("/api/medicines");
    const json = await res.json();
    if (!json.success) return;

    const select = document.getElementById("forecastMedicineSelect");
    select.innerHTML = "";
    json.data.forEach(m => {
      const selected = m.id === 1 ? "selected" : "";
      select.innerHTML += `<option value="${m.id}" ${selected}>${m.name} (${m.unit})</option>`;
    });
  } catch (err) {
    console.error("Error loading medicines for forecast:", err);
  }
}

async function loadConsumptionAnalytics() {
  const url = `/api/analytics?period=${currentPeriod}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) return;

    renderConsumptionChart(json.data);
  } catch (err) {
    console.error("Error loading consumption analytics:", err);
  }
}

function renderConsumptionChart(data) {
  const ctx = document.getElementById("consumptionChartCanvas").getContext("2d");

  if (consumptionChart) {
    consumptionChart.destroy();
  }

  consumptionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: `Consumption (${data.period})`,
          data: data.consumed,
          backgroundColor: data.colors,
          borderColor: data.colors,
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = data.items[context.dataIndex];
              return [
                `Consumed: ${context.parsed.y} ${item.medicine_unit}`,
                `My Stock: ${item.total_stock} (Min: ${item.total_min_level})`,
                `Health Status: ${item.status}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          title: { display: true, text: "Units Dispensed" }
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } }
        }
      }
    }
  });
}

async function loadForecastData() {
  const medId = document.getElementById("forecastMedicineSelect").value || 1;
  const url = `/api/forecast?medicine_id=${medId}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) return;

    const data = json.data;
    document.getElementById("forecastDailyRate").textContent = `${data.sma_daily_rate} / day`;
    document.getElementById("forecast7DayTotal").textContent = `${data.projected_7_day_total} ${data.medicine_unit}`;

    renderForecastChart(data);
  } catch (err) {
    console.error("Error loading forecast data:", err);
  }
}

function renderForecastChart(data) {
  const ctx = document.getElementById("forecastChartCanvas").getContext("2d");

  if (forecastChart) {
    forecastChart.destroy();
  }

  const allLabels = [...data.history_labels, ...data.forecast_labels];
  const actualData = [...data.history_values, ...Array(data.forecast_labels.length).fill(null)];
  const lastActual = data.history_values[data.history_values.length - 1];
  const forecastData = [
    ...Array(data.history_values.length - 1).fill(null),
    lastActual,
    ...data.forecast_values
  ];

  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: allLabels,
      datasets: [
        {
          label: "Actual Outpatient Dispensing",
          data: actualData,
          borderColor: "#0f766e",
          backgroundColor: "rgba(15, 118, 110, 0.1)",
          borderWidth: 2.5,
          tension: 0.25,
          fill: true,
          pointBackgroundColor: "#0f766e",
          pointRadius: 4
        },
        {
          label: "7-Day Moving Average Forecast",
          data: forecastData,
          borderColor: "#ea580c",
          backgroundColor: "rgba(234, 88, 12, 0.05)",
          borderWidth: 2.5,
          borderDash: [6, 4],
          tension: 0,
          pointBackgroundColor: "#ea580c",
          pointRadius: 4,
          pointStyle: "rectRot"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { weight: "600", size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              if (val === null) return "";
              return `${context.dataset.label}: ${val} ${data.medicine_unit}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          title: { display: true, text: `Units (${data.medicine_unit})` }
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, font: { size: 10 } }
        }
      }
    }
  });
}
