let currentDetailWork = null;
let detailMapEngine = null;
let currentQrMode = 'public';
let currentServerInfo = null;

function openDetailModal(workId) {
  currentDetailWork = currentWorks.find(w => w.id === workId);
  if (!currentDetailWork) return;

  const modal = document.getElementById('modal-detail');
  modal.classList.add('active');

  document.getElementById('detail-child-name').textContent = `${currentDetailWork.name} 的作品详情`;
  document.getElementById('detail-img').src = currentDetailWork.image_url;

  const statusBadge = document.getElementById('detail-status-badge');
  const reached = currentDetailWork.simulation.reached;
  statusBadge.className = `badge ${reached ? 'badge-success' : 'badge-danger'}`;
  statusBadge.textContent = reached ? '🎉 成功到达水车终点' : '🧭 探索中 (未达终点)';

  renderDetailSteps();

  if (!detailMapEngine) {
    detailMapEngine = new MapEngine(
      document.getElementById('detail-map-canvas'),
      document.getElementById('detail-map-token'),
      document.getElementById('detail-step-indicator')
    );
  }
  detailMapEngine.playRoute(currentDetailWork.simulation.coords, currentDetailWork.simulation.reached);
}

function renderMapSummary() {
  const sumEl = document.getElementById('map-summary-strip');
  if (!sumEl || !currentDetailWork) return;
  const sim = currentDetailWork.simulation;
  const totalSteps = currentDetailWork.steps.reduce((acc, s) => acc + s.steps, 0);
  sumEl.innerHTML = `
    <div class="summary-chip">
      <span class="summary-chip-label">规划行进步数</span>
      <span class="summary-chip-val" style="color:#2B6CB0;">🏃‍♂️ 共 ${totalSteps} 格</span>
    </div>
    <div class="summary-chip">
      <span class="summary-chip-label">终点状态判定</span>
      <span class="summary-chip-val" style="color:${sim.reached ? '#10B981' : '#E53E3E'};">
        ${sim.reached ? '🎉 到达水车' : '🧭 偏离路线'}
      </span>
    </div>
    <div class="summary-chip">
      <span class="summary-chip-label">水车目标距离</span>
      <span class="summary-chip-val" style="color:#4A5568;">
        ${sim.reached ? '🏆 完美通关' : `距终点 ${sim.distance} 格`}
      </span>
    </div>
  `;
}

function renderDetailSteps() {
  const container = document.getElementById('step-edit-list');
  if (!container) return;
  container.innerHTML = currentDetailWork.steps.map((step, idx) => `
    <div class="step-card-item">
      <span class="step-index-badge">第${idx + 1}步</span>
      <select class="step-dir-select" onchange="updateStepDirection(${idx}, this.value)">
        <option value="↑" ${step.direction === '↑' ? 'selected' : ''}>↑ 向上走</option>
        <option value="↓" ${step.direction === '↓' ? 'selected' : ''}>↓ 向下走</option>
        <option value="←" ${step.direction === '←' ? 'selected' : ''}>← 向左走</option>
        <option value="→" ${step.direction === '→' ? 'selected' : ''}>→ 向右走</option>
      </select>
      <div class="stepper-control">
        <button class="btn-step-mini" onclick="stepDelta(${idx}, -1)">−</button>
        <span class="stepper-value">${step.steps}格</span>
        <button class="btn-step-mini" onclick="stepDelta(${idx}, 1)">+</button>
      </div>
      <button class="btn-step-trash" onclick="removeStep(${idx})">×</button>
    </div>
  `).join('');
  renderMapSummary();
}

function stepDelta(index, delta) {
  const current = currentDetailWork.steps[index].steps;
  const nextVal = Math.max(1, Math.min(5, current + delta));
  updateStepCount(index, nextVal);
}

function updateStepDirection(index, newDir) {
  currentDetailWork.steps[index].direction = newDir;
  currentDetailWork.simulation = ClientRecognizer.simulatePath(currentDetailWork.steps);
  if (detailMapEngine) detailMapEngine.playRoute(currentDetailWork.simulation.coords, currentDetailWork.simulation.reached);
  if (window.location.protocol.startsWith('http')) {
    API.updateWork(currentDetailWork.id, { steps: currentDetailWork.steps });
  } else {
    localStorage.setItem('kg_works_v1', JSON.stringify(currentWorks));
  }
  renderStats();
  renderGrid();
  renderDetailSteps();
}

