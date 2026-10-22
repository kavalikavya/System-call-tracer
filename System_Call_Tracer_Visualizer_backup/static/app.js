const traceBtn = document.getElementById("traceBtn");
const sample = document.getElementById("sample");
const message = document.getElementById("message");
const search = document.getElementById("search");

let allCalls = [];

function renderBars(calls) {
  const box = document.getElementById("bars");
  if (!calls.length) {
    box.className = "bars empty";
    box.textContent = "No calls found.";
    return;
  }

  box.className = "bars";
  const max = Math.max(...calls.map(x => x.count));

  box.innerHTML = calls.map(call => `
    <div class="bar-row">
      <strong>${escapeHtml(call.name)}</strong>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(call.count / max) * 100}%"></div>
      </div>
      <span>${call.count}</span>
    </div>
  `).join("");
}

function renderTable(calls) {
  const body = document.getElementById("tableBody");
  if (!calls.length) {
    body.innerHTML = `<tr><td colspan="3" class="empty">No matching calls.</td></tr>`;
    return;
  }

  body.innerHTML = calls.map(call => `
    <tr>
      <td><strong>${escapeHtml(call.name)}</strong></td>
      <td>${call.count}</td>
      <td>${call.percentage}%</td>
    </tr>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
}

traceBtn.addEventListener("click", async () => {
  traceBtn.disabled = true;
  traceBtn.textContent = "Tracing...";
  message.textContent = "Running the selected program and collecting system calls...";

  try {
    const response = await fetch("/api/trace", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({sample: sample.value})
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.error);

    const r = data.result;
    document.getElementById("totalCalls").textContent = r.total_calls;
    document.getElementById("uniqueCalls").textContent = r.unique_calls;
    document.getElementById("traceTime").textContent = `${r.trace_time}s`;
    document.getElementById("wallTime").textContent = `${r.wall_time}s`;
    document.getElementById("programName").textContent = r.sample;
    document.getElementById("output").textContent = r.program_output || "(no stdout)";

    allCalls = r.calls;
    renderBars(r.top_calls);
    renderTable(allCalls);
    message.textContent = `Trace completed successfully for ${r.sample}.`;
  } catch (error) {
    message.textContent = `Error: ${error.message}`;
  } finally {
    traceBtn.disabled = false;
    traceBtn.textContent = "Trace Program";
  }
});

search.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  renderTable(allCalls.filter(call => call.name.toLowerCase().includes(q)));
});
