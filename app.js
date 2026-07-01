/* =================================================================
   app.js - UI Controller, Role Portal & RAG Graph Animation Engine
   ================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // ===============================================================
  // 1. Initial State & LocalStorage Setup
  // ===============================================================
  let currentUser = null; // Stores currently logged-in user object {name, role}
  let activeTab = "home";
  let activeCodeFile = "agent.py";
  let activeLabSubtab = "visualizer";

  // Persistent user lists & appointment lists
  if (!localStorage.getItem("REGISTERED_PATIENTS")) {
    localStorage.setItem("REGISTERED_PATIENTS", JSON.stringify([]));
  }
  if (!localStorage.getItem("CLINIC_APPOINTMENTS")) {
    localStorage.setItem("CLINIC_APPOINTMENTS", JSON.stringify(INITIAL_APPOINTMENTS));
  }

  // Cache Core UI Elements
  const headerAuthActions = document.getElementById("header-auth-actions");
  const userProfileBadge = document.getElementById("user-profile-badge");
  const profileRole = document.getElementById("profile-role");
  const profileName = document.getElementById("profile-name");
  const logoutBtn = document.getElementById("logout-btn");
  
  const headerBtnLogin = document.getElementById("header-btn-login");
  const headerBtnBook = document.getElementById("header-btn-book");
  const heroBtnRequest = document.getElementById("hero-btn-request");
  
  const navHome = document.getElementById("nav-home");
  const navHealthLibrary = document.getElementById("nav-health-library");
  const navChatbot = document.getElementById("nav-chatbot");
  const navDeveloperLab = document.getElementById("nav-developer-lab");
  
  const tabPanels = document.querySelectorAll(".tab-panel");
  const navLinks = document.querySelectorAll(".nav-link");
  
  // Dashboard panels
  const heroBanner = document.getElementById("hero-banner");
  const promoSection = document.getElementById("innovations");
  const patientDashboard = document.getElementById("patient-dashboard");
  const doctorDashboard = document.getElementById("doctor-dashboard");
  const developerWelcomeDashboard = document.getElementById("developer-welcome-dashboard");
  
  const dashPatientName = document.getElementById("dash-patient-name");
  const dashDoctorName = document.getElementById("dash-doctor-name");
  
  // Auth Modal Elements
  const authModal = document.getElementById("auth-modal");
  const authModalClose = document.getElementById("auth-modal-close");
  const modalTabNewPatient = document.getElementById("modal-tab-new-patient");
  const modalTabRetPatient = document.getElementById("modal-tab-ret-patient");
  const modalTabDoctor = document.getElementById("modal-tab-doctor");
  const modalTabDev = document.getElementById("modal-tab-dev");
  const authForms = document.querySelectorAll(".auth-form");
  const modalTabBtns = document.querySelectorAll(".modal-tab-btn");
  
  // Form elements
  const formNewPatient = document.getElementById("form-new-patient");
  const formRetPatient = document.getElementById("form-ret-patient");
  const formDoctor = document.getElementById("form-doctor");
  const formDev = document.getElementById("form-dev");
  const appointmentForm = document.getElementById("appointment-form");
  
  // Table bodies
  const patientAppointmentsTbody = document.getElementById("patient-appointments-tbody");
  const doctorAppointmentsTbody = document.getElementById("doctor-appointments-tbody");
  
  // Health Library Elements
  const dbSearchInput = document.getElementById("db-search-input");
  const dbSearchBtn = document.getElementById("db-search-btn");
  const dbGrid = document.getElementById("db-grid");

  // Chat Elements
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const suggestionPills = document.querySelectorAll(".faq-pill");
  const chatStatusBadge = document.getElementById("chat-status-badge");
  const traceLogs = document.getElementById("trace-logs");

  // Developer Lab layout toggles
  const labTabBtns = document.querySelectorAll(".lab-tab-btn");
  const labSubpanels = document.querySelectorAll(".lab-subpanel");
  const openVisualizerFromDash = document.getElementById("open-visualizer-from-dash");
  const openCodeFromDash = document.getElementById("open-code-from-dash");
  
  // Code Viewer Elements
  const fileTabs = document.querySelectorAll(".file-tab");
  const fileNameDisplay = document.getElementById("file-name-display");
  const codeDisplay = document.getElementById("code-display");
  const copyBtn = document.getElementById("copy-btn");

  // Logo home click
  document.getElementById("logo-home").addEventListener("click", () => switchTab("home"));

  // ===============================================================
  // 2. Tab Navigation & Portal Swapping
  // ===============================================================
  function switchTab(tabName) {
    activeTab = tabName;
    
    // Manage header navigation links
    navLinks.forEach(link => {
      if (link.dataset.tab === tabName) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Toggle panels
    tabPanels.forEach(panel => {
      if (panel.id === `${tabName}-panel`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    // Special handlers when entering specific tabs
    if (tabName === "health-library") {
      renderHealthLibrary();
    } else if (tabName === "developer-lab") {
      loadCodeFile(activeCodeFile);
    }
    
    // Auto-scroll to top of main view
    document.querySelector("main").scrollTop = 0;
  }

  navLinks.forEach(link => {
    link.addEventListener("click", () => switchTab(link.dataset.tab));
  });

  // Developer sub-navigation tabs
  labTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      labTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const subtab = btn.dataset.subtab;
      activeLabSubtab = subtab;
      
      labSubpanels.forEach(panel => {
        if (panel.id === `lab-${subtab}-subpanel`) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
    });
  });

  // Dash shortcuts for developer
  if (openVisualizerFromDash) {
    openVisualizerFromDash.addEventListener("click", () => {
      switchTab("developer-lab");
      document.querySelector('[data-subtab="visualizer"]').click();
    });
  }
  if (openCodeFromDash) {
    openCodeFromDash.addEventListener("click", () => {
      switchTab("developer-lab");
      document.querySelector('[data-subtab="code"]').click();
    });
  }

  // ===============================================================
  // 3. Authentication & Sessions
  // ===============================================================
  function openAuth(activeSubForm = "new-patient") {
    authModal.classList.add("active");
    // Activate specified sub-form
    modalTabBtns.forEach(btn => {
      if (btn.id === `modal-tab-${activeSubForm}`) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    let targetFormId = "form-new-patient";
    if (activeSubForm === "ret-patient") targetFormId = "form-ret-patient";
    else if (activeSubForm === "doctor") targetFormId = "form-doctor";
    else if (activeSubForm === "dev") targetFormId = "form-dev";

    authForms.forEach(form => {
      if (form.id === targetFormId) {
        form.classList.add("active");
      } else {
        form.classList.remove("active");
      }
    });
  }

  function closeAuth() {
    authModal.classList.remove("active");
    // Clear inputs
    formNewPatient.reset();
    formRetPatient.reset();
    formDoctor.reset();
    formDev.reset();
  }

  headerBtnLogin.addEventListener("click", () => openAuth("ret-patient"));
  headerBtnBook.addEventListener("click", () => {
    if (currentUser && currentUser.role === "patient") {
      switchTab("home");
      document.getElementById("booking-doctor").focus();
    } else {
      openAuth("ret-patient");
    }
  });
  heroBtnRequest.addEventListener("click", () => {
    if (currentUser && currentUser.role === "patient") {
      switchTab("home");
      document.getElementById("booking-doctor").focus();
    } else {
      openAuth("ret-patient");
    }
  });
  authModalClose.addEventListener("click", closeAuth);

  // Tabs toggle inside auth modal
  modalTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      modalTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const formType = btn.id.replace("modal-tab-", "");
      let targetFormId = "form-new-patient";
      if (formType === "ret" || formType === "ret-patient") targetFormId = "form-ret-patient";
      else if (formType === "doctor") targetFormId = "form-doctor";
      else if (formType === "dev") targetFormId = "form-dev";

      authForms.forEach(form => {
        if (form.id === targetFormId) {
          form.classList.add("active");
        } else {
          form.classList.remove("active");
        }
      });
    });
  });

  // Login handler
  function handleLoginSuccess(user) {
    currentUser = user;
    closeAuth();
    
    // Toggle header UI state
    headerAuthActions.classList.add("hidden");
    userProfileBadge.classList.remove("hidden");
    profileName.innerText = user.name;
    
    let displayRole = "Patient";
    if (user.role === "doctor") displayRole = "Physician";
    else if (user.role === "developer") displayRole = "Developer";
    profileRole.innerText = displayRole;

    // Reveal developer lab link if Developer
    if (user.role === "developer") {
      navDeveloperLab.classList.remove("hidden");
    } else {
      navDeveloperLab.classList.add("hidden");
    }

    // Refresh dashboards views on Home Tab
    renderPortalDashboard();
    switchTab("home");
    alertToast(`Successfully logged in as ${user.name}`);
  }

  // New patient registration
  formNewPatient.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    if (!name || !email || !password) return;

    // Fetch existing registered patients
    const patients = JSON.parse(localStorage.getItem("REGISTERED_PATIENTS"));
    
    // Check if patient already exists
    if (patients.find(p => p.name.toLowerCase() === name.toLowerCase()) || MOCK_USERS.find(u => u.name.toLowerCase() === name.toLowerCase() && u.role === "patient")) {
      alert("Name is already taken. Please log in as returning patient or select a different name.");
      return;
    }

    const newPatient = {
      id: Date.now(),
      name: name,
      email: email,
      password: password,
      role: "patient"
    };

    patients.push(newPatient);
    localStorage.setItem("REGISTERED_PATIENTS", JSON.stringify(patients));

    handleLoginSuccess(newPatient);
  });

  // Returning Patient Login
  formRetPatient.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("pat-login-name").value.trim();
    const password = document.getElementById("pat-login-pwd").value.trim();

    // Check pre-coded users first
    let matchedUser = MOCK_USERS.find(
      u => u.name.toLowerCase() === name.toLowerCase() && u.password === password && u.role === "patient"
    );

    // If not found, check registered list
    if (!matchedUser) {
      const registered = JSON.parse(localStorage.getItem("REGISTERED_PATIENTS"));
      matchedUser = registered.find(
        p => p.name.toLowerCase() === name.toLowerCase() && p.password === password
      );
    }

    if (matchedUser) {
      handleLoginSuccess({ name: matchedUser.name, role: "patient" });
    } else {
      alert("Invalid Patient Credentials! For a sample patient, log in as Akshay with password Messi.");
    }
  });

  // Doctor Login
  formDoctor.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("doc-login-name").value.trim();
    const password = document.getElementById("doc-login-pwd").value.trim();

    const matchedUser = MOCK_USERS.find(
      u => u.name.toLowerCase() === name.toLowerCase() && u.password === password && u.role === "doctor"
    );

    if (matchedUser) {
      handleLoginSuccess({ name: matchedUser.name, role: "doctor" });
    } else {
      alert("Invalid Doctor Credentials! Sample: sooraj/mister11, juwel/mister7, Joseph/mister007, or Sourav/Mister44");
    }
  });

  // Developer Login
  formDev.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("dev-login-name").value.trim();
    const password = document.getElementById("dev-login-pwd").value.trim();

    const matchedUser = MOCK_USERS.find(
      u => u.name.toLowerCase() === name.toLowerCase() && u.password === password && u.role === "developer"
    );

    if (matchedUser) {
      handleLoginSuccess({ name: matchedUser.name, role: "developer" });
    } else {
      alert("Invalid Developer Credentials! Sample: name: charles babbage, password: computer");
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    currentUser = null;
    headerAuthActions.classList.remove("hidden");
    userProfileBadge.classList.add("hidden");
    navDeveloperLab.classList.add("hidden");
    
    // Restore home page sections
    heroBanner.classList.remove("hidden");
    promoSection.classList.remove("hidden");
    
    // Hide all dashboards
    patientDashboard.classList.add("hidden");
    doctorDashboard.classList.add("hidden");
    developerWelcomeDashboard.classList.add("hidden");
    
    switchTab("home");
    alertToast("Logged out successfully.");
  });

  // ===============================================================
  // 4. Portal Dashboard Renderers (Home Tab Subviews)
  // ===============================================================
  function renderPortalDashboard() {
    // Hide standard promo blocks if logged in
    if (currentUser) {
      heroBanner.classList.add("hidden");
      promoSection.classList.add("hidden");
      
      patientDashboard.classList.add("hidden");
      doctorDashboard.classList.add("hidden");
      developerWelcomeDashboard.classList.add("hidden");
      
      if (currentUser.role === "patient") {
        patientDashboard.classList.remove("hidden");
        dashPatientName.innerText = currentUser.name;
        renderPatientAppointments();
      } else if (currentUser.role === "doctor") {
        doctorDashboard.classList.remove("hidden");
        dashDoctorName.innerText = `Dr. ${currentUser.name.charAt(0).toUpperCase() + currentUser.name.slice(1)}`;
        renderDoctorAppointments();
      } else if (currentUser.role === "developer") {
        developerWelcomeDashboard.classList.remove("hidden");
      }
    } else {
      heroBanner.classList.remove("hidden");
      promoSection.classList.remove("hidden");
      patientDashboard.classList.add("hidden");
      doctorDashboard.classList.add("hidden");
      developerWelcomeDashboard.classList.add("hidden");
    }
  }

  // Patient appointment submission
  appointmentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== "patient") return;

    const docSelect = document.getElementById("booking-doctor");
    const doctorVal = docSelect.value;
    const doctorName = docSelect.options[docSelect.selectedIndex].text;
    const dateVal = document.getElementById("booking-date").value;
    const timeVal = document.getElementById("booking-time").value;
    const reasonVal = document.getElementById("booking-reason").value.trim();

    if (!doctorVal || !dateVal || !timeVal || !reasonVal) return;

    const appointments = JSON.parse(localStorage.getItem("CLINIC_APPOINTMENTS"));
    const newAppointment = {
      id: 200 + appointments.length,
      patientName: currentUser.name,
      doctorName: doctorVal, // e.g. 'sooraj' or 'juwel'
      date: dateVal,
      time: timeVal,
      reason: reasonVal,
      status: "Pending" // Starts as Pending approval from doctor
    };

    appointments.push(newAppointment);
    localStorage.setItem("CLINIC_APPOINTMENTS", JSON.stringify(appointments));

    // Reset Form
    appointmentForm.reset();
    renderPatientAppointments();
    alertToast("Appointment request submitted successfully. Status is Pending approval.");
  });

  // Render appointments booked by the patient
  function renderPatientAppointments() {
    patientAppointmentsTbody.innerHTML = "";
    const appointments = JSON.parse(localStorage.getItem("CLINIC_APPOINTMENTS"));
    const myBookings = appointments.filter(
      app => app.patientName.toLowerCase() === currentUser.name.toLowerCase()
    );

    if (myBookings.length === 0) {
      patientAppointmentsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No appointments booked yet.</td></tr>`;
      return;
    }

    myBookings.forEach(booking => {
      const row = document.createElement("tr");
      let docNameReadable = "";
      if (booking.doctorName === "sooraj") docNameReadable = "Dr. Sooraj (Cardiology)";
      else if (booking.doctorName === "juwel") docNameReadable = "Dr. Juwel (Pediatrics)";
      else if (booking.doctorName === "Joseph") docNameReadable = "Dr. Joseph (Neurology)";
      else if (booking.doctorName === "Sourav") docNameReadable = "Dr. Sourav (Infectious Diseases)";
      else docNameReadable = `Dr. ${booking.doctorName.charAt(0).toUpperCase() + booking.doctorName.slice(1)}`;
      
      row.innerHTML = `
        <td>#${booking.id}</td>
        <td>${docNameReadable}</td>
        <td>${booking.date}</td>
        <td>${booking.time}</td>
        <td title="${booking.reason}">${booking.reason.length > 30 ? booking.reason.slice(0, 30) + "..." : booking.reason}</td>
        <td><span class="status-badge ${booking.status.toLowerCase() === 'confirmed' ? 'confirmed' : 'pending'}">${booking.status}</span></td>
      `;
      patientAppointmentsTbody.appendChild(row);
    });
  }

  // Render appointments for the logged-in doctor
  function renderDoctorAppointments() {
    doctorAppointmentsTbody.innerHTML = "";
    const appointments = JSON.parse(localStorage.getItem("CLINIC_APPOINTMENTS"));
    
    // Filter appointments for currently logged-in doctor name
    const myPatients = appointments.filter(
      app => app.doctorName.toLowerCase() === currentUser.name.toLowerCase()
    );

    if (myPatients.length === 0) {
      doctorAppointmentsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No consultations scheduled.</td></tr>`;
      return;
    }

    myPatients.forEach(booking => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>#${booking.id}</td>
        <td><strong>${booking.patientName}</strong></td>
        <td>Dr. ${booking.doctorName.charAt(0).toUpperCase() + booking.doctorName.slice(1)}</td>
        <td>${booking.date}</td>
        <td>${booking.time}</td>
        <td title="${booking.reason}">${booking.reason}</td>
        <td>
          <span class="status-badge ${booking.status.toLowerCase() === 'confirmed' ? 'confirmed' : (booking.status.toLowerCase() === 'canceled' ? 'canceled' : 'pending')}">${booking.status}</span>
          ${booking.status === 'Pending' ? `<button class="table-action-btn confirm-appt-btn" data-id="${booking.id}" style="background-color: var(--color-emerald); margin-left: 0.5rem;" title="Confirm appointment">Confirm</button>` : ''}
          ${booking.status !== 'Canceled' ? `<button class="table-action-btn delete-appt-btn" data-id="${booking.id}" style="margin-left: 0.5rem;" title="Cancel appointment">Cancel</button>` : ''}
        </td>
      `;
      
      // Wire confirm appt button if present
      const confirmBtn = row.querySelector(".confirm-appt-btn");
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          confirmAppointment(booking.id);
        });
      }
      
      // Wire delete appt button if present
      const deleteBtn = row.querySelector(".delete-appt-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          cancelAppointment(booking.id);
        });
      }

      doctorAppointmentsTbody.appendChild(row);
    });
  }

  // Doctor confirming appointment
  function confirmAppointment(id) {
    let appointments = JSON.parse(localStorage.getItem("CLINIC_APPOINTMENTS"));
    const appt = appointments.find(app => app.id === id);
    if (appt) {
      appt.status = "Confirmed";
    }
    localStorage.setItem("CLINIC_APPOINTMENTS", JSON.stringify(appointments));
    renderDoctorAppointments();
    alertToast("Appointment confirmed successfully.");
  }

  // Doctor canceling appointment
  function cancelAppointment(id) {
    let appointments = JSON.parse(localStorage.getItem("CLINIC_APPOINTMENTS"));
    const appt = appointments.find(app => app.id === id);
    if (appt) {
      appt.status = "Canceled";
    }
    localStorage.setItem("CLINIC_APPOINTMENTS", JSON.stringify(appointments));
    renderDoctorAppointments();
    alertToast("Appointment cancelled successfully.");
  }

  // ===============================================================
  // 5. Health Library Search & Renderer
  // ===============================================================
  function renderHealthLibrary(results = []) {
    dbGrid.innerHTML = "";
    
    const hasSearch = results.length > 0;
    const cardsToDisplay = hasSearch 
      ? results 
      : MEDICAL_FAQ_DATABASE.map(doc => ({ ...doc, score: 0 }));

    cardsToDisplay.forEach(doc => {
      const card = document.createElement("div");
      card.className = "db-card";
      if (hasSearch && doc.score > 0) {
        card.classList.add("highlighted");
      }

      // Generate Sparkline Bars for visual representation of vector embeddings
      let sparklineHtml = "";
      doc.vector.forEach(val => {
        const heightPercent = Math.round(Math.abs(val) * 100);
        const directionClass = val < 0 ? "negative" : "";
        sparklineHtml += `<div class="vector-bar ${directionClass}" style="height: ${heightPercent}%" title="Dim value: ${val}"></div>`;
      });

      card.innerHTML = `
        <div class="db-card-meta">
          <span class="db-category">${doc.category}</span>
          <span class="db-source-text">${doc.source} (p. ${doc.page})</span>
        </div>
        <div class="db-card-content">
          <h3>${doc.title}</h3>
          <p>${doc.content}</p>
        </div>
        <div class="db-card-vector">
          <span class="vector-label">FAISS Embedded Vector (8d pseudo):</span>
          <div class="vector-sparkline">
            ${sparklineHtml}
          </div>
        </div>
        <div class="db-card-score">
          <span class="score-num">${hasSearch ? doc.score.toFixed(3) : "0.000"}</span>
          <span class="score-lbl">Similarity</span>
        </div>
      `;
      dbGrid.appendChild(card);
    });
  }

  // Health Library search triggered
  function runLibrarySearch() {
    const query = dbSearchInput.value.trim();
    if (!query) {
      renderHealthLibrary();
      return;
    }
    const results = searchEngine.search(query, 8); // search all matches
    renderHealthLibrary(results);
  }

  dbSearchBtn.addEventListener("click", runLibrarySearch);
  dbSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") runLibrarySearch();
  });

  // ===============================================================
  // 6. AI Assistant & LangGraph RAG Simulator
  // ===============================================================
  function addMessage(sender, text) {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgElement = document.createElement("div");
    msgElement.className = `message ${sender}`;
    
    const formattedText = text.replace(/\n/g, "<br>");
    
    msgElement.innerHTML = `
      <div class="message-bubble">${formattedText}</div>
      <span class="msg-meta">${sender === 'user' ? 'Patient' : 'AI Assistant'} • ${timeString}</span>
    `;
    
    chatMessages.appendChild(msgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addSystemLog(text, type = "system") {
    const log = document.createElement("div");
    log.className = `log-entry ${type}`;
    
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    log.innerHTML = `<span style="color: var(--text-muted)">[${timestamp}]</span> ${text}`;
    
    traceLogs.appendChild(log);
    traceLogs.scrollTop = traceLogs.scrollHeight;
  }

  // Visualizer Animation Graph Triggers
  function setNodeState(nodeId, state) {
    const node = document.getElementById(`node-${nodeId}`);
    if (!node) return;
    
    node.classList.remove("active", "completed");
    if (state === "active") {
      node.classList.add("active");
    } else if (state === "completed") {
      node.classList.add("completed");
    }
  }

  function setEdgeState(edgeId, state) {
    const edge = document.getElementById(`edge-${edgeId}`);
    const arrow = document.getElementById(`arrow-${edgeId}`);
    
    if (edge) {
      if (state === "active") edge.classList.add("active");
      else edge.classList.remove("active");
    }
    if (arrow) {
      if (state === "active") arrow.classList.add("active");
      else arrow.classList.remove("active");
    }
  }

  function resetGraphVisuals() {
    const nodes = ["start", "langdetect", "planner", "retriever", "answerer", "end"];
    nodes.forEach(n => setNodeState(n, "inactive"));
    
    const edges = ["start-lang", "lang-plan", "plan-retrieve", "plan-direct", "retrieve-answer", "answer-end"];
    edges.forEach(e => setEdgeState(e, "inactive"));
  }

  // Simulate LangGraph execution path
  async function runLangGraphSimulation(query) {
    return new Promise(async (resolve) => {
      resetGraphVisuals();
      addSystemLog("--- Starting LangGraph StateGraph Execution ---", "system");
      addSystemLog(`[state] Initial State query: "${query}"`, "system");
      
      chatStatusBadge.innerText = "Status: Starting Agent Graph...";
      chatStatusBadge.style.color = "var(--mayo-blue)";

      // 1. START NODE
      setNodeState("start", "active");
      addSystemLog("Entering Node: __start__", "node");
      await delay(450);
      setNodeState("start", "completed");
      setEdgeState("start-lang", "active");
      await delay(200);

      // 2. DETECT LANGUAGE NODE
      setEdgeState("start-lang", "inactive");
      setNodeState("langdetect", "active");
      chatStatusBadge.innerText = "Status: Detecting Language...";
      addSystemLog("Entering Node: detect_language", "node");
      await delay(600);
      addSystemLog("[lang] Input query language detected: English (en)", "system");
      setNodeState("langdetect", "completed");
      setEdgeState("lang-plan", "active");
      await delay(200);

      // 3. PLANNER NODE
      setEdgeState("lang-plan", "inactive");
      setNodeState("planner", "active");
      chatStatusBadge.innerText = "Status: Routing Query...";
      chatStatusBadge.style.color = "var(--mayo-blue)";
      addSystemLog("Entering Node: planner", "node");
      await delay(700);

      // Call our client search engine to decide routing (retrieve vs. direct)
      const results = searchEngine.search(query, 2);
      const requiresRetrieval = results.length > 0 && results[0].score > 0.15;
      const decision = requiresRetrieval ? "retrieve" : "answer_direct";
      
      addSystemLog(`[planner] LLM routing decision: "${decision}"`, "system");
      setNodeState("planner", "completed");
      
      let finalAnswer = "";

      if (requiresRetrieval) {
        // Retrieve Path
        setEdgeState("plan-retrieve", "active");
        addSystemLog("[planner] Conditional edge routed to: retriever", "route-retrieve");
        await delay(300);
        
        // 4. RETRIEVER NODE
        setEdgeState("plan-retrieve", "inactive");
        setNodeState("retriever", "active");
        chatStatusBadge.innerText = "Status: Querying FAISS Database...";
        chatStatusBadge.style.color = "var(--color-emerald)";
        addSystemLog("Entering Node: retriever", "node");
        await delay(800);
        
        results.forEach((doc) => {
          addSystemLog(`[retriever] FAISS score: ${doc.score.toFixed(3)} | Doc: "${doc.title}"`, "db-hit");
        });
        
        setNodeState("retriever", "completed");
        setEdgeState("retrieve-answer", "active");
        await delay(200);
        
        // 5. ANSWERER NODE (RAG Context)
        setEdgeState("retrieve-answer", "inactive");
        setNodeState("answerer", "active");
        chatStatusBadge.innerText = "Status: Synthesizing RAG Response...";
        chatStatusBadge.style.color = "var(--mayo-light-blue)";
        addSystemLog("Entering Node: answerer (RAG mode)", "node");
        await delay(900);
        
        const topDoc = results[0];
        finalAnswer = `According to our medical library records (${topDoc.source}):\n\n${topDoc.content}\n\nIs there anything else I can help you with regarding this condition?`;
        
        setNodeState("answerer", "completed");
        setEdgeState("answer-end", "active");
      } else {
        // Direct Path
        setEdgeState("plan-direct", "active");
        addSystemLog("[planner] Conditional edge routed to: answerer", "route-direct");
        await delay(300);
        
        // 5. ANSWERER NODE (Direct response)
        setEdgeState("plan-direct", "inactive");
        setNodeState("answerer", "active");
        chatStatusBadge.innerText = "Status: Generating Response...";
        chatStatusBadge.style.color = "var(--mayo-light-blue)";
        addSystemLog("Entering Node: answerer (Direct mode)", "node");
        await delay(800);
        
        finalAnswer = getConversationalResponse(query);
        
        setNodeState("answerer", "completed");
        setEdgeState("answer-end", "active");
      }

      await delay(200);
      setEdgeState("answer-end", "inactive");
      setNodeState("end", "active");
      addSystemLog("Entering Node: __end__", "node");
      await delay(300);
      setNodeState("end", "completed");
      
      chatStatusBadge.innerText = "Status: Response Ready";
      chatStatusBadge.style.color = "var(--color-emerald)";
      
      addSystemLog("--- LangGraph Execution Finished successfully ---", "system");
      
      setTimeout(() => {
        chatStatusBadge.innerText = "Status: Ready";
        chatStatusBadge.style.color = "var(--text-muted)";
      }, 2500);
      
      resolve(finalAnswer);
    });
  }

  // Direct conversations database matches
  function getConversationalResponse(query) {
    const q = query.toLowerCase();
    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
      return "Hello! I am your personal JRJS Hospital clinical assistant. I can answer questions about common medical conditions (such as Hypertension or Diabetes), symptoms (such as fever), prep guidelines, or help you schedule a consultation with our doctors. How can I help you today?";
    } else if (q.includes("thank") || q.includes("appreciate")) {
      return "You're very welcome! Let me know if you have any other questions. Have a healthy day!";
    } else if (q.includes("bye") || q.includes("quit") || q.includes("exit")) {
      return "Goodbye! Thank you for contacting JRJS Hospital. Take care!";
    } else if (q.includes("who are you") || q.includes("what is your name")) {
      return "I am the JRJS Hospital AI assistant, built to guide patients through clinical FAQs, disease library lookups, and appointment redirections.";
    } else {
      return "I do not have specific clinical documents matching your query in my local database, but I can help you direct this query to a doctor. Please contact our main receptionist desk at (555) 0199 for scheduling or further medical advice.";
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Handle message sending
  async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.value = "";
    chatInput.disabled = true;
    sendBtn.disabled = true;
    suggestionPills.forEach(p => p.style.pointerEvents = "none");

    addMessage("user", text);

    // CHECK FOR APPOINTMENT BOOKING TRIGGER
    const isBookingRequest = /book|appointment|schedule|doctor|consultation/i.test(text);

    if (isBookingRequest) {
      chatStatusBadge.innerText = "Status: Redirecting to booking flow...";
      chatStatusBadge.style.color = "var(--mayo-light-blue)";
      await delay(1000);
      
      addMessage("bot", "Certainly! I am redirecting you to our appointment scheduling system on the Home page. Please fill out the booking form there.");
      await delay(1200);

      // Re-enable chat inputs
      chatInput.disabled = false;
      sendBtn.disabled = false;
      suggestionPills.forEach(p => p.style.pointerEvents = "auto");

      // SWITCH TO HOME TAB
      switchTab("home");
      
      // If logged in, scroll and focus booking form
      if (currentUser && currentUser.role === "patient") {
        document.getElementById("booking-doctor").focus();
        document.getElementById("booking-doctor").scrollIntoView({ behavior: "smooth" });
      } else {
        // If guest, open Patient Returning login by default
        openAuth("ret-patient");
      }
      return;
    }
    
    // Otherwise run LangGraph animation and retrieve standard FAQ response
    const botAnswer = await runLangGraphSimulation(text);
    
    addMessage("bot", botAnswer);

    // Re-enable inputs
    chatInput.disabled = false;
    sendBtn.disabled = false;
    suggestionPills.forEach(p => p.style.pointerEvents = "auto");
    chatInput.focus();
  }

  sendBtn.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSendMessage();
  });

  // Wire suggestion pills
  suggestionPills.forEach(pill => {
    pill.addEventListener("click", () => {
      chatInput.value = pill.innerText;
      handleSendMessage();
    });
  });

  // ===============================================================
  // 7. Developer Code Viewer Operations
  // ===============================================================
  function loadCodeFile(fileName) {
    activeCodeFile = fileName;
    
    // Update active tab styles in Sidebar
    fileTabs.forEach(tab => {
      if (tab.dataset.file === fileName) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    fileNameDisplay.innerText = fileName;
    const code = PYTHON_CODE_TEMPLATES[fileName];
    
    // Syntax highlighting replacements
    let highlightedCode = escapeHtml(code)
      .replace(/(# .*)/g, '<span style="color: #64748b; font-style: italic;">$1</span>')
      .replace(/\b(def|class|import|from|return|if|elif|else|while|try|except|lambda|in|is|and|or|not|with|as)\b/g, '<span style="color: #f43f5e; font-weight: 500;">$1</span>')
      .replace(/\b(StateGraph|END|ChatGroq|FAISS|HuggingFaceEmbeddings|BaseModel|Field|Document|MedicalChatState)\b/g, '<span style="color: #a5b4fc; font-weight: 500;">$1</span>')
      .replace(/(["'].*?["'])/g, '<span style="color: #34d399;">$1</span>')
      .replace(/\b(print|ask_assistant|invoke|set_entry_point|add_node|add_edge|add_conditional_edges|compile|similarity_search_with_score|from_documents|save_local|load_local)\b/g, '<span style="color: #38bdf8;">$1</span>');

    codeDisplay.innerHTML = highlightedCode;
    copyBtn.innerText = "Copy Code";
    copyBtn.classList.remove("copied");
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  fileTabs.forEach(tab => {
    tab.addEventListener("click", () => loadCodeFile(tab.dataset.file));
  });

  // Copy Code to Clipboard
  copyBtn.addEventListener("click", () => {
    const rawCode = PYTHON_CODE_TEMPLATES[activeCodeFile];
    navigator.clipboard.writeText(rawCode).then(() => {
      copyBtn.innerText = "✓ Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.innerText = "Copy Code";
        copyBtn.classList.remove("copied");
      }, 2500);
    }).catch(err => {
      console.error("Failed to copy text: ", err);
    });
  });

  // Toast Utility
  function alertToast(msg) {
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.background = "rgba(0, 90, 156, 0.95)";
    toast.style.color = "white";
    toast.style.padding = "0.75rem 1.5rem";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    toast.style.zIndex = "1000";
    toast.style.fontFamily = "Outfit, sans-serif";
    toast.style.fontSize = "0.9rem";
    toast.style.backdropFilter = "blur(8px)";
    toast.style.border = "1px solid rgba(255,255,255,0.2)";
    toast.style.animation = "slideInUp 0.3s forwards";
    toast.innerText = msg;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = "fadeIn 0.3s reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ===============================================================
  // 8. Initialize App State
  // ===============================================================
  switchTab("home");
  renderPortalDashboard();
  addSystemLog("JRJS Hospital clinical portal initialized.", "system");
  addSystemLog("LangGraph RAG simulation engine online.", "system");
});
