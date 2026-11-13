const API = {
  async getInfo() {
    const res = await fetch('/api/info');
    return await res.json();
  },

  async getWorks() {
    const res = await fetch('/api/works');
    return await res.json();
  },

  async uploadWork(file, childName) {
    const formData = new FormData();
    formData.append('file', file);
    if (childName) {
      formData.append('child_name', childName);
    }
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },

  async updateWork(workId, payload) {
    const res = await fetch(`/api/update/${workId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async deleteWork(workId) {
    const res = await fetch(`/api/delete/${workId}`, {
      method: 'POST'
    });
    return await res.json();
  },

  async clearWorks() {
    const res = await fetch('/api/clear', {
      method: 'POST'
    });
    return await res.json();
  },

  async resetWorks() {
    const res = await fetch('/api/reset', {
      method: 'POST'
    });
    return await res.json();
  },

  connectWebSocket(onMessage) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
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
