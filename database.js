// Medical FAQ Knowledge Base and TF-IDF Similarity Search Engine
// Mimics FAISS Vector Store retrieval in JavaScript

// Mock Users Database
const MOCK_USERS = [
  { id: 1, name: "Akshay", password: "Messi", role: "patient" },
  { id: 2, name: "sooraj", password: "mister11", role: "doctor" },
  { id: 3, name: "juwel", password: "mister7", role: "doctor" },
  { id: 4, name: "charles babbage", password: "computer", role: "developer" },
  { id: 5, name: "Joseph", password: "mister007", role: "doctor" },
  { id: 6, name: "Sourav", password: "Mister44", role: "doctor" }
];

// Mock Appointments Database
const INITIAL_APPOINTMENTS = [
  {
    id: 101,
    patientName: "Akshay",
    doctorName: "sooraj",
    date: "2026-07-05",
    time: "10:30 AM",
    reason: "Routine cardiovascular checkup and blood pressure management.",
    status: "Confirmed"
  },
  {
    id: 102,
    patientName: "Akshay",
    doctorName: "juwel",
    date: "2026-07-12",
    time: "02:00 PM",
    reason: "Follow-up consultation on pediatric care and immunization schedule.",
    status: "Confirmed"
  }
];

const MEDICAL_FAQ_DATABASE = [
  {
    id: 1,
    category: "Diseases & Conditions",
    title: "Hypertension (High Blood Pressure)",
    content: "Hypertension is a common condition in which the long-term force of the blood against your artery walls is high enough that it may eventually cause health problems, such as heart disease. Symptoms are rare, making regular checkups crucial. Management involves a low-salt diet, regular exercise, limiting alcohol, and medications like beta-blockers or ACE inhibitors.",
    source: "JRJS Hospital Cardiology",
    page: 14,
    vector: [0.15, -0.42, 0.88, 0.03, -0.31, 0.62, 0.12, -0.19]
  },
  {
    id: 2,
    category: "Diseases & Conditions",
    title: "Type 2 Diabetes Mellitus",
    content: "Type 2 diabetes is an impairment in the way the body regulates and uses sugar (glucose) as a fuel. This long-term (chronic) condition results in too much sugar circulating in the bloodstream. Symptoms include increased thirst, frequent urination, hunger, fatigue, and blurred vision. Treatments include healthy eating, regular exercise, weight loss, and insulin therapy or glucose-lowering drugs.",
    source: "JRJS Hospital Endocrinology",
    page: 28,
    vector: [-0.67, 0.11, 0.35, -0.82, 0.44, 0.19, -0.51, 0.72]
  },
  {
    id: 3,
    category: "Symptoms",
    title: "High Fever, Sore Throat & Influenza Symptoms",
    content: "Influenza is a viral infection that attacks your respiratory system. Symptoms include a high fever (typically above 100.4°F / 38°C), sore throat, throat pain, aching muscles, chills, sweats, headache, dry cough, fatigue, and nasal congestion. Treatment includes rest, fluid intake, and over-the-counter pain relievers. Seek immediate emergency care for breathing difficulties or temperatures exceeding 103°F (39.4°C).",
    source: "JRJS Hospital Infectious Diseases",
    page: 9,
    vector: [0.45, 0.76, -0.12, 0.33, -0.91, -0.22, 0.65, 0.04]
  },
  {
    id: 4,
    category: "Symptoms",
    title: "Migraine Headaches",
    content: "A migraine is a headache that can cause severe throbbing pain or a pulsing sensation, usually on one side of the head. It's often accompanied by nausea, vomiting, and extreme sensitivity to light and sound. Migraine attacks can last for hours to days, and the pain can be so severe that it interferes with your daily activities. Preventive and pain-relieving medications help manage attacks.",
    source: "JRJS Hospital Neurology",
    page: 22,
    vector: [0.08, -0.89, 0.22, -0.14, 0.53, 0.77, -0.39, -0.61]
  },
  {
    id: 5,
    category: "Tests & Procedures",
    title: "Abdominal Ultrasound Prep Guidelines",
    content: "An abdominal ultrasound uses sound waves to produce pictures of the structures within the upper abdomen. To prepare, eat a fat-free dinner the night before and do not eat or drink anything (including water) for 8 to 12 hours before your appointment. This prevents gas build-up in your stomach which could block sound waves.",
    source: "JRJS Hospital Radiology",
    page: 5,
    vector: [0.81, 0.29, -0.56, 0.48, -0.11, -0.73, 0.88, 0.15]
  },
  {
    id: 6,
    category: "Tests & Procedures",
    title: "Fasting Blood Test Guidelines",
    content: "For fasting blood tests (such as lipid panels, glucose tests, or basic metabolic panels), do not eat or drink anything except water for 8 to 12 hours before your appointment. Avoid chewing gum, smoking, and strenuous exercise. Continue taking your prescription medications with water unless specifically instructed otherwise by your doctor.",
    source: "JRJS Hospital Laboratory Medicine",
    page: 11,
    vector: [-0.22, 0.51, 0.64, 0.39, 0.72, -0.15, -0.48, -0.33]
  },
  {
    id: 7,
    category: "Diseases & Conditions",
    title: "Asthma and Bronchospasms",
    content: "Asthma is a condition in which your airways narrow and swell and may produce extra mucus. This can make breathing difficult and trigger coughing, a whistling sound (wheezing) when you breathe out, and shortness of breath. For some people, asthma is a minor nuisance. For others, it can be a major problem that interferes with daily activities and may lead to a life-threatening asthma attack.",
    source: "JRJS Hospital Pulmonology",
    page: 34,
    vector: [0.29, -0.58, 0.73, -0.12, -0.44, 0.81, 0.25, -0.38]
  },
  {
    id: 8,
    category: "Policy & Billing",
    title: "Insurance Coverage and Billing",
    content: "We accept major insurance providers including Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, and Medicare. Patients are responsible for paying any co-pay or unmet deductibles at the time of check-in. Cancellations made less than 24 hours in advance will incur a $50 late fee, which is not covered by insurance.",
    source: "Clinic Billing & Admin Manual",
    page: 3,
    vector: [-0.59, 0.25, 0.44, -0.71, 0.38, 0.08, -0.63, 0.67]
  },
  {
    id: 9,
    category: "Symptoms",
    title: "Sore Throat (Throat Pain) & Pharyngitis",
    content: "Sore throat is pain, scratchiness or irritation of the throat that often worsens when you swallow. The most common cause of a sore throat (pharyngitis) is a viral infection, such as a cold or the flu. A sore throat caused by a virus resolves on its own. Strep throat (streptococcal infection), a less common type of sore throat caused by bacteria, requires treatment with antibiotics to prevent complications.",
    source: "JRJS Hospital ENT Department",
    page: 12,
    vector: [0.38, 0.12, -0.65, 0.22, 0.45, -0.71, 0.81, 0.33]
  }
];