function updateStepCount(index, newCount) {
  const val = parseInt(newCount) || 1;
  currentDetailWork.steps[index].steps = Math.max(1, Math.min(val, 5));
  currentDetailWork.simulation = ClientRecognizer.simulatePath(currentDetailWork.steps);
  if (detailMapEngine) detailMapEngine.playRoute(currentDetailWork.simulation.coords, currentDetailWork.simulation.reached);
  if (window.location.protocol.startsWith('http')) {
    API.updateWork(currentDetailWork.id, { steps: currentDetailWork.steps });
  } else {
    localStorage.setItem('kg_works_v1', JSON.stringify(currentWorks));
  }
  renderStats();
  renderGrid();
  renderDetailSteps();
}

function addStep() {
  currentDetailWork.steps.push({ direction: '↑', steps: 1 });
  currentDetailWork.simulation = ClientRecognizer.simulatePath(currentDetailWork.steps);
  if (detailMapEngine) detailMapEngine.playRoute(currentDetailWork.simulation.coords, currentDetailWork.simulation.reached);
  if (window.location.protocol.startsWith('http')) {
    API.updateWork(currentDetailWork.id, { steps: currentDetailWork.steps });
  } else {
    localStorage.setItem('kg_works_v1', JSON.stringify(currentWorks));
  }
  renderStats();
  renderGrid();
  renderDetailSteps();
}

function removeStep(index) {
  if (currentDetailWork.steps.length <= 1) return;
  currentDetailWork.steps.splice(index, 1);
  currentDetailWork.simulation = ClientRecognizer.simulatePath(currentDetailWork.steps);
  if (detailMapEngine) detailMapEngine.playRoute(currentDetailWork.simulation.coords, currentDetailWork.simulation.reached);
  if (window.location.protocol.startsWith('http')) {
    API.updateWork(currentDetailWork.id, { steps: currentDetailWork.steps });
  } else {
    localStorage.setItem('kg_works_v1', JSON.stringify(currentWorks));
  }
  renderStats();
  renderGrid();
  renderDetailSteps();
}

function closeDetailModal() {
  document.getElementById('modal-detail').classList.remove('active');
  if (detailMapEngine && detailMapEngine.timeline) detailMapEngine.timeline.kill();
}

async function openQrModal() {
  if (window.location.protocol.startsWith('http')) {
    try {
      currentServerInfo = await API.getInfo();
    } catch (e) {}
  }
  updateQrDisplay();
  document.getElementById('modal-qr').classList.add('active');
}

function switchQrMode(mode) {
  currentQrMode = mode;
  document.getElementById('tab-qr-public').classList.toggle('active', mode === 'public');
  document.getElementById('tab-qr-lan').classList.toggle('active', mode === 'lan');
  updateQrDisplay();
}

function updateQrDisplay() {
  const isPublic = currentQrMode === 'public';
  const badgeEl = document.getElementById('qr-badge-text');
  const descEl = document.getElementById('qr-desc-text');
  const urlEl = document.getElementById('qr-url-text');
  const imgEl = document.getElementById('qr-image');

  let targetUrl = 'https://kids.k78.dpdns.org/mobile';
  if (isPublic) {
    if (currentServerInfo && currentServerInfo.public_url) {
      targetUrl = currentServerInfo.public_url;
    }
    badgeEl.innerHTML = '<span>☁️ Cloudflare 全球加速服务就绪</span>';
    badgeEl.style.display = 'inline-flex';
    descEl.textContent = '手机微信或相机直接扫码，支持 4G/5G 流量与跨网拍照直传';
    imgEl.src = `/api/qr?mode=public&t=${Date.now()}`;
  } else {
    if (currentServerInfo && currentServerInfo.lan_url) {
      targetUrl = currentServerInfo.lan_url;
    } else {
      targetUrl = 'http://192.168.1.8:8090/mobile';
    }
    badgeEl.style.display = 'none';
    descEl.textContent = '适合同局域网环境（手机与一体机需连接同一 Wi-Fi）';
    imgEl.src = `/api/qr?mode=lan&t=${Date.now()}`;
  }
  urlEl.textContent = targetUrl;
}

function copyQrUrl() {
  const text = document.getElementById('qr-url-text').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 网址已成功复制到剪贴板！');
  }).catch(() => {
    showToast(`网址：${text}`);
  });
}

function closeQrModal() {
  document.getElementById('modal-qr').classList.remove('active');
}

function playDetailRoute() {
  if (detailMapEngine && currentDetailWork) {
    detailMapEngine.playRoute(currentDetailWork.simulation.coords, currentDetailWork.simulation.reached);
  }
}
