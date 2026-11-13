const API = {
  getBaseUrl() {
    if (window.location.protocol.startsWith('http')) return '';
    return 'https://kids.k78.dpdns.org';
  },

  async getInfo() {
    const res = await fetch(`${this.getBaseUrl()}/api/info`);
    return await res.json();
  },

  async getWorks() {
    const res = await fetch(`${this.getBaseUrl()}/api/works`);
    return await res.json();
  },

  async uploadWork(file, childName) {
    const formData = new FormData();
    formData.append('file', file);
    if (childName) formData.append('child_name', childName);
    const res = await fetch(`${this.getBaseUrl()}/api/upload`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },

  async updateWork(workId, payload) {
    const res = await fetch(`${this.getBaseUrl()}/api/update/${workId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async deleteWork(workId) {
    const res = await fetch(`${this.getBaseUrl()}/api/delete/${workId}`, { method: 'POST' });
    return await res.json();
  },

  async clearWorks() {
    const res = await fetch(`${this.getBaseUrl()}/api/clear`, { method: 'POST' });
    return await res.json();
  },

  async resetWorks() {
    const res = await fetch(`${this.getBaseUrl()}/api/reset`, { method: 'POST' });
    return await res.json();
  },

  connectWebSocket(onMessage) {
    let wsUrl;
    if (window.location.protocol.startsWith('http')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    } else {
      wsUrl = 'wss://kids.k78.dpdns.org/ws';
    }
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (e) {}
    };

    socket.onclose = () => {
      setTimeout(() => API.connectWebSocket(onMessage), 3000);
    };

    return socket;
  }
};
