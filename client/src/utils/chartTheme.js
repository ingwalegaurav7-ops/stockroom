// Shared Chart.js theme + helpers for Dashboard and Insights.

export const COLORS = {
  received: '#16a34a',
  receivedFill: 'rgba(22, 163, 74, 0.12)',
  sold: '#f97316',
  soldFill: 'rgba(249, 115, 22, 0.10)',
  brand: '#15803d',
  brandFill: 'rgba(21, 128, 61, 0.12)',
  inStock: '#16a34a',
  lowStock: '#f59e0b',
  outOfStock: '#ef4444',
  grid: '#eef2f6',
  text: '#475569',
  tooltipBg: '#0f172a',
};

const font = { family: 'Inter, sans-serif', size: 11 };

const tooltip = {
  backgroundColor: COLORS.tooltipBg,
  titleFont: { family: font.family, size: 12, weight: '600' },
  bodyFont: { family: font.family, size: 12 },
  padding: 12,
  cornerRadius: 8,
  boxPadding: 4,
};

const legend = {
  display: true,
  position: 'top',
  align: 'end',
  labels: {
    usePointStyle: true,
    pointStyle: 'circle',
    boxWidth: 8,
    boxHeight: 8,
    padding: 16,
    font: { family: font.family, size: 12 },
    color: '#334155',
  },
};

const integerTick = (value) => (Number.isInteger(value) ? value.toLocaleString('en-IN') : '');

/** Options for line / area charts. Pass yFormatter for currency axes. */
export function lineOptions({ yFormatter, showPoints = true } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend, tooltip },
    elements: {
      point: { radius: showPoints ? 3 : 0, hoverRadius: 5, borderWidth: 2, backgroundColor: '#fff' },
      line: { borderWidth: 2.5 },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: COLORS.text, font, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        grid: { color: COLORS.grid },
        border: { display: false },
        ticks: { color: COLORS.text, font, callback: yFormatter || integerTick, maxTicksLimit: 6 },
      },
    },
  };
}

/** Horizontal bar options. `titles` = full product names shown in the tooltip. */
export function barOptions({ titles = [] } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    layout: { padding: { right: 36 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => titles[items[0].dataIndex] ?? items[0].label,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: COLORS.grid },
        border: { display: false },
        ticks: { color: COLORS.text, font, callback: integerTick, maxTicksLimit: 5 },
      },
      y: { grid: { display: false }, border: { display: false }, ticks: { color: '#334155', font } },
    },
  };
}

/** Draws the value at the end of each bar. Register per chart: plugins={[barValueLabels]} */
export const barValueLabels = {
  id: 'barValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => {
      const value = chart.data.datasets[0].data[i];
      ctx.fillText(Number(value).toLocaleString('en-IN'), bar.x + 8, bar.y);
    });
    ctx.restore();
  },
};

/** Doughnut options (no dark outline, centre text via options.plugins.centerText). */
export function doughnutOptions({ centerValue, centerLabel } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { ...legend, position: 'right', align: 'center' },
      tooltip,
      centerText: { value: centerValue, label: centerLabel },
    },
  };
}

/** Writes a total in the middle of a doughnut. Register: plugins={[doughnutCenterText]} */
export const doughnutCenterText = {
  id: 'centerText',
  afterDraw(chart) {
    const opts = chart.options.plugins?.centerText;
    if (!opts || opts.value === undefined) return;
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText(String(opts.value), x, y - 8);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText(opts.label || '', x, y + 14);
    ctx.restore();
  },
};

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Returns one row per day for the last `days` days, filling days that had no
 * movements with zeros so the chart always shows the full range.
 */
export function fillDailySeries(daily = [], days = 7) {
  const byDate = new Map(daily.map((d) => [String(d.date).slice(0, 10), d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const row = byDate.get(dateKey(d));
    rows.push({
      date: dateKey(d),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      units_sold: row?.units_sold || 0,
      units_received: row?.units_received || 0,
    });
  }
  return rows;
}

export const PERIODS = [
  { value: '7d', label: '7 days', days: 7, long: 'Last 7 days' },
  { value: '30d', label: '30 days', days: 30, long: 'Last 30 days' },
  { value: '90d', label: '90 days', days: 90, long: 'Last 90 days' },
];