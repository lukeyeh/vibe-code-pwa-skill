const app = document.getElementById('app');
const status = document.getElementById('status');

function showConnection() {
  status.textContent = navigator.onLine ? '' : 'offline';
}

window.addEventListener('online', showConnection);
window.addEventListener('offline', showConnection);
showConnection();

// The service worker is what makes the app installable and usable offline.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

app.innerHTML = '<p class="muted">Nothing here yet.</p>';
