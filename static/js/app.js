/* OnyxDashboard client logic: load devices, search/filter, register, delete, refresh. */

const API = "/api/devices";

const els = {
    tbody:    document.getElementById("devices-tbody"),
    foot:     document.getElementById("panel-foot"),
    total:    document.getElementById("stat-total"),
    online:   document.getElementById("stat-online"),
    offline:  document.getElementById("stat-offline"),
    totalSub: document.getElementById("stat-total-sub"),
    onlineSub:document.getElementById("stat-online-sub"),
    offlineSub:document.getElementById("stat-offline-sub"),
    search:   document.getElementById("search-input"),
    filter:   document.getElementById("filter-status"),
    refresh:  document.getElementById("refresh-btn"),
    register: document.getElementById("register-btn"),
    modal:    document.getElementById("register-modal"),
    form:     document.getElementById("register-form"),
};

let allDevices = [];
let lastSearch = "";
let lastFilter = "";

function timeAgo(iso) {
    const t = new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime();
    const diff = (Date.now() - t) / 1000;
    if (diff < 5)    return "just now";
    if (diff < 60)   return Math.floor(diff) + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400)return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
}

function rowHtml(d) {
    const badge = d.online
        ? '<span class="badge online">Online</span>'
        : '<span class="badge offline">Offline</span>';
    return `<tr data-id="${d.device_id}">
        <td>${badge}</td>
        <td class="device-name">${escapeHtml(d.name || d.device_id)}</td>
        <td class="device-id">${escapeHtml(d.device_id)}</td>
        <td>${escapeHtml(d.model || "—")}</td>
        <td>${escapeHtml(d.os_version || "—")}</td>
        <td class="mono">${escapeHtml(d.app_version || "—")}</td>
        <td class="mono">${escapeHtml(d.ip_address || "—")}</td>
        <td class="mono">${timeAgo(d.last_seen)}</td>
        <td><button class="delete-btn" title="Delete">✕</button></td>
    </tr>`;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
}

function applyFilter() {
    let list = allDevices;
    if (lastFilter === "online")  list = list.filter(d => d.online);
    if (lastFilter === "offline") list = list.filter(d => !d.online);
    if (lastSearch) {
        const q = lastSearch.toLowerCase();
        list = list.filter(d =>
            (d.name || "").toLowerCase().includes(q) ||
            (d.device_id || "").toLowerCase().includes(q) ||
            (d.model || "").toLowerCase().includes(q)
        );
    }
    if (list.length === 0) {
        els.tbody.innerHTML = `<tr><td colspan="9" class="empty">No devices match your filter.</td></tr>`;
    } else {
        els.tbody.innerHTML = list.map(rowHtml).join("");
    }
    els.foot.textContent = `Showing ${list.length} of ${allDevices.length} devices — updated ${new Date().toLocaleTimeString()}`;
}

async function loadDevices() {
    try {
        const r = await fetch(API);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = await r.json();
        allDevices = data.devices || [];
        els.total.textContent = data.count ?? allDevices.length;
        els.online.textContent = data.online ?? 0;
        els.offline.textContent = data.offline ?? 0;
        applyFilter();
    } catch (e) {
        els.tbody.innerHTML = `<tr><td colspan="9" class="empty">Failed to load devices: ${escapeHtml(e.message)}</td></tr>`;
    }
}

// Events
els.search.addEventListener("input", e => { lastSearch = e.target.value; applyFilter(); });
els.filter.addEventListener("change", e => { lastFilter = e.target.value; applyFilter(); });
els.refresh.addEventListener("click", () => {
    els.refresh.querySelector(".icon").style.transform = "rotate(360deg)";
    setTimeout(() => els.refresh.querySelector(".icon").style.transform = "", 400);
    loadDevices();
});

els.tbody.addEventListener("click", async e => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr.dataset.id;
    if (!confirm(`Delete device ${id}?`)) return;
    const r = await fetch(`/api/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) { toast(`Device ${id} deleted`, "success"); loadDevices(); }
    else      { toast("Delete failed", "error"); }
});

// Modal
function openModal() { els.modal.hidden = false; }
function closeModal() { els.modal.hidden = true; els.form.reset(); }
els.register.addEventListener("click", openModal);
els.modal.addEventListener("click", e => {
    if (e.target.hasAttribute("data-close")) closeModal();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

els.form.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.name) payload.name = payload.device_id;
    const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (r.ok) {
        closeModal();
        toast(`Device ${payload.device_id} registered`, "success");
        loadDevices();
    } else {
        toast("Registration failed", "error");
    }
});

// Toast
function toast(msg, type = "") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// Boot
loadDevices();
// Auto refresh every 10 seconds so the dashboard stays live.
setInterval(loadDevices, 10000);
