const ComparisonModule = {
  workA: null,
  workB: null,
  engineA: null,
  engineB: null,
  allWorks: [],

  init(allWorks) {
    this.allWorks = allWorks || [];
  },

  setSelection(selectedIds) {
    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      if (selectedIds[0]) this.workA = this.allWorks.find(w => w.id === selectedIds[0]) || this.workA;
      if (selectedIds[1]) this.workB = this.allWorks.find(w => w.id === selectedIds[1]) || this.workB;
    }
  },

  open(workIdA, workIdB) {
    if (!this.allWorks || this.allWorks.length === 0) return;
    this.workA = this.allWorks.find(w => w.id === workIdA);
    if (!this.workA) {
      const succ = this.allWorks.find(w => w.simulation && w.simulation.reached);
      this.workA = succ || this.allWorks[0];
    }
    this.workB = this.allWorks.find(w => w.id === workIdB);
    if (!this.workB) {
      const other = this.allWorks.find(w => w.id !== this.workA.id && w.simulation && w.simulation.reached !== this.workA.simulation.reached);
      this.workB = other || this.allWorks.find(w => w.id !== this.workA.id) || this.workA;
    }

    const modal = document.getElementById('modal-compare');
    modal.classList.add('active');

    this.renderHeader('A', this.workA);
    this.renderHeader('B', this.workB);

    const containerA = document.getElementById('compare-map-a');
    const containerB = document.getElementById('compare-map-b');

    this.engineA = new MapEngine(containerA);
    this.engineB = new MapEngine(containerB);

    this.engineA.drawPath(this.workA.simulation.coords);
    this.engineB.drawPath(this.workB.simulation.coords);

    this.renderAnalysis();
  },

  renderHeader(slot, work) {
    const select = document.getElementById(`compare-select-${slot.toLowerCase()}`);
    select.innerHTML = this.allWorks.map(w =>
      `<option value="${w.id}" ${w.id === work.id ? 'selected' : ''}>${w.name} (${w.simulation.reached ? '成功' : '未到达'})</option>`
    ).join('');

    select.onchange = (e) => {
      const selected = this.allWorks.find(w => w.id === e.target.value);
      if (slot === 'A') {
        this.workA = selected;
        this.engineA.placeAt(2, 3);
        this.engineA.drawPath(this.workA.simulation.coords);
      } else {
        this.workB = selected;
        this.engineB.placeAt(2, 3);
        this.engineB.drawPath(this.workB.simulation.coords);
      }
      this.renderHeader(slot, selected);
      this.renderAnalysis();
    };

    const badge = document.getElementById(`compare-badge-${slot.toLowerCase()}`);
    badge.className = `badge ${work.simulation.reached ? 'badge-success' : 'badge-danger'}`;
    badge.textContent = work.simulation.reached ? '🎉 成功通关' : '🧭 探索中';

    const stepsBox = document.getElementById(`compare-steps-${slot.toLowerCase()}`);
    stepsBox.innerHTML = work.steps.map(s => `<span class="step-chip">${s.direction} ${s.steps}</span>`).join('');
  },

  renderAnalysis() {
    const box = document.getElementById('compare-analysis-text');
    const aSuccess = this.workA.simulation.reached;
    const bSuccess = this.workB.simulation.reached;
    const aSteps = this.workA.simulation.coords.length - 1;
    const bSteps = this.workB.simulation.coords.length - 1;

    let text = '';
    if (aSuccess && bSuccess) {
      if (JSON.stringify(this.workA.steps) === JSON.stringify(this.workB.steps)) {
        text = `🌟 默契满分！${this.workA.name} 与 ${this.workB.name} 选择了完全一致的通关路线，用时 ${aSteps} 步精准到达终点水车！`;
      } else {
        text = `💡 精彩发现！${this.workA.name}（用时${aSteps}步）与 ${this.workB.name}（用时${bSteps}步）走了不同的路线，但都成功到达了终点！这说明通往目标的道路不止一条！`;
      }
    } else if (aSuccess && !bSuccess) {
      text = `🧭 教学对比：${this.workA.name} 顺利到达水车终点；${this.workB.name} 停留在途中（距离终点差 ${this.workB.simulation.distance} 格）。大家一起来找找看，${this.workB.name} 是哪一步方向或步数需要调整呢？`;
    } else if (!aSuccess && bSuccess) {
      text = `🧭 教学对比：${this.workB.name} 顺利到达水车终点；${this.workA.name} 停留在途中（距离终点差 ${this.workA.simulation.distance} 格）。参考 ${this.workB.name} 的记录，我们可以怎样帮帮他？`;
    } else {
      text = `🌱 共同探索：两位小朋友都在勇敢尝试中！从绿色起点出发，一共需要向上走 2 格、向左走 3 格（共 5 格）。我们一起来帮两位小朋友规划完美路线吧！`;
    }
    box.textContent = text;
  },

  playSync() {
    const btn = document.getElementById('btn-sync-play');
    btn.disabled = true;
    let finished = 0;
    const checkFinish = () => {
      finished++;
      if (finished >= 2) {
        btn.disabled = false;
      }
    };
    this.engineA.playRoute(this.workA.simulation.coords, this.workA.simulation.reached, checkFinish);
    this.engineB.playRoute(this.workB.simulation.coords, this.workB.simulation.reached, checkFinish);
  },

  close() {
    const modal = document.getElementById('modal-compare');
    modal.classList.remove('active');
    if (this.engineA && this.engineA.timeline) this.engineA.timeline.kill();
    if (this.engineB && this.engineB.timeline) this.engineB.timeline.kill();
  }
};
