let currentWorks = [];
let activeFilter = 'all';
let selectedCompareIds = [];

const DEFAULT_PRESETS = [
  ['张子轩 (实拍)', [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }]],
  ['李沐宸', [{ direction: '←', steps: 3 }, { direction: '↑', steps: 2 }]]
].map((item, idx) => ({
  id: `work_${String(idx + 1).padStart(2, '0')}`,
  name: item[0],
  image_url: `data/presets/child_${String(idx + 1).padStart(2, '0')}.jpg`,
  steps: item[1]
}));

function updateAllViews() {
  ComparisonModule.init(currentWorks);
  renderStats();
  renderGrid();
}

async function initWorks() {
  if (window.location.protocol.startsWith('http')) {
    try {
      const works = await API.getWorks();
      if (Array.isArray(works)) {
        currentWorks = works;
        updateAllViews();
        API.connectWebSocket((msg) => {
          if (msg.type === 'new_work' && msg.work) {
            currentWorks.unshift(msg.work);
            updateAllViews();
            SoundEngine.playSuccess();
            showToast(`📱 收到手机上传作品：${msg.work.name}！已完成评测`);
          } else if (msg.type === 'refresh') {
            API.getWorks().then(w => { currentWorks = w; updateAllViews(); });
          }
        });
        return;
      }
    } catch (e) {}
  }
  const saved = localStorage.getItem('kg_works_v1');
  currentWorks = saved ? JSON.parse(saved) : DEFAULT_PRESETS.map(i => ({ ...i, simulation: ClientRecognizer.simulatePath(i.steps) }));
  updateAllViews();
}

