// ============================================================
//  dash.js — Dashboard client-side JS
// ============================================================

// ── Sidebar toggle ────────────────────────────────────────
const sidebar      = document.getElementById('sidebar');
const dashMain     = document.getElementById('dash-main');
const toggleBtn    = document.getElementById('sidebar-toggle');
const mobileBtn    = document.getElementById('mobile-menu-btn');
const overlay      = document.getElementById('sidebar-overlay');

let collapsed = localStorage.getItem('sidebar-collapsed') === 'true';

function applySidebar() {
  if (window.innerWidth <= 768) {
    sidebar?.classList.remove('collapsed');
    return;
  }
  if (collapsed) {
    sidebar?.classList.add('collapsed');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  } else {
    sidebar?.classList.remove('collapsed');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  }
}

toggleBtn?.addEventListener('click', () => {
  collapsed = !collapsed;
  localStorage.setItem('sidebar-collapsed', collapsed);
  applySidebar();
});

mobileBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('mobile-open');
  overlay?.classList.toggle('active');
});

overlay?.addEventListener('click', () => {
  sidebar?.classList.remove('mobile-open');
  overlay?.classList.remove('active');
});

window.addEventListener('resize', applySidebar);
applySidebar();

// ── Toast notifications ───────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" style="flex-shrink:0"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Check for flash messages
const flash = document.getElementById('flash-data');
if (flash) {
  const { type, message } = flash.dataset;
  if (message) showToast(message, type || 'info');
}

// ── Auto-save forms ───────────────────────────────────────
document.querySelectorAll('form[data-autosave]').forEach(form => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const origText = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

    try {
      const formData = new FormData(form);
      const data     = Object.fromEntries(formData.entries());

      // Handle checkboxes
      form.querySelectorAll('input[type=checkbox]').forEach(cb => {
        data[cb.name] = cb.checked;
      });

      const res = await fetch(form.action || window.location.href, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      const json = await res.json();
      showToast(json.message || 'Saved!', res.ok ? 'success' : 'error');
    } catch (err) {
      showToast('An error occurred.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
  });
});

// ── Confirm dialogs ───────────────────────────────────────
document.querySelectorAll('[data-confirm]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (!confirm(btn.dataset.confirm)) e.preventDefault();
  });
});

// ── Copy to clipboard ─────────────────────────────────────
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(btn.dataset.copy);
    showToast('Copied to clipboard!', 'success', 2000);
  });
});
