// Pre-coded Python implementation scripts for the Medical RAG assistant.
// Rendered inside the Code tab with a clean copy-paste option.

const PYTHON_CODE_TEMPLATES = {
  "agent.py": `# =================================================================
# agent.py - Medical Appointment RAG Assistant Agent
# Implements LangGraph StateGraph Routing, ChatGroq, and FAISS RAG
# =================================================================

import os
import textwrap
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from google.colab import userdata

# LangGraph & LangChain
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

# Load API key (for Groq)
# Export your GROQ_API_KEY before running, e.g., export GROQ_API_KEY=gsk_...
groq_api_key = os.environ.get("GROQ_API_KEY") or userdata.get("GROQ_API_KEY")

if not groq_api_key:
    raise ValueError("Please set your GROQ_API_KEY environment variable.")

# -----------------------------------------------------------------
# 1. LANGGRAPH STATE SCHEMA
# -----------------------------------------------------------------
class MedicalChatState(BaseModel):
    query: str = Field(..., description="The user's query or medical question")
    action: Optional[str] = Field(None, description="The routing action decided by the planner")
    docs: Optional[List[Dict[str, Any]]] = Field(None, description="Retrieved passages from FAISS vector store")
    answer: Optional[str] = Field(None, description="Final synthesised answer from the LLM")

# -----------------------------------------------------------------
# 2. VECTOR STORE & LLM INITIALISATION
# -----------------------------------------------------------------
# Load FAISS index (assuming created by db_setup.py)
print("[system] Loading FAISS vector store database...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db = FAISS.load_local("medical_faiss_index", embeddings, allow_dangerous_deserialization=True)

# Initialize ChatGroq LLM
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    temperature=0.1,
    groq_api_key=groq_api_key
)

# -----------------------------------------------------------------
# 3. SYSTEM PROMPTS
# -----------------------------------------------------------------
PLANNER_SYSTEM_PROMPT = textwrap.dedent("""\\
    You are an intelligent clinical query router for a medical clinic assistant.
    Analyze the user's input and decide whether it requires retrieving specific documents from the clinical FAQ database (action = "retrieve") or if it's general greetings, simple chat, or off-topic (action = "answer_direct").

    Rules:
    - If the user asks about: fasting rules, ultrasound preparation, booking pediatric visits, cancellation policies, co-pays, insurance accepted, registration requirements, or prescription refills -> reply "retrieve".
    - If the user greets you, asks "who are you", asks general off-topic questions, or says goodbye -> reply "answer_direct".

    Reply with ONLY one of these two words, nothing else:
    retrieve
    answer_direct
""")

ANSWERER_SYSTEM_PROMPT = textwrap.dedent("""\\
    You are a compassionate, professional Medical Reception and FAQ Assistant.
    Your job is to answer the patient's questions accurately using the provided clinical context passages.

    Guidelines:
    - State information clearly, concisely, and with empathy.
    - If the provided context contains the answer, use it as your primary source. Mention page numbers or document names if available.
    - If the context does not contain enough information to answer the question, state politely: "I do not have that specific clinical information in my knowledge base. Please contact our main reception desk at (555) 0199 for assistance."
    - DO NOT make up policies, prices, fees, fasting times, or medical requirements.
""")

# -----------------------------------------------------------------
# 4. LANGGRAPH NODES
# -----------------------------------------------------------------
def node_planner(state: MedicalChatState) -> MedicalChatState:
    """Invokes LLM to route the query."""
    print("\\n[planner] Routing query: " + state.query)
    
    # Simple direct system/user completion call
    messages = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {"role": "user", "content": f"User Query: {state.query}"}
    ]
    response = llm.invoke(messages)
    decision = response.content.strip().lower()
    
    state.action = "retrieve" if "retrieve" in decision else "answer_direct"
    print(f"[planner] Selected routing: {state.action}")
    return state

def node_retrieve(state: MedicalChatState) -> MedicalChatState:
    """Queries the local FAISS index for relevant documents."""
    print("[retriever] Searching FAISS Vector Store...")
    
    # Retrieve top 2 matches
    docs_retrieved = db.similarity_search_with_score(state.query, k=2)
    
    formatted_docs = []
    for doc, score in docs_retrieved:
        formatted_docs.append({
            "text": doc.page_content,
            "category": doc.metadata.get("category", "General"),
            "source": doc.metadata.get("source", "Unknown"),
            "page": doc.metadata.get("page", 0),
            "score": float(score)
        })
        print(f"[retriever] Hit found in {doc.metadata.get('source')} (Score: {score:.3f})")
        
    state.docs = formatted_docs
    return state

def node_answer(state: MedicalChatState) -> MedicalChatState:
    """Formulates the final answer using context or direct response."""
    print("[answerer] Formulating answer...")
    
    if state.docs:
        # Context RAG response
        passages = "\\n\\n".join([
            f"[Source: {d['source']} | Page {d['page']}]\\n{d['text']}"
            for d in state.docs
        ])
        user_prompt = f"Context excerpts:\\n{passages}\\n\\nQuestion:\\n{state.query}"
        system_prompt = ANSWERER_SYSTEM_PROMPT
    else:
        # Direct fallback response
        user_prompt = state.query
        system_prompt = "You are a professional Medical Receptionist. Answer the user's question or greeting directly and politely."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    response = llm.invoke(messages)
    state.answer = response.content.strip()
    return state

# -----------------------------------------------------------------
# 5. GRAPH CONSTRUCT
# -----------------------------------------------------------------
graph = StateGraph(MedicalChatState)

# Add Nodes
graph.add_node("planner", node_planner)
graph.add_node("retriever", node_retrieve)
graph.add_node("answerer", node_answer)

# Set Entry Point
graph.set_entry_point("planner")

# Conditional Routing
graph.add_conditional_edges(
    "planner",
    lambda s: s.action,
    {
        "retrieve": "retriever",
        "answer_direct": "answerer"
    }
)

# Connect retriever to answerer, and answerer to END
graph.add_edge("retriever", "answerer")
graph.add_edge("answerer", END)

# Compile Graph App
app = graph.compile()

# -----------------------------------------------------------------
# 6. RUN DEMO
# -----------------------------------------------------------------
def ask_assistant(question: str):
    print("=" * 60)
    print(f"PATIENT QUESTION: {question}")
    print("-" * 60)
    inputs = {"query": question}
    result = app.invoke(inputs)
    print("-" * 60)
    print(f"ASSISTANT RESPONSE:\\n{result['answer']}")
    print("=" * 60)

if __name__ == "__main__":
    # Test cases
    ask_assistant("Hello! Are you open today?")
    ask_assistant("What are the rules for fasting blood tests?")
    ask_assistant("How can I book an appointment for my 5-year-old child?")
`,
  "db_setup.py": `# =================================================================
# db_setup.py - FAISS Vector Store Setup & Loading
# Ingests medical FAQs and builds local FAISS vector store
# =================================================================

import os
import pickle
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

# 1. Define Medical FAQ documents
medical_faqs = [
    Document(
        page_content="For fasting blood tests (such as lipid panels, glucose tests, or basic metabolic panels), do not eat or drink anything except water for 8 to 12 hours before your appointment. Avoid chewing gum, smoking, and strenuous exercise. Continue taking your prescription medications with water unless specifically instructed otherwise by your doctor.",
        metadata={"category": "Preparation", "source": "Clinical Prep Guide 2026", "page": 5}
    ),
    Document(
        page_content="To schedule an appointment for children under 18 years of age, select the 'Pediatric Care' department in the online patient portal. A parent or legal guardian must accompany the child to all appointments. Please bring the child's immunization record, insurance card, and the parent/guardian's photo identification.",
        metadata={"category": "Appointments", "source": "Clinic Policy Handbook", "page": 12}
    ),
    Document(
        page_content="Appointments must be cancelled or rescheduled at least 24 hours prior to the scheduled time. Cancellations made less than 24 hours in advance, or missed appointments (no-shows), will incur a $50 late fee. This fee is not covered by insurance and must be paid before booking your next appointment.",
        metadata={"category": "Policy", "source": "Billing & Admin Manual", "page": 8}
    ),
    Document(
        page_content="For adults, a fever is defined as a temperature of 100.4°F (38°C) or higher. Manage a mild fever with rest, hydration, and over-the-counter fever reducers like acetaminophen or ibuprofen. Seek immediate emergency medical care if the fever exceeds 103°F (39.4°C), lasts more than 3 days, or is accompanied by chest pain, difficulty breathing, a stiff neck, or severe headache.",
        metadata={"category": "Triage", "source": "Urgent Care Triage Protocol", "page": 19}
    ),
    Document(
        page_content="Our clinic accepts major insurance providers including Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, and Medicare. Patients are responsible for paying any co-pay or unmet deductibles at the time of check-in. We recommend calling your insurance provider before your visit to verify coverage and co-pay requirements for 'specialist clinic' appointments.",
        metadata={"category": "Billing", "source": "Billing & Admin Manual", "page": 3}
    ),
    Document(
        page_content="Prescription refills require 48 business hours to process. Requests should be submitted directly through the Patient Portal under the 'Prescriptions' tab or requested by having your pharmacy send an electronic refill request to our office. Refills cannot be approved during weekends or holidays, so please request them in advance.",
        metadata={"category": "Prescriptions", "source": "Pharmacy Liaison Guidelines", "page": 22}
    ),
    Document(
        page_content="Preparation for an ultrasound depends on the type. For abdominal ultrasounds, eat a fat-free dinner the night before and do not eat or drink for 8 hours prior. For pelvic or obstetric ultrasounds, you must drink 32 ounces of water 1 hour before the exam and do not empty your bladder; a full bladder is required for proper imaging.",
        metadata={"category": "Preparation", "source": "Clinical Prep Guide 2026", "page": 6}
    ),
    Document(
        page_content="New patients should arrive 15 minutes before their scheduled appointment time to complete registration. Please bring a government-issued photo ID, your insurance card, and any relevant medical records or current medication bottles. Registration forms can also be downloaded and filled out online via our website prior to arrival.",
        metadata={"category": "Appointments", "source": "Clinic Policy Handbook", "page": 1}
    )
]

def build_vector_store():
    print("[faiss] Initialising sentence embeddings (HuggingFace)...")
    # Using lightweight all-MiniLM-L6-v2 which runs quickly and locally
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    print("[faiss] Encoding FAQ segments and building index...")
    db = FAISS.from_documents(medical_faqs, embeddings)
    
    print("[faiss] Saving FAISS database locally to 'medical_faiss_index'...")
    db.save_local("medical_faiss_index")
    print("[faiss] Index successfully saved!")

if __name__ == "__main__":
    build_vector_store()
`,
  "requirements.txt": `langchain-groq>=0.1.3
langchain>=0.1.16
langchain-community>=0.0.34
langgraph>=0.0.39
faiss-cpu>=1.8.0
sentence-transformers>=2.7.0
pydantic>=2.7.0
numpy>=1.24.0
`
};