function showToast(msg) {
  const toast = document.getElementById('toast-notify');
  toast.textContent = msg;
  toast.style.display = 'flex';
  gsap.fromTo(toast, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
  setTimeout(() => {
    gsap.to(toast, { y: -20, opacity: 0, duration: 0.25, onComplete: () => { toast.style.display = 'none'; } });
  }, 3500);
}

function renderStats() {
  const total = currentWorks.length;
  const successCount = currentWorks.filter(w => w.simulation && w.simulation.reached).length;
  const failCount = total - successCount;
  const rate = total > 0 ? Math.round((successCount / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-success').textContent = successCount;
  document.getElementById('stat-fail').textContent = failCount;
  document.getElementById('stat-rate').textContent = `${rate}%`;
  document.getElementById('stat-progress').style.width = `${rate}%`;

  const routeCounts = {};
  currentWorks.forEach(w => {
    const routeKey = w.steps.map(s => `${s.direction}${s.steps}`).join(' ');
    routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
  });

  const sortedRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]);
  const tagList = document.getElementById('route-tag-list');
  if (sortedRoutes.length === 0) {
    tagList.innerHTML = '<span style="color:#A0AEC0; font-size:12px;">等待作品上传生成统计...</span>';
  } else {
    tagList.innerHTML = sortedRoutes.slice(0, 3).map(([key, count]) =>
      `<span class="route-tag">${key} (${count}人)</span>`
    ).join('');
  }

  document.getElementById('filter-all-badge').textContent = total;
  document.getElementById('filter-success-badge').textContent = successCount;
  document.getElementById('filter-fail-badge').textContent = failCount;
}

function renderGrid() {
  const grid = document.getElementById('works-grid');
  grid.innerHTML = '';
  const filtered = currentWorks.filter(w => {
    if (activeFilter === 'success') return w.simulation && w.simulation.reached;
    if (activeFilter === 'fail') return w.simulation && !w.simulation.reached;
    return true;
  });

  if (filtered.length === 0) {
    if (currentWorks.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🎨</div>
          <div class="empty-state-title">看板已就绪，等待新作品上传</div>
          <div class="empty-state-desc">请使用手机扫码拍照直传，或点击上方【一体机传图】导入幼儿作品</div>
          <div class="empty-state-actions">
            <button class="btn-primary" onclick="openQrModal()">📱 手机扫码直传</button>
            <button class="btn-outline" onclick="resetAllData()">🔄 恢复16人演示样本</button>
          </div>
        </div>
      `;
    } else {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#A0AEC0;">暂无符合条件的作品</div>`;
    }
    return;
  }

  filtered.forEach(work => {
    const card = document.createElement('div');
    card.className = `work-card ${selectedCompareIds.includes(work.id) ? 'selected-for-compare' : ''}`;
    const isReached = work.simulation && work.simulation.reached;

    card.innerHTML = `
      <div class="card-top">
        <div class="child-info"><div class="child-avatar">${work.name.slice(0, 1)}</div><div class="child-name">${work.name}</div></div>
        <span class="badge ${isReached ? 'badge-success' : 'badge-danger'}">${isReached ? '🎉 到达终点' : '🧭 探索中'}</span>
      </div>
      <div class="thumb-wrap" onclick="openDetailModal('${work.id}')">
        <img src="${work.image_url}" alt="${work.name}">
        <div class="thumb-overlay">🔍 点击放大与动态回放</div>
      </div>
      <div class="steps-strip">${work.steps.map(s => `<span class="step-chip">${s.direction} ${s.steps}</span>`).join('')}</div>
      <div class="card-footer">
        <label class="compare-checkbox-label"><input type="checkbox" ${selectedCompareIds.includes(work.id) ? 'checked' : ''} onchange="toggleCompareSelect('${work.id}')"> 对比</label>
        <button class="btn-outline" style="padding: 4px 12px; font-size: 13px;" onclick="openDetailModal('${work.id}')">大图回放</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function setFilter(filterType) {
  activeFilter = filterType;
  document.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
  const targetBtn = document.getElementById(`filter-btn-${filterType}`);
  if (targetBtn) targetBtn.classList.add('active');
  renderGrid();
}

function toggleCompareSelect(workId) {
  const idx = selectedCompareIds.indexOf(workId);
  if (idx >= 0) {
    selectedCompareIds.splice(idx, 1);
  } else {
    if (selectedCompareIds.length >= 2) selectedCompareIds.shift();
    selectedCompareIds.push(workId);
  }
  ComparisonModule.setSelection(selectedCompareIds);
  updateCompareHintBar();
  renderGrid();
}

function updateCompareHintBar() {
  const bar = document.getElementById('compare-hint-bar');
  const countEl = document.getElementById('selected-compare-count');
  if (!bar || !countEl) return;
  const count = selectedCompareIds.length;
  countEl.textContent = count;
  bar.style.display = count > 0 ? 'inline-flex' : 'none';
}

function startCompareFromSelection() {
  if (!currentWorks || currentWorks.length === 0) return showToast('暂无作品可对比');
  let idA = selectedCompareIds[0], idB = selectedCompareIds[1];
  if (!idA && !idB) {
    const succ = currentWorks.find(w => w.simulation && w.simulation.reached);
    const fail = currentWorks.find(w => w.simulation && !w.simulation.reached);
    idA = succ ? succ.id : currentWorks[0].id;
    idB = fail ? fail.id : (currentWorks[1] ? currentWorks[1].id : idA);
    showToast('💡 已精选两份典型作品开启同屏教学对比');
  } else if (idA && !idB) {
    const itemA = currentWorks.find(w => w.id === idA);
    const other = currentWorks.find(w => w.id !== idA && (itemA ? w.simulation.reached !== itemA.simulation.reached : true)) || currentWorks.find(w => w.id !== idA);
    idB = other ? other.id : idA;
  }
  ComparisonModule.open(idA, idB);
}

async function clearAllWorks() {
  if (confirm('确认清空当前看板的所有作品？清空后可通过手机拍照或一体机开始全新一课。')) {
    if (window.location.protocol.startsWith('http')) {
      await API.clearWorks();
      currentWorks = [];
    } else {
      currentWorks = [];
      localStorage.setItem('kg_works_v1', JSON.stringify([]));
    }
    selectedCompareIds = [];
    updateCompareHintBar();
    updateAllViews();
    showToast('🗑️ 看板已清空，可开始上传新作品！');
  }
}

async function resetAllData() {
  if (confirm('确认恢复初始16名幼儿的演示作品样本？')) {
    if (window.location.protocol.startsWith('http')) {
      await API.resetWorks();
      currentWorks = await API.getWorks();
    } else {
      localStorage.removeItem('kg_works_v1');
      initWorks();
    }
    updateAllViews();
  }
}

function triggerPcUpload() {
  document.getElementById('pc-file-input').click();
}

async function handlePcFileInput(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (window.location.protocol.startsWith('http')) {
      try { await API.uploadWork(file); } catch (err) { alert('上传失败：' + err.message); }
    } else {
      try {
        const res = await ClientRecognizer.recognizeFile(file);
        currentWorks.unshift({ id: `local_${Date.now()}_${i}`, name: `幼儿 ${currentWorks.length + 1}号`, image_url: res.imageUrl, steps: res.steps, simulation: res.simulation });
        localStorage.setItem('kg_works_v1', JSON.stringify(currentWorks));
      } catch (err) { alert('本地识别失败：' + err.message); }
    }
  }
  if (window.location.protocol.startsWith('http')) currentWorks = await API.getWorks();
  updateAllViews();
  e.target.value = '';
}

window.addEventListener('DOMContentLoaded', () => {
  initWorks();
});