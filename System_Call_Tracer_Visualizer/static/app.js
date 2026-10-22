/* =========================================================
   SYSTEM CALL TRACER & VISUALIZER
   Complete Frontend JavaScript
========================================================= */


/* =========================================================
   BASIC ELEMENTS
========================================================= */

const traceBtn =
  document.getElementById("traceBtn");

const sample =
  document.getElementById("sample");

const message =
  document.getElementById("message");

const search =
  document.getElementById("search");


/* =========================================================
   GLOBAL DATA
========================================================= */

let allCalls = [];

let allEvents = [];

let timelineEvents = [];

let currentTimelineIndex = -1;

let timelinePlaying = false;

let timelineTimer = null;


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(value).replace(
    /[&<>"']/g,
    ch => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"

    }[ch])
  );

}


/* =========================================================
   TOP SYSTEM CALL BARS
========================================================= */

function renderBars(calls) {

  const box =
    document.getElementById("bars");

  if (!calls || !calls.length) {

    box.className =
      "bars empty";

    box.textContent =
      "No calls found.";

    return;
  }


  box.className =
    "bars";


  const max =
    Math.max(
      ...calls.map(
        x => x.count
      )
    );


  box.innerHTML =
    calls.map(call => `

      <div class="bar-row">

        <strong>
          ${escapeHtml(call.name)}
        </strong>

        <div class="bar-track">

          <div
            class="bar-fill"
            style="
              width:${(call.count / max) * 100}%
            "
          ></div>

        </div>

        <span>
          ${call.count}
        </span>

      </div>

    `).join("");

}


/* =========================================================
   SYSTEM CALL SUMMARY TABLE
========================================================= */

