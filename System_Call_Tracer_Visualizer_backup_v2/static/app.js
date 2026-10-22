const traceBtn = document.getElementById("traceBtn");
const sample = document.getElementById("sample");
const message = document.getElementById("message");
const search = document.getElementById("search");

let allCalls = [];
let allEvents = [];


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[ch]));
}


// =====================================================
// TOP SYSTEM CALL BARS
// =====================================================

function renderBars(calls) {

  const box = document.getElementById("bars");

  if (!calls || !calls.length) {

    box.className = "bars empty";
    box.textContent = "No calls found.";

    return;
  }

  box.className = "bars";

  const max = Math.max(
    ...calls.map(x => x.count)
  );

  box.innerHTML = calls.map(call => `

    <div class="bar-row">

      <strong>
        ${escapeHtml(call.name)}
      </strong>

      <div class="bar-track">

        <div
          class="bar-fill"
          style="width:${(call.count / max) * 100}%">
        </div>

      </div>

      <span>
        ${call.count}
      </span>

    </div>

  `).join("");
}


// =====================================================
// SYSTEM CALL SUMMARY TABLE
// =====================================================

function renderTable(calls) {

  const body = document.getElementById("tableBody");

  if (!calls || !calls.length) {

    body.innerHTML = `
      <tr>
        <td colspan="4" class="empty">
          No matching calls.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = calls.map(call => `

    <tr>

      <td>
        <strong>
          ${escapeHtml(call.name)}
        </strong>
      </td>

      <td>
        <span class="category-badge">
          ${escapeHtml(call.category || "Other")}
        </span>
      </td>

      <td>
        ${call.count}
      </td>

      <td>
        ${call.percentage}%
      </td>

    </tr>

  `).join("");
}


// =====================================================
// CATEGORY STATISTICS
// =====================================================

function renderCategoryCards(categories) {

  const categoryMap = {};

  if (categories) {

    categories.forEach(category => {

      categoryMap[category.name] =
        category.count;

    });

  }

  document.getElementById("fileCalls").textContent =
    categoryMap["File"] || 0;

  document.getElementById("ioCalls").textContent =
    categoryMap["I/O"] || 0;

  document.getElementById("memoryCalls").textContent =
    categoryMap["Memory"] || 0;

  document.getElementById("processCalls").textContent =
    categoryMap["Process"] || 0;

  document.getElementById("otherCalls").textContent =
    categoryMap["Other"] || 0;
}


// =====================================================
// CATEGORY CHART
// =====================================================

function renderCategoryChart(categories) {

  const box =
    document.getElementById("categoryChart");

  if (!categories || !categories.length) {

    box.innerHTML = `
      <p class="empty">
        No category data available.
      </p>
    `;

    return;
  }

  box.innerHTML = categories.map(category => `

    <div class="category-row">

      <div class="category-label">

        <strong>
          ${escapeHtml(category.name)}
        </strong>

        <span>
          ${category.count}
          (${category.percentage}%)
        </span>

      </div>

      <div class="category-track">

        <div
          class="category-fill"
          style="width:${category.percentage}%">
        </div>

      </div>

    </div>

  `).join("");
}


// =====================================================
// TIMELINE
// =====================================================

function renderTimeline(events) {

  const timeline =
    document.getElementById("timeline");

  const eventCount =
    document.getElementById("eventCount");

  if (!events || !events.length) {

    timeline.innerHTML = `
      <div class="empty">
        No timeline data available.
      </div>
    `;

    eventCount.textContent =
      "0 events";

    return;
  }

  eventCount.textContent =
    `${events.length} events`;

  /*
   * Display only the first 100 events in the visual
   * timeline to keep the page responsive.
   */

  const visibleEvents =
    events.slice(0, 100);

  timeline.innerHTML =
    visibleEvents.map((event, index) => `

      <div class="timeline-item">

        <div class="timeline-marker">
          ${index + 1}
        </div>

        <div class="timeline-content">

          <div class="timeline-top">

            <strong>
              ${escapeHtml(event.name)}
            </strong>

            <span class="category-badge">
              ${escapeHtml(event.category)}
            </span>

          </div>

          <div class="timeline-meta">

            <span>
              PID: ${event.pid ?? "—"}
            </span>

            <span>
              ${escapeHtml(event.timestamp)}
            </span>

            <span>
              ${(event.duration * 1000).toFixed(3)} ms
            </span>

          </div>

        </div>

      </div>

    `).join("");
}


// =====================================================
// DETAILED EVENT TABLE
// =====================================================

function renderEvents(events) {

  const body =
    document.getElementById("eventsBody");

  if (!events || !events.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No system-call events available.
        </td>
      </tr>
    `;

    return;
  }

  /*
   * Show only first 100 events.
   */

  const visibleEvents =
    events.slice(0, 100);

  body.innerHTML =
    visibleEvents.map(event => `

      <tr>

        <td>
          ${event.pid ?? "—"}
        </td>

        <td>
          ${escapeHtml(event.timestamp)}
        </td>

        <td>
          <strong>
            ${escapeHtml(event.name)}
          </strong>
        </td>

        <td>
          <span class="category-badge">
            ${escapeHtml(event.category)}
          </span>
        </td>

        <td>
          ${(event.duration * 1000).toFixed(3)} ms
        </td>

        <td>
          ${escapeHtml(event.return_value)}
        </td>

      </tr>

    `).join("");
}


