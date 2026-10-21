const $ = id => document.getElementById(id);
const state = { program:'./sample_app', calls:[], selected:null, running:false };

const sampleTraces = {
  './hello': [
    ['execve','"./hello", [argv], envp','0','User','0.40'],
    ['write','1, "Hello World\\n", 12','12','Kernel','0.18'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  'cat file.txt': [
    ['execve','"/usr/bin/cat", [argv], envp','0','User','0.39'],
    ['openat','AT_FDCWD, "file.txt", O_RDONLY','3','Kernel','0.22'],
    ['read','3, 0x7ffd..., 4096','18','Kernel','0.31'],
    ['write','1, 0x7ffd..., 18','18','Kernel','0.17'],
    ['close','3','0','Kernel','0.08'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './server': [
    ['socket','AF_INET, SOCK_STREAM, 0','3','Kernel','0.25'],
    ['bind','3, sockaddr, 16','0','Kernel','0.19'],
    ['listen','3, 128','0','Kernel','0.14'],
    ['accept','3, sockaddr, &len','4','Kernel','0.41'],
    ['read','4, buffer, 1024','128','Kernel','0.33'],
    ['write','4, response, 256','256','Kernel','0.28'],
    ['close','4','0','Kernel','0.09']
  ],
  './fork_demo': [
    ['execve','"./fork_demo", [argv], envp','0','User','0.38'],
    ['clone','child_stack, flags=SIGCHLD, ...','2451','Kernel','0.24'],
    ['wait4','2451, &status, 0, NULL','2451','Kernel','0.32'],
    ['write','1, "Child finished\\n", 14','14','Kernel','0.16'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './create_file': [
    ['openat','AT_FDCWD, "notes.txt", O_WRONLY|O_CREAT, 0644','3','Kernel','0.23'],
    ['write','3, "Study notes\\n", 12','12','Kernel','0.19'],
    ['close','3','0','Kernel','0.08'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './delete_file': [
    ['unlink','"old_notes.txt"','0','Kernel','0.21'],
    ['write','1, "File removed\\n", 13','13','Kernel','0.16'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './directory_demo': [
    ['openat','AT_FDCWD, ".", O_RDONLY|O_DIRECTORY','3','Kernel','0.20'],
    ['getdents64','3, dirent_buffer, 2048','320','Kernel','0.28'],
    ['write','1, "Directory entries listed\\n", 27','27','Kernel','0.18'],
    ['close','3','0','Kernel','0.07'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './memory_demo': [
    ['mmap','NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0','140001280','Kernel','0.25'],
    ['write','1, "Memory region allocated\\n", 24','24','Kernel','0.16'],
    ['munmap','140001280, 8192','0','Kernel','0.18'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './permission_demo': [
    ['openat','AT_FDCWD, "/root/secret.txt", O_RDONLY','-1','Kernel','0.22'],
    ['write','2, "Permission denied\\n", 19','19','Kernel','0.17'],
    ['exit_group','1','0','Kernel','0.05']
  ],
  './pipe_demo': [
    ['pipe2','[3, 4], 0','0','Kernel','0.18'],
    ['write','4, "hello through pipe", 18','18','Kernel','0.16'],
    ['read','3, buffer, 64','18','Kernel','0.20'],
    ['close','3','0','Kernel','0.07'],
    ['close','4','0','Kernel','0.07'],
    ['exit_group','0','0','Kernel','0.05']
  ],
  './sample_app': [
    ['execve','"./sample_app", [argv], envp','0','User','0.40'],
    ['brk','NULL','0','Kernel','0.11'],
    ['mmap','NULL, 4096, PROT_READ|WRITE','139817984','Kernel','0.16'],
    ['openat','AT_FDCWD, "data.txt", O_RDONLY','3','Kernel','0.21'],
    ['read','3, buffer, 128','64','Kernel','0.29'],
    ['write','1, buffer, 64','64','Kernel','0.17'],
    ['close','3','0','Kernel','0.07'],
    ['exit_group','0','0','Kernel','0.05']
  ]
};

const explanations = {
  execve:'Starts a new program image. It is associated with the program entering execution and is shown here as the first step in the sample trace.',
  openat:'Asks the kernel to open a file and returns a file descriptor when the request succeeds.',
  read:'Requests bytes from a file descriptor into a buffer. The return value represents the number of bytes read in a successful call.',
  write:'Requests the kernel to send bytes from a buffer to a file descriptor such as a terminal or file.',
  close:'Releases a file descriptor so the process no longer needs that open resource.',
  socket:'Creates a communication endpoint for network operations.',
  bind:'Associates a socket with a local address and port.',
  listen:'Marks a socket as a passive endpoint that can accept incoming connections.',
  accept:'Accepts an incoming connection and returns a descriptor for the connected endpoint.',
  brk:'Changes the process data-segment boundary; it is one mechanism related to process heap management.',
  mmap:'Creates a memory mapping in the process address space. The kernel manages the requested mapping and its permissions.',
  exit_group:'Terminates the process/thread group in the Linux-style model used by this educational trace.',
  clone:'Creates a child task or process-like execution context; Linux uses clone-related interfaces for process and thread creation.',
  wait4:'Waits for a child process to change state and can collect its exit status.',
  unlink:'Removes a filesystem name; the underlying file data is reclaimed when no links or open references remain.',
  getdents64:'Reads directory-entry information from a directory file descriptor.',
  munmap:'Removes a memory mapping from the process address space.',
  pipe2:'Creates a pipe with read and write file descriptors for inter-process communication.'
};

function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showToast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function normalizeTrace(rows){return rows.map((r,i)=>({id:i+1,name:r[0],args:r[1],ret:r[2],mode:r[3],duration:r[4],failed:['-1','-2','-9','-13'].includes(r[2])}));}
function updateStats(){const n=state.calls.length,ok=state.calls.filter(c=>!c.failed).length,fail=n-ok;$('statCalls').textContent=n;$('statSuccess').textContent=ok;$('statFailed').textContent=fail;$('statTransitions').textContent=n*2;$('terminalCount').textContent=`${n} call${n===1?'':'s'}`;$('snapshotProgram').textContent=state.program||'—';if(n){const c=state.calls[n-1];$('snapshotLast').textContent=c.name;$('snapshotLastResult').textContent=`return ${c.ret}`;}else{$('snapshotLast').textContent='—';$('snapshotLastResult').textContent='Waiting for trace';}}
function loadTrace(command='./sample_app',announce=true){state.program=command;const rows=sampleTraces[command]||sampleTraces['./sample_app'];state.calls=normalizeTrace(rows);state.selected=null;renderAll();$('snapshotStatus').textContent=`${state.calls.length} system calls loaded`;if(announce)showToast(`Trace loaded for ${command}`)}
function renderTerminal(){const out=$('terminalOutput');if(!state.calls.length){out.innerHTML='<div class="terminal-line muted-line">$ waiting for a trace...</div>';return;}out.innerHTML=state.calls.map(c=>`<div class="terminal-line ${c.failed?'fail':''}" data-id="${c.id}"><span class="time">${String(c.id).padStart(2,'0')}</span> <span class="call">${esc(c.name)}</span>(<span class="args">${esc(c.args)}</span>) = <span class="ret">${esc(c.ret)}</span></div>`).join('');out.querySelectorAll('.terminal-line[data-id]').forEach(x=>x.addEventListener('click',()=>selectCall(Number(x.dataset.id))));}
function renderTable(){const body=$('callBody'),q=$('callSearch').value.toLowerCase(),f=$('statusFilter').value;const list=state.calls.filter(c=>(c.name+c.args).toLowerCase().includes(q)&&(f==='all'||(f==='failed'&&c.failed)||(f==='success'&&!c.failed)));if(!list.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;color:#5d7488">No matching system calls.</td></tr>';return;}body.innerHTML=list.map(c=>`<tr data-id="${c.id}"><td>${c.id}</td><td><span class="syscall-name">${esc(c.name)}</span></td><td>${esc(c.args)}</td><td>${esc(c.ret)}</td><td>${c.mode}</td><td>${c.duration} ms</td><td><span class="badge ${c.failed?'failed':''}">${c.failed?'FAILED':'SUCCESS'}</span></td></tr>`).join('');body.querySelectorAll('tr[data-id]').forEach(r=>r.addEventListener('click',()=>selectCall(Number(r.dataset.id))));}
function renderTimeline(){const el=$('timelineList');if(!state.calls.length){el.innerHTML='<p class="muted">Run a trace to see the execution timeline.</p>';return;}el.innerHTML=state.calls.map(c=>`<div class="timeline-item ${c.failed?'failed':''}"><div class="timeline-dot"></div><div class="timeline-content"><div><strong>${esc(c.name)}</strong><small> ${esc(c.args)}</small></div><div><small>${c.duration} ms • return ${esc(c.ret)}</small></div></div></div>`).join('');}
function selectCall(id){const c=state.calls.find(x=>x.id===id);if(!c)return;state.selected=id;const box=$('callDetails');const why=explanations[c.name]||'This call represents a request made by the program to the operating-system kernel.';box.className=`call-details ${c.failed?'error':'success'}`;box.innerHTML=`<div class="result-icon">${c.failed?'!':'✓'}</div><div><strong>${esc(c.name)}(${esc(c.args)})</strong><p><b>Return:</b> ${esc(c.ret)} • <b>Mode:</b> ${c.mode} • <b>Duration:</b> ${c.duration} ms</p><p>${esc(why)} ${c.failed?'The sample trace marks this request as an error.':'After the kernel handles the request, control returns to the application.'}</p></div>`;showPage('tracer');}
function renderAll(){renderTerminal();renderTable();renderTimeline();updateStats();}
function runTrace(){if(state.running)return;state.running=true;$('traceStatus').innerHTML='<span></span> Tracing program...';const command=$('programInput').value.trim()||'./sample_app';state.program=command;const rows=sampleTraces[command]||sampleTraces['./sample_app'];state.calls=[];renderAll();let i=0;const tick=()=>{if(i>=rows.length){state.running=false;$('traceStatus').innerHTML='<span></span> Trace complete';$('snapshotStatus').textContent=`${state.calls.length} system calls captured`;showToast(`Trace complete: ${state.calls.length} calls`);return;}state.calls.push(normalizeTrace([rows[i]])[0]);renderAll();i++;setTimeout(tick,180)};tick();}
function clearTrace(){state.running=false;state.calls=[];state.selected=null;$('traceStatus').innerHTML='<span></span> Ready to trace';$('snapshotStatus').textContent='No trace loaded';renderAll();showToast('Trace cleared');}

const pageTitles={overview:'System Call Tracer & Visualizer','how-it-works':'How a System Call Works',tracer:'System Call Trace Explorer',syscalls:'System Calls in the Trace',timeline:'System Call Execution Timeline',architecture:'User Mode vs Kernel Mode',concepts:'System Call Concept Guide',examples:'Worked System Call Examples',about:'Project Overview'};
function showPage(id,update=true){const valid=document.querySelector(`.page[data-page="${id}"]`)?id:'overview';document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===valid));document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+valid));$('pageTitle').textContent=pageTitles[valid];if(update)history.replaceState(null,'','#'+valid);window.scrollTo({top:0,behavior:'smooth'});}

document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showPage(a.getAttribute('href').slice(1));}));
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{if(a.classList.contains('nav-link'))return;const id=a.getAttribute('href').slice(1);if(document.querySelector(`.page[data-page="${id}"]`)){e.preventDefault();showPage(id);}}));
$('runTraceBtn').addEventListener('click',runTrace);$('clearTraceBtn').addEventListener('click',clearTrace);$('loadSampleTop').addEventListener('click',()=>{loadTrace('./sample_app');showPage('tracer');});document.querySelectorAll('.sample-command').forEach(b=>b.addEventListener('click',()=>{$('programInput').value=b.dataset.command;}));document.querySelectorAll('.try-example').forEach(b=>b.addEventListener('click',()=>{$('programInput').value=b.dataset.command;showPage('tracer');setTimeout(runTrace,180);}));$('callSearch').addEventListener('input',renderTable);$('statusFilter').addEventListener('change',renderTable);window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)||'overview',false));
loadTrace('./sample_app',false);showPage(location.hash.slice(1)||'overview',false);
