/**
 * SupeRR Selector — Canvas Charting Engine
 * Lightweight, high-DPI responsive canvas visualizations
 * Primary Palette: Midnight Navy (#17233F), Royal Pink (#E65391), Champagne Gold (#D6B66C)
 */

window.SupeRRCharts = {
  setupCanvas(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual display size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  },

  // 1. Pressure Distribution Histogram
  renderDistribution(canvasId, buckets) {
    const canvas = document.getElementById(canvasId);
    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    const labels = Object.keys(buckets);
    const values = Object.values(buckets);
    const maxVal = Math.max(...values, 1);

    const padding = { top: 25, right: 20, bottom: 35, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const barW = chartW / labels.length;

    // Grid lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '11px JetBrains Mono, monospace';

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const yVal = Math.round((maxVal / yTicks) * i);
      const yPos = padding.top + chartH - (chartH / yTicks) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(yVal.toLocaleString(), padding.left - 8, yPos + 4);
    }

    // Draw Bars
    labels.forEach((label, idx) => {
      const val = values[idx];
      const barH = (val / maxVal) * chartH;
      const x = padding.left + idx * barW + 8;
      const w = barW - 16;
      const y = padding.top + chartH - barH;

      // Color coding: PI >= 65 is Royal Pink
      const isHighPressure = label.startsWith('65') || label.startsWith('80') || label.startsWith('95');
      ctx.fillStyle = isHighPressure ? '#E65391' : '#17233F';

      // Rounded top bar
      ctx.beginPath();
      ctx.roundRect(x, y, w, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Bar Value on Top
      ctx.fillStyle = '#17233F';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(val.toLocaleString(), x + w / 2, y - 6);

      // X Label
      ctx.fillStyle = '#64748B';
      ctx.font = '11px Manrope, sans-serif';
      ctx.fillText(label, x + w / 2, padding.top + chartH + 20);
    });

    // Subtitle annotation
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Manrope, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('PI Scale: 0 to 100 (Pink = High Pressure >= 65)', width - padding.right, 14);
  },

  // 2. Over-by-Over Pressure Progression Line Chart
  renderOverProgression(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, right: 30, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxPI = 100;
    const stepX = chartW / 19;

    // Grid lines & Y axis
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '11px JetBrains Mono, monospace';

    for (let p = 0; p <= 100; p += 25) {
      const yPos = padding.top + chartH - (p / maxPI) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(p + '%', padding.left - 8, yPos + 4);
    }

    // High Pressure Threshold Reference Line at 65
    const threshY = padding.top + chartH - (65 / maxPI) * chartH;
    ctx.strokeStyle = 'rgba(230, 83, 145, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, threshY);
    ctx.lineTo(width - padding.right, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#E65391';
    ctx.font = '10px Manrope, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Threshold: PI 65.0', width - padding.right - 90, threshY - 6);

    // Helper to plot line
    const plotLine = (key, color, fillGrad) => {
      ctx.beginPath();
      data.forEach((pt, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (pt[key] / maxPI) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw dots
      data.forEach((pt, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (pt[key] / maxPI) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    // Innings 1 (Midnight Navy)
    plotLine('inn1_avg_pi', '#17233F');
    // Innings 2 (Royal Pink)
    plotLine('inn2_avg_pi', '#E65391');

    // X Axis Labels (Overs 1 to 20)
    ctx.fillStyle = '#64748B';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    data.forEach((pt, i) => {
      if (i % 2 === 0 || i === 19) {
        const x = padding.left + i * stepX;
        ctx.fillText('Ov ' + pt.over, x, padding.top + chartH + 20);
      }
    });

    // Legend
    ctx.font = '11.5px Manrope, sans-serif';
    ctx.textAlign = 'left';
    // Inn 1
    ctx.fillStyle = '#17233F';
    ctx.fillRect(width - 240, 10, 12, 12);
    ctx.fillText('Innings 1 (Setting)', width - 222, 20);
    // Inn 2
    ctx.fillStyle = '#E65391';
    ctx.fillRect(width - 110, 10, 12, 12);
    ctx.fillText('Innings 2 (Chase)', width - 92, 20);
  },

  // 3. Player Multi-Axis Radar Chart
  renderRadar(canvasId, stats, label) {
    const canvas = document.getElementById(canvasId);
    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    const cX = width / 2;
    const cY = height / 2 + 5;
    const radius = Math.min(width, height) / 2 - 40;

    const axes = Object.keys(stats);
    const values = Object.values(stats);
    const totalAxes = axes.length;
    const angleStep = (Math.PI * 2) / totalAxes;

    // Web concentric rings
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    const rings = 4;
    for (let r = 1; r <= rings; r++) {
      const curRadius = (radius / rings) * r;
      ctx.beginPath();
      for (let a = 0; a < totalAxes; a++) {
        const angle = a * angleStep - Math.PI / 2;
        const x = cX + curRadius * Math.cos(angle);
        const y = cY + curRadius * Math.sin(angle);
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Radial spokes
    for (let a = 0; a < totalAxes; a++) {
      const angle = a * angleStep - Math.PI / 2;
      const x = cX + radius * Math.cos(angle);
      const y = cY + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cX, cY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Axis labels
      const labelDist = radius + 22;
      const lx = cX + labelDist * Math.cos(angle);
      const ly = cY + labelDist * Math.sin(angle);
      ctx.fillStyle = '#17233F';
      ctx.font = 'bold 10px Manrope, sans-serif';
      ctx.textAlign = Math.abs(Math.cos(angle)) < 0.2 ? 'center' : (Math.cos(angle) > 0 ? 'left' : 'right');
      ctx.textBaseline = 'middle';
      ctx.fillText(axes[a], lx, ly);
    }

    // Plot polygon
    ctx.beginPath();
    values.forEach((val, i) => {
      const normVal = Math.min(100, Math.max(0, val)) / 100.0;
      const angle = i * angleStep - Math.PI / 2;
      const x = cX + (radius * normVal) * Math.cos(angle);
      const y = cY + (radius * normVal) * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(230, 83, 145, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#E65391';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Vertices dots
    values.forEach((val, i) => {
      const normVal = Math.min(100, Math.max(0, val)) / 100.0;
      const angle = i * angleStep - Math.PI / 2;
      const x = cX + (radius * normVal) * Math.cos(angle);
      const y = cY + (radius * normVal) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#17233F';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }
};