// TF-IDF Cosine Similarity Search Engine Class
class MedicalSearchEngine {
  constructor(docs) {
    this.documents = docs;
    this.stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "for", 
      "with", "on", "at", "in", "by", "is", "was", "are", "you", "your", "my", 
      "i", "we", "us", "they", "he", "she", "it", "this", "that", "these", "those"
    ]);
    this.vocab = [];
    this.docVectors = [];
    this.idf = {};
    
    this.initializeEngine();
  }

  // Preprocess text: lowercase, remove punctuation, split into tokens, filter stop words
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/)
      .filter(token => token.length > 1 && !this.stopWords.has(token));
  }

  initializeEngine() {
    const allTokens = [];
    const docTermFreqs = [];

    // Step 1: Tokenize all documents and record Term Frequencies (TF)
    this.documents.forEach(doc => {
      const tokens = this.tokenize(doc.title + " " + doc.content);
      const tf = {};
      tokens.forEach(token => {
        tf[token] = (tf[token] || 0) + 1;
        if (!allTokens.includes(token)) {
          allTokens.push(token);
        }
      });
      docTermFreqs.push(tf);
    });

    this.vocab = allTokens;

    // Step 2: Compute Inverse Document Frequency (IDF)
    const numDocs = this.documents.length;
    this.vocab.forEach(term => {
      let docCount = 0;
      docTermFreqs.forEach(tf => {
        if (tf[term]) docCount++;
      });
      // IDF formula: ln(1 + (Total Docs / Docs Containing Term))
      this.idf[term] = Math.log(1 + (numDocs / docCount));
    });

    // Step 3: Compute TF-IDF vectors for all documents
    this.docVectors = docTermFreqs.map(tf => {
      const vector = {};
      this.vocab.forEach(term => {
        if (tf[term]) {
          vector[term] = tf[term] * this.idf[term];
        } else {
          vector[term] = 0;
        }
      });
      return vector;
    });
  }

  // Calculate Cosine Similarity between two sparse vectors
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    this.vocab.forEach(term => {
      const val1 = vec1[term] || 0;
      const val2 = vec2[term] || 0;
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    });

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Search the corpus for a query and return top k documents with similarity score
  search(query, k = 3) {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    // Build TF for query
    const queryTf = {};
    queryTokens.forEach(token => {
      queryTf[token] = (queryTf[token] || 0) + 1;
    });

    // Build TF-IDF vector for query
    const queryVector = {};
    this.vocab.forEach(term => {
      if (queryTf[term]) {
        // Query weight: TF * IDF (using corpus IDF)
        queryVector[term] = queryTf[term] * (this.idf[term] || 0);
      } else {
        queryVector[term] = 0;
      }
    });

    // Calculate similarity score for each document
    const results = this.documents.map((doc, idx) => {
      const score = this.cosineSimilarity(queryVector, this.docVectors[idx]);
      return {
        ...doc,
        score: parseFloat(score.toFixed(4))
      };
    });

    // Sort descending and filter those with score > 0
    return results
      .filter(item => item.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

// Instantiate search engine
const searchEngine = new MedicalSearchEngine(MEDICAL_FAQ_DATABASE);
console.log("MediGraph Search Engine initialized with", MEDICAL_FAQ_DATABASE.length, "documents.");