// =====================================================
// PROCESS INFORMATION
// =====================================================

function renderProcessInfo(processIds, events) {

  const box =
    document.getElementById("processInfo");

  if (!processIds || !processIds.length) {

    box.innerHTML = `
      <div class="empty">
        No process information available.
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <div class="process-summary">

      <div class="process-stat">

        <span>
          Processes Detected
        </span>

        <strong>
          ${processIds.length}
        </strong>

      </div>

      <div class="process-stat">

        <span>
          Primary PID
        </span>

        <strong>
          ${processIds[0]}
        </strong>

      </div>

      <div class="process-stat">

        <span>
          Events Captured
        </span>

        <strong>
          ${events ? events.length : 0}
        </strong>

      </div>

    </div>


    <div class="process-list">

      ${processIds.map((pid, index) => `

        <div class="process-node">

          <span class="process-icon">
            ${index === 0 ? "●" : "↳"}
          </span>

          <div>

            <strong>
              PID ${pid}
            </strong>

            <small>
              ${index === 0
                ? "Main Process"
                : "Child Process"}
            </small>

          </div>

        </div>

      `).join("")}

    </div>

  `;
}


// =====================================================
// CURRENT SYSTEM CALL
// =====================================================

function showCurrentSyscall(event) {

  const element =
    document.getElementById("currentSyscall");

  if (!event) {

    element.textContent =
      "Waiting for trace";

    return;
  }

  element.textContent =
    `${event.name}() • ${event.category}`;
}


// =====================================================
// TRACE BUTTON
// =====================================================

traceBtn.addEventListener(
  "click",
  async () => {

    traceBtn.disabled = true;

    traceBtn.textContent =
      "Tracing...";

    message.textContent =
      "Running the selected program and collecting system calls...";


    try {

      const response =
        await fetch(
          "/api/trace",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              sample: sample.value
            })
          }
        );


      const data =
        await response.json();


      if (!data.ok) {

        throw new Error(
          data.error
        );

      }


      const r =
        data.result;


      // ===============================================
      // MAIN STATISTICS
      // ===============================================

      document.getElementById(
        "totalCalls"
      ).textContent =
        r.total_calls;


      document.getElementById(
        "uniqueCalls"
      ).textContent =
        r.unique_calls;


      document.getElementById(
        "traceTime"
      ).textContent =
        `${r.trace_time}s`;


      document.getElementById(
        "wallTime"
      ).textContent =
        `${r.wall_time}s`;


      document.getElementById(
        "programName"
      ).textContent =
        r.sample;


      document.getElementById(
        "output"
      ).textContent =
        r.program_output ||
        "(no stdout)";


      // ===============================================
      // SAVE DATA
      // ===============================================

      allCalls =
        r.calls || [];

      allEvents =
        r.events || [];


      // ===============================================
      // RENDER EXISTING FEATURES
      // ===============================================

      renderBars(
        r.top_calls || []
      );

      renderTable(
        allCalls
      );


      // ===============================================
      // RENDER NEW FEATURES
      // ===============================================

      renderCategoryCards(
        r.categories || []
      );


      renderCategoryChart(
        r.categories || []
      );


      renderTimeline(
        allEvents
      );


      renderEvents(
        allEvents
      );


      renderProcessInfo(
        r.process_ids || [],
        allEvents
      );


      showCurrentSyscall(
        allEvents[0]
      );


      message.textContent =
        `Trace completed successfully for ${r.sample}.`;


    } catch (error) {

      console.error(error);

      message.textContent =
        `Error: ${error.message}`;

    } finally {

      traceBtn.disabled =
        false;

      traceBtn.textContent =
        "Trace Program";

    }

  }
);


// =====================================================
// SEARCH
// =====================================================

search.addEventListener(
  "input",
  () => {

    const q =
      search.value
        .trim()
        .toLowerCase();


    renderTable(

      allCalls.filter(
        call =>
          call.name
            .toLowerCase()
            .includes(q)
      )

    );

  }
);