function renderTable(calls) {

  const body =
    document.getElementById("tableBody");


  if (!calls || !calls.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="4"
          class="empty"
        >
          No matching calls.
        </td>

      </tr>

    `;

    return;
  }


  body.innerHTML =
    calls.map(call => `

      <tr>

        <td>

          <strong>
            ${escapeHtml(call.name)}
          </strong>

        </td>

        <td>

          <span class="category-badge">

            ${escapeHtml(
              call.category || "Other"
            )}

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


/* =========================================================
   CATEGORY STATISTICS
========================================================= */

function renderCategoryCards(categories) {

  const categoryMap = {};


  if (categories) {

    categories.forEach(category => {

      categoryMap[
        category.name
      ] = category.count;

    });

  }


  const fileCalls =
    document.getElementById(
      "fileCalls"
    );

  const ioCalls =
    document.getElementById(
      "ioCalls"
    );

  const memoryCalls =
    document.getElementById(
      "memoryCalls"
    );

  const processCalls =
    document.getElementById(
      "processCalls"
    );

  const otherCalls =
    document.getElementById(
      "otherCalls"
    );


  if (fileCalls) {

    fileCalls.textContent =
      categoryMap["File"] || 0;

  }


  if (ioCalls) {

    ioCalls.textContent =
      categoryMap["I/O"] || 0;

  }


  if (memoryCalls) {

    memoryCalls.textContent =
      categoryMap["Memory"] || 0;

  }


  if (processCalls) {

    processCalls.textContent =
      categoryMap["Process"] || 0;

  }


  if (otherCalls) {

    otherCalls.textContent =
      categoryMap["Other"] || 0;

  }

}


/* =========================================================
   CATEGORY CHART
========================================================= */

function renderCategoryChart(categories) {

  const box =
    document.getElementById(
      "categoryChart"
    );


  if (!box) {
    return;
  }


  if (!categories || !categories.length) {

    box.innerHTML = `

      <p class="empty">
        No category data available.
      </p>

    `;

    return;
  }


  box.innerHTML =
    categories.map(category => `

      <div class="category-row">

        <div class="category-label">

          <strong>
            ${escapeHtml(
              category.name
            )}
          </strong>

          <span>
            ${category.count}
            (${category.percentage}%)
          </span>

        </div>


        <div class="category-track">

          <div
            class="category-fill"
            style="
              width:${category.percentage}%
            "
          ></div>

        </div>

      </div>

    `).join("");

}


/* =========================================================
   SYSTEM CALL TIMELINE
========================================================= */

function renderTimeline(events) {

  const timeline =
    document.getElementById(
      "timeline"
    );

  const eventCount =
    document.getElementById(
      "eventCount"
    );


  if (!timeline) {
    return;
  }


  if (!events || !events.length) {

    timeline.innerHTML = `

      <div class="empty">

        No timeline data available.

      </div>

    `;


    if (eventCount) {

      eventCount.textContent =
        "0 events";

    }

    return;
  }


  if (eventCount) {

    eventCount.textContent =
      `${events.length} events`;

  }


  const visibleEvents =
    events.slice(0, 100);


  timeline.innerHTML =
    visibleEvents.map(
      (event, index) => `

      <div
        class="timeline-item"
        data-event-index="${index}"
      >

        <div class="timeline-marker">

          ${index + 1}

        </div>


        <div class="timeline-content">

          <div class="timeline-top">

            <strong>
              ${escapeHtml(
                event.name
              )}
            </strong>


            <span class="category-badge">

              ${escapeHtml(
                event.category ||
                "Other"
              )}

            </span>

          </div>


          <div class="timeline-meta">

            <span>
              PID:
              ${event.pid ?? "—"}
            </span>

            <span>
              ${escapeHtml(
                event.timestamp
              )}
            </span>

            <span>

              ${(
                Number(event.duration || 0)
                * 1000
              ).toFixed(3)}
              ms

            </span>

          </div>

        </div>

      </div>

    `
    ).join("");

}


/* =========================================================
   DETAILED SYSTEM CALL EVENTS
========================================================= */

function renderEvents(events) {

  const body =
    document.getElementById(
      "eventsBody"
    );


  if (!body) {
    return;
  }


  if (!events || !events.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="6"
          class="empty"
        >

          No system-call events
          available.

        </td>

      </tr>

    `;

    return;
  }


  const visibleEvents =
    events.slice(0, 100);


  body.innerHTML =
    visibleEvents.map(
      event => `

      <tr>

        <td>
          ${event.pid ?? "—"}
        </td>

        <td>
          ${escapeHtml(
            event.timestamp
          )}
        </td>

        <td>

          <strong>
            ${escapeHtml(
              event.name
            )}
          </strong>

        </td>

        <td>

          <span class="category-badge">

            ${escapeHtml(
              event.category ||
              "Other"
            )}

          </span>

        </td>

        <td>

          ${(
            Number(
              event.duration || 0
            ) * 1000
          ).toFixed(3)}
          ms

        </td>

        <td>

          ${escapeHtml(
            event.return_value
          )}

        </td>

      </tr>

    `
    ).join("");

}


/* =========================================================
   PROCESS INFORMATION
========================================================= */

function renderProcessInfo(
  processIds,
  events,
  processTree
) {

  const box =
    document.getElementById(
      "processInfo"
    );


  if (!box) {
    return;
  }


  if (
    !processIds ||
    !processIds.length
  ) {

    box.innerHTML = `

      <div class="empty">

        No process information
        available.

      </div>

    `;

    return;
  }


  const tree =
    processTree || [];


  /* =======================================================
     PROCESS SUMMARY
  ======================================================= */

  let html = `

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


    <div class="process-hierarchy">

      <div class="hierarchy-header">

        <strong>
          Process Hierarchy
        </strong>

        <span>
          Parent → Child
        </span>

      </div>


      <div class="hierarchy-content">

  `;


  /* =======================================================
     NO CHILD PROCESS
  ======================================================= */

  if (!tree.length) {

    html += `

      <div class="single-process">

        <strong>
          Single Process
        </strong>

        <span>
          PID ${processIds[0]}
        </span>

        <small>
          No child process was detected
          during this trace.
        </small>

      </div>

    `;

  }

  /* =======================================================
     PROCESS TREE
  ======================================================= */

  else {

    const mainPid =
      processIds[0];


    html += `

      <div class="process-node main-process">

        <span class="process-icon">
          ●
        </span>

        <div>

          <strong>
            Main Process
          </strong>

          <small>
            PID ${mainPid}
          </small>

        </div>

      </div>

    `;


    const children =
      tree.filter(
        relation =>
          relation.parent === mainPid
      );


    children.forEach(
      relation => {

        html += `

          <div class="process-branch">

            <div class="branch-line">
              └──
            </div>


            <div class="process-node child-process">

              <span class="process-icon">
                ↳
              </span>

              <div>

                <strong>
                  Child Process
                </strong>

                <small>
                  PID ${relation.child}
                </small>

                <small>
                  Parent PID:
                  ${relation.parent}
                </small>

              </div>

            </div>

          </div>

        `;

      }
    );

  }


  html += `

      </div>

    </div>

  `;


  box.innerHTML =
    html;

}


/* =========================================================
   CURRENT SYSTEM CALL
========================================================= */

function showCurrentSyscall(event) {

  const element =
    document.getElementById(
      "currentSyscall"
    );


  if (!element) {
    return;
  }


  if (!event) {

    element.textContent =
      "Waiting for trace";

    return;
  }


  const name =
    event.name || "syscall";


  const category =
    event.category || "Other";


  const returnValue =
    event.return_value ?? "—";


  element.textContent =
    `${name}() • ${category} • Return: ${returnValue}`;

}


/* =========================================================
   DYNAMIC USER MODE -> KERNEL MODE ANIMATION
========================================================= */

function animateModeTransition(events) {

  if (!events || !events.length) {
    return;
  }


  const syscallElement =
    document.getElementById(
      "currentSyscall"
    );


  const callElement =
    document.querySelector(
      ".flow .call"
    );


  const kernelElement =
    document.querySelector(
      ".flow .kernel"
    );


  const returnElement =
    document.querySelector(
      ".flow .return"
    );


  if (
    !syscallElement ||
    !callElement ||
    !kernelElement ||
    !returnElement
  ) {

    return;

  }


  clearInterval(
    modeAnimationTimer
  );


  let index = 0;


  function showEvent() {

    const event =
      events[index];


    if (!event) {
      return;
    }


    const name =
      String(
        event.name ||
        "syscall"
      ).toUpperCase();


    const returnValue =
      event.return_value ||
      "unknown";


    syscallElement.textContent =
      `${event.name}() • ${
        event.category || "Other"
      } • Return: ${returnValue}`;


    callElement.textContent =
      `${name}()`;


    returnElement.textContent =
      `RETURN: ${returnValue}`;


    callElement.classList.remove(
      "mode-active"
    );


    kernelElement.classList.remove(
      "mode-active"
    );


    returnElement.classList.remove(
      "mode-active"
    );


    setTimeout(() => {

      callElement.classList.add(
        "mode-active"
      );

    }, 100);


    setTimeout(() => {

      kernelElement.classList.add(
        "mode-active"
      );

    }, 500);


    setTimeout(() => {

      returnElement.classList.add(
        "mode-active"
      );

    }, 900);


    index++;


    if (
      index >= events.length
    ) {

      index = 0;

    }

  }


  showEvent();


  modeAnimationTimer =
    setInterval(
      showEvent,
      1500
    );

}


/* =========================================================
   TIMELINE CONTROL ELEMENTS
========================================================= */

let modeAnimationTimer = null;


const prevEventButton =
  document.getElementById(
    "prevEvent"
  );


const playTimelineButton =
  document.getElementById(
    "playTimeline"
  );


const nextEventButton =
  document.getElementById(
    "nextEvent"
  );


const currentEventNumber =
  document.getElementById(
    "currentEventNumber"
  );


const totalEventNumber =
  document.getElementById(
    "totalEventNumber"
  );


const timelineProgressBar =
  document.getElementById(
    "timelineProgressBar"
  );


/* =========================================================
   UPDATE TIMELINE CONTROLS
========================================================= */

function updateTimelineControls() {

  const total =
    timelineEvents.length;


  if (!total) {

    if (currentEventNumber) {

      currentEventNumber.textContent =
        "0";

    }


    if (totalEventNumber) {

      totalEventNumber.textContent =
        "0";

    }


    if (timelineProgressBar) {

      timelineProgressBar.style.width =
        "0%";

    }


    if (prevEventButton) {

      prevEventButton.disabled =
        true;

    }


    if (nextEventButton) {

      nextEventButton.disabled =
        true;

    }


    if (playTimelineButton) {

      playTimelineButton.disabled =
        true;

    }


    return;
  }


  if (playTimelineButton) {

    playTimelineButton.disabled =
      false;

  }


  if (prevEventButton) {

    prevEventButton.disabled =
      currentTimelineIndex <= 0;

  }


  if (nextEventButton) {

    nextEventButton.disabled =
      currentTimelineIndex >=
      total - 1;

  }


  const displayIndex =
    currentTimelineIndex >= 0
      ? currentTimelineIndex + 1
      : 0;


  if (currentEventNumber) {

    currentEventNumber.textContent =
      displayIndex;

  }


  if (totalEventNumber) {

    totalEventNumber.textContent =
      total;

  }


  const percentage =
    currentTimelineIndex >= 0
      ? (
          (currentTimelineIndex + 1)
          / total
        ) * 100
      : 0;


  if (timelineProgressBar) {

    timelineProgressBar.style.width =
      `${percentage}%`;

  }

}


/* =========================================================
   SELECT TIMELINE EVENT
========================================================= */

function selectTimelineEvent(index) {

  if (!timelineEvents.length) {
    return;
  }


  if (index < 0) {

    index = 0;

  }


  if (
    index >=
    timelineEvents.length
  ) {

    index =
      timelineEvents.length - 1;

  }


  currentTimelineIndex =
    index;


  const event =
    timelineEvents[index];


  /*
     Highlight timeline item
  */

  const timelineItems =
    document.querySelectorAll(
      ".timeline-item"
    );


  timelineItems.forEach(
    item => {

      item.classList.remove(
        "timeline-selected"
      );

    }
  );


  /*
     Only the first 100 events are
     rendered visually.
  */

  const selectedItem =
    timelineItems[index];


  if (selectedItem) {

    selectedItem.classList.add(
      "timeline-selected"
    );


    selectedItem.scrollIntoView({

      behavior: "smooth",

      block: "nearest"

    });

  }


  /*
     Update mode transition
  */

  showCurrentSyscall(
    event
  );


  /*
     Update mode boxes
  */

  const callElement =
    document.querySelector(
      ".flow .call"
    );


  const returnElement =
    document.querySelector(
      ".flow .return"
    );


  if (callElement) {

    callElement.textContent =
      `${String(
        event.name ||
        "syscall"
      ).toUpperCase()}()`;

  }


  if (returnElement) {

    returnElement.textContent =
      `RETURN: ${
        event.return_value || "unknown"
      }`;

  }


  /*
     Update controls
  */

  updateTimelineControls();

}


/* =========================================================
   STOP TIMELINE PLAYBACK
========================================================= */

function stopTimelinePlayback() {

  timelinePlaying =
    false;


  clearInterval(
    timelineTimer
  );


  timelineTimer =
    null;


  if (playTimelineButton) {

    playTimelineButton.textContent =
      "▶ Play";

  }

}


/* =========================================================
   START TIMELINE PLAYBACK
========================================================= */

function startTimelinePlayback() {

  if (!timelineEvents.length) {
    return;
  }


  timelinePlaying =
    true;


  if (playTimelineButton) {

    playTimelineButton.textContent =
      "⏸ Pause";

  }


  /*
     If we reached the end,
     restart from beginning.
  */

  if (
    currentTimelineIndex >=
    timelineEvents.length - 1
  ) {

    currentTimelineIndex =
      -1;

  }


  /*
     Immediately show next event.
  */

  selectTimelineEvent(
    currentTimelineIndex + 1
  );


  timelineTimer =
    setInterval(() => {

      const nextIndex =
        currentTimelineIndex + 1;


      if (
        nextIndex >=
        timelineEvents.length
      ) {

        stopTimelinePlayback();

        return;

      }


      selectTimelineEvent(
        nextIndex
      );

    }, 1500);

}


/* =========================================================
   RENDER INTERACTIVE TIMELINE
========================================================= */

function renderInteractiveTimeline(events) {

  timelineEvents =
    events || [];


  currentTimelineIndex =
    -1;


  stopTimelinePlayback();


  renderTimeline(
    timelineEvents
  );


  updateTimelineControls();

}


/* =========================================================
   PREVIOUS BUTTON
========================================================= */

if (prevEventButton) {

  prevEventButton.addEventListener(
    "click",
    () => {

      selectTimelineEvent(
        currentTimelineIndex - 1
      );

    }
  );

}


/* =========================================================
   NEXT BUTTON
========================================================= */

if (nextEventButton) {

  nextEventButton.addEventListener(
    "click",
    () => {

      selectTimelineEvent(
        currentTimelineIndex + 1
      );

    }
  );

}


/* =========================================================
   PLAY / PAUSE BUTTON
========================================================= */

if (playTimelineButton) {

  playTimelineButton.addEventListener(
    "click",
    () => {

      if (timelinePlaying) {

        stopTimelinePlayback();

      } else {

        startTimelinePlayback();

      }

    }
  );

}


/* =========================================================
   TRACE PROGRAM
========================================================= */

traceBtn.addEventListener(
  "click",
  async () => {

    traceBtn.disabled =
      true;


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

              sample:
                sample.value

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


      /* =================================================
         BASIC STATISTICS
      ================================================= */

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


      /* =================================================
         STORE DATA
      ================================================= */

      allCalls =
        r.calls || [];


      allEvents =
        r.events || [];


      /* =================================================
         RENDER DASHBOARD
      ================================================= */

      renderBars(
        r.top_calls || []
      );


      renderTable(
        allCalls
      );


      renderCategoryCards(
        r.categories || []
      );


      renderCategoryChart(
        r.categories || []
      );


      renderInteractiveTimeline(
        allEvents
      );


      renderEvents(
        allEvents
      );


      renderProcessInfo(
        r.process_ids || [],
        allEvents,
        r.process_tree || []
      );


      /* =================================================
         INITIAL MODE TRANSITION
      ================================================= */

      showCurrentSyscall(
        allEvents[0]
      );


      /*
         Start dynamic mode animation
      */

      animateModeTransition(
        allEvents
      );


      /* =================================================
         SUCCESS MESSAGE
      ================================================= */

      message.textContent =
        `Trace completed successfully for ${r.sample}.`;

    }

    catch (error) {

      console.error(
        error
      );


      message.textContent =
        `Error: ${error.message}`;

    }

    finally {

      traceBtn.disabled =
        false;


      traceBtn.textContent =
        "Trace Program";

    }

  }
);


/* =========================================================
   SEARCH SYSTEM CALLS
========================================================= */

if (search) {

  search.addEventListener(
    "input",
    () => {

      const q =
        search.value
          .trim()
          .toLowerCase();


      const filteredCalls =
        allCalls.filter(
          call =>
            call.name
              .toLowerCase()
              .includes(q)
        );


      renderTable(
        filteredCalls
      );

    }
  );

}


/* =========================================================
   INITIAL STATE
========================================================= */

updateTimelineControls();
// =========================================================
// SYSCALL CATEGORY FILTER
// =========================================================

let activeCategory = "All";

const categoryCards = document.querySelectorAll(".category-card");

categoryCards.forEach(card => {

    card.addEventListener("click", () => {

        const category = card.dataset.category;

        if (!category) return;

        activeCategory =
            activeCategory === category ? "All" : category;

        categoryCards.forEach(c => {
            c.classList.remove("category-selected");
        });

        if (activeCategory !== "All") {
            card.classList.add("category-selected");
        }

        applyCategoryFilter();
    });

});


function applyCategoryFilter() {

    let filteredEvents = allEvents;

    if (activeCategory !== "All") {

        filteredEvents = allEvents.filter(event =>
            event.category === activeCategory
        );

    }

    // Update timeline
    renderInteractiveTimeline(filteredEvents);

    // Update detailed event table
    renderEvents(filteredEvents);

    // Update current syscall
    if (filteredEvents.length > 0) {
        selectTimelineEvent(0);
    } else {
        showCurrentSyscall(null);
    }

}
