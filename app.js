/* =================================================================
   app.js - UI Controller & RAG Graph Animation Engine
   ================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // States
  let currentRole = "invigilator"; // Default to invigilator so they see the full power first
  let activeTab = "assistant";
  let activeCodeFile = "agent.py";

  // Cache Elements
  const rolePatientBtn = document.getElementById("role-patient");
  const roleInvigilatorBtn = document.getElementById("role-invigilator");
  const assistantGrid = document.querySelector(".assistant-grid");
  const tabLinks = document.querySelectorAll(".tab-link");
  const tabPanels = document.querySelectorAll(".tab-panel");
  
  // Chat elements
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const suggestionPills = document.querySelectorAll(".faq-pill");
  
  // Trace log elements
  const traceLogs = document.getElementById("trace-logs");
  
  // DB tab elements
  const dbSearchInput = document.getElementById("db-search-input");
  const dbSearchBtn = document.getElementById("db-search-btn");
  const dbGrid = document.getElementById("db-grid");
  
  // Code tab elements
  const fileTabs = document.querySelectorAll(".file-tab");
  const fileNameDisplay = document.getElementById("file-name-display");
  const codeDisplay = document.getElementById("code-display");
  const copyBtn = document.getElementById("copy-btn");

  // ===============================================================
  // 1. Role Toggle & Access Control
  // ===============================================================
  function setRole(role) {
    currentRole = role;
    
    if (role === "patient") {
      rolePatientBtn.classList.add("active");
      roleInvigilatorBtn.classList.remove("active");
      assistantGrid.classList.add("patient-view");
      
      // Gray out advanced tabs in navigation
      document.getElementById("tab-link-database").classList.add("restricted");
      document.getElementById("tab-link-code").classList.add("restricted");
      
      // If we are currently on a restricted tab, go back to assistant
      if (activeTab === "database" || activeTab === "code") {
        switchTab("assistant");
      }
      
      addSystemLog("System switched to Patient View. Developer console and visualizer hidden.");
    } else {
      roleInvigilatorBtn.classList.add("active");
      rolePatientBtn.classList.remove("active");
      assistantGrid.classList.remove("patient-view");
      
      // Restore advanced tabs
      document.getElementById("tab-link-database").classList.remove("restricted");
      document.getElementById("tab-link-code").classList.remove("restricted");
      
      addSystemLog("System switched to Owner/Invigilator View. Developer console and visualizer unlocked.");
    }
  }

  rolePatientBtn.addEventListener("click", () => setRole("patient"));
  roleInvigilatorBtn.addEventListener("click", () => setRole("invigilator"));

  // ===============================================================
  // 2. Tab Switcher
  // ===============================================================
  function switchTab(tabName) {
    // Check if restricted in patient mode
    if (currentRole === "patient" && (tabName === "database" || tabName === "code")) {
      // Auto upgrade role to show developer features
      alertToast("Restricted Area: Toggling to Owner/Invigilator mode to view project database and code.");
      setRole("invigilator");
    }

    activeTab = tabName;
    
    // Update Tab Links Active State
    tabLinks.forEach(link => {
      if (link.dataset.tab === tabName) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Show/Hide Panels
    tabPanels.forEach(panel => {
      if (panel.id === `${tabName}-panel`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    // Special renders when entering tabs
    if (tabName === "database") {
      renderDatabaseCards();
    } else if (tabName === "code") {
      loadCodeFile(activeCodeFile);
    }
  }

  tabLinks.forEach(link => {
    link.addEventListener("click", () => switchTab(link.dataset.tab));
  });

  // Custom alert toast utility
  function alertToast(msg) {
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.background = "rgba(13, 148, 136, 0.9)";
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
  // 3. Vector Database Tab Operations
  // ===============================================================
  function renderDatabaseCards(searchResults = []) {
    dbGrid.innerHTML = "";
    
    // If no search results are provided, display all cards with 0 score
    const hasSearch = searchResults.length > 0;
    const cardsToDisplay = hasSearch 
      ? searchResults 
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
          <span class="vector-label">Embedding Vector (pseudo 8d float):</span>
          <div class="vector-sparkline">
            ${sparklineHtml}
          </div>
        </div>
        <div class="db-card-score">
          <span class="score-num">${hasSearch ? doc.score.toFixed(3) : "0.000"}</span>
          <span class="score-lbl">Cosine Sim</span>
        </div>
      `;
      dbGrid.appendChild(card);
    });
  }

  // Run Cosine Similarity search from DB search bar
  function runDbSearch() {
    const query = dbSearchInput.value.trim();
    if (!query) {
      renderDatabaseCards();
      return;
    }
    const results = searchEngine.search(query, 8); // search all
    renderDatabaseCards(results);
  }

  dbSearchBtn.addEventListener("click", runDbSearch);
  dbSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") runDbSearch();
  });

  // ===============================================================
  // 4. Code Viewer Tab Operations
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
    
    // Clean escape code rendering
    const code = PYTHON_CODE_TEMPLATES[fileName];
    
    // Quick syntax highlighting (rough client-side replacement for colors)
    let highlightedCode = escapeHtml(code)
      .replace(/(# .*)/g, '<span style="color: #64748b; font-style: italic;">$1</span>')
      .replace(/\b(def|class|import|from|return|if|elif|else|while|try|except|lambda|in|is|and|or|not|with|as)\b/g, '<span style="color: #f43f5e; font-weight: 500;">$1</span>')
      .replace(/\b(StateGraph|END|ChatGroq|FAISS|HuggingFaceEmbeddings|BaseModel|Field|Document|MedicalChatState)\b/g, '<span style="color: #a5b4fc; font-weight: 500;">$1</span>')
      .replace(/(["'].*?["'])/g, '<span style="color: #34d399;">$1</span>')
      .replace(/\b(print|ask_assistant|invoke|set_entry_point|add_node|add_edge|add_conditional_edges|compile|similarity_search_with_score|from_documents|save_local|load_local)\b/g, '<span style="color: #38bdf8;">$1</span>');

    codeDisplay.innerHTML = highlightedCode;
    
    // Reset copy button state
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

  // ===============================================================
  // 5. Chat & LangGraph RAG Simulation Engine
  // ===============================================================
  function addMessage(sender, text) {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgElement = document.createElement("div");
    msgElement.className = `message ${sender}`;
    
    // Format text lines nicely
    const formattedText = text.replace(/\n/g, "<br>");
    
    msgElement.innerHTML = `
      <div class="message-bubble">${formattedText}</div>
      <span class="msg-meta">${sender === 'user' ? 'Patient' : 'MediGraph Agent'} • ${timeString}</span>
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

      // 1. START NODE
      setNodeState("start", "active");
      addSystemLog("Entering Node: __start__", "node");
      await delay(400);
      setNodeState("start", "completed");
      setEdgeState("start-lang", "active");
      await delay(200);

      // 2. DETECT LANGUAGE NODE
      setEdgeState("start-lang", "inactive");
      setNodeState("langdetect", "active");
      addSystemLog("Entering Node: detect_language", "node");
      await delay(600);
      // Simulate langdetect
      addSystemLog("[lang] Input query language detected: English (en)", "system");
      setNodeState("langdetect", "completed");
      setEdgeState("lang-plan", "active");
      await delay(200);

      // 3. PLANNER NODE
      setEdgeState("lang-plan", "inactive");
      setNodeState("planner", "active");
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
        addSystemLog("Entering Node: retriever", "node");
        await delay(800);
        
        // List retrieved documents in trace log
        results.forEach((doc, idx) => {
          addSystemLog(`[retriever] FAISS score: ${doc.score.toFixed(3)} | Doc: "${doc.title}" (Page ${doc.page})`, "db-hit");
        });
        
        setNodeState("retriever", "completed");
        setEdgeState("retrieve-answer", "active");
        await delay(200);
        
        // 5. ANSWERER NODE (with RAG Context)
        setEdgeState("retrieve-answer", "inactive");
        setNodeState("answerer", "active");
        addSystemLog("Entering Node: answerer (RAG mode)", "node");
        await delay(900);
        
        const topDoc = results[0];
        finalAnswer = `According to our clinical records (${topDoc.source}, page ${topDoc.page}):\n\n${topDoc.content}\n\nIs there anything else I can assist you with regarding this matter?`;
        
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
        addSystemLog("Entering Node: answerer (Direct mode)", "node");
        await delay(800);
        
        // Synthesize direct general answer
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
      
      addSystemLog("--- LangGraph Execution Finished successfully ---", "system");
      resolve(finalAnswer);
    });
  }

  // Direct conversations database matches
  function getConversationalResponse(query) {
    const q = query.toLowerCase();
    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
      return "Hello! I am your clinical RAG assistant. I can answer questions about fasting, appointment bookings, cancellation policies, billing, and general symptoms. How can I help you today?";
    } else if (q.includes("thank") || q.includes("appreciate")) {
      return "You're very welcome! Let me know if you have any other questions. Have a healthy day!";
    } else if (q.includes("bye") || q.includes("quit") || q.includes("exit")) {
      return "Goodbye! Thank you for contacting our clinic. Take care!";
    } else if (q.includes("who are you") || q.includes("what is your name")) {
      return "I am MediGraph, a clinical assistant powered by LangGraph, Groq, and a FAISS knowledge base index.";
    } else {
      return "I do not have specific clinical documents matching your query in my local database, but I can help you direct this query to a doctor. Please contact our main receptionist desk at (555) 0199 for scheduling or further medical advice.";
    }
  }

  // Delay helper
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Handle message sending
  async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Disable inputs during RAG query running
    chatInput.value = "";
    chatInput.disabled = true;
    sendBtn.disabled = true;
    suggestionPills.forEach(p => p.style.pointerEvents = "none");

    addMessage("user", text);
    
    // Run LangGraph animation and retrieve response
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
  // 6. Initialize App State
  // ===============================================================
  setRole("invigilator"); // Unlock everything initially so developer checks work out-of-the-box
  switchTab("assistant");
  addSystemLog("MediGraph RAG System initialized.", "system");
  addSystemLog("LangGraph visualizer loaded successfully. Waiting for patient query...", "system");
});
