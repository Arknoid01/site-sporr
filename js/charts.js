let pieChart = null;
let trendChart = null;

const CHART_COLORS = {
  Yoga: '#FF6B35',
  Renforcement: '#7B2FF7',
  Running: '#00C9A7'
};

const CHART_FALLBACK = ['#FF6B35', '#7B2FF7', '#00C9A7', '#FFD23F', '#3A86FF'];

function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

function updatePieChart(canvas, sessions) {
  const data = aggregateByType(sessions);
  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = labels.map((label, index) => CHART_COLORS[label] || CHART_FALLBACK[index % CHART_FALLBACK.length]);

  destroyChart(pieChart);

  if (labels.length === 0) {
    pieChart = null;
    return;
  }

  pieChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 16,
            font: { size: 13 }
          }
        }
      }
    }
  });
}

function updateTrendChart(canvas, sessions) {
  const { labels, values } = aggregateWeeklyMinutes(sessions);
  destroyChart(trendChart);

  trendChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Minutes',
        data: values,
        backgroundColor: '#FF6B35',
        borderRadius: 8,
        maxBarThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 30 }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function refreshCharts(sessions) {
  const pieCanvas = document.getElementById('pie-chart');
  const trendCanvas = document.getElementById('trend-chart');

  if (pieCanvas) {
    updatePieChart(pieCanvas, sessions);
  }

  if (trendCanvas) {
    updateTrendChart(trendCanvas, sessions);
  }
}
