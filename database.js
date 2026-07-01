// Medical FAQ Knowledge Base and TF-IDF Similarity Search Engine
// Mimics FAISS Vector Store retrieval in JavaScript

const MEDICAL_FAQ_DATABASE = [
  {
    id: 1,
    category: "Preparation",
    title: "Fasting Blood Test Guidelines",
    content: "For fasting blood tests (such as lipid panels, glucose tests, or basic metabolic panels), do not eat or drink anything except water for 8 to 12 hours before your appointment. Avoid chewing gum, smoking, and strenuous exercise. Continue taking your prescription medications with water unless specifically instructed otherwise by your doctor.",
    source: "Clinical Prep Guide 2026",
    page: 5,
    vector: [0.15, -0.42, 0.88, 0.03, -0.31, 0.62, 0.12, -0.19]
  },
  {
    id: 2,
    category: "Appointments",
    title: "Pediatric Appointment Booking & Requirements",
    content: "To schedule an appointment for children under 18 years of age, select the 'Pediatric Care' department in the online patient portal. A parent or legal guardian must accompany the child to all appointments. Please bring the child's immunization record, insurance card, and the parent/guardian's photo identification.",
    source: "Clinic Policy Handbook",
    page: 12,
    vector: [-0.67, 0.11, 0.35, -0.82, 0.44, 0.19, -0.51, 0.72]
  },
  {
    id: 3,
    category: "Policy",
    title: "Cancellation & Rescheduling Rules",
    content: "Appointments must be cancelled or rescheduled at least 24 hours prior to the scheduled time. Cancellations made less than 24 hours in advance, or missed appointments (no-shows), will incur a $50 late fee. This fee is not covered by insurance and must be paid before booking your next appointment.",
    source: "Billing & Admin Manual",
    page: 8,
    vector: [0.45, 0.76, -0.12, 0.33, -0.91, -0.22, 0.65, 0.04]
  },
  {
    id: 4,
    category: "Triage",
    title: "High Fever Self-Care and Emergency Triage",
    content: "For adults, a fever is defined as a temperature of 100.4°F (38°C) or higher. Manage a mild fever with rest, hydration, and over-the-counter fever reducers like acetaminophen or ibuprofen. Seek immediate emergency medical care if the fever exceeds 103°F (39.4°C), lasts more than 3 days, or is accompanied by chest pain, difficulty breathing, a stiff neck, or severe headache.",
    source: "Urgent Care Triage Protocol",
    page: 19,
    vector: [0.08, -0.89, 0.22, -0.14, 0.53, 0.77, -0.39, -0.61]
  },
  {
    id: 5,
    category: "Billing",
    title: "Insurance Coverage and Co-pays",
    content: "Our clinic accepts major insurance providers including Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, and Medicare. Patients are responsible for paying any co-pay or unmet deductibles at the time of check-in. We recommend calling your insurance provider before your visit to verify coverage and co-pay requirements for 'specialist clinic' appointments.",
    source: "Billing & Admin Manual",
    page: 3,
    vector: [0.81, 0.29, -0.56, 0.48, -0.11, -0.73, 0.88, 0.15]
  },
  {
    id: 6,
    category: "Prescriptions",
    title: "Prescription Refill Requests",
    content: "Prescription refills require 48 business hours to process. Requests should be submitted directly through the Patient Portal under the 'Prescriptions' tab or requested by having your pharmacy send an electronic refill request to our office. Refills cannot be approved during weekends or holidays, so please request them in advance.",
    source: "Pharmacy Liaison Guidelines",
    page: 22,
    vector: [-0.22, 0.51, 0.64, 0.39, 0.72, -0.15, -0.48, -0.33]
  },
  {
    id: 7,
    category: "Preparation",
    title: "Ultrasound Preparation Instructions",
    content: "Preparation for an ultrasound depends on the type. For abdominal ultrasounds, eat a fat-free dinner the night before and do not eat or drink for 8 hours prior. For pelvic or obstetric ultrasounds, you must drink 32 ounces of water 1 hour before the exam and do not empty your bladder; a full bladder is required for proper imaging.",
    source: "Clinical Prep Guide 2026",
    page: 6,
    vector: [0.29, -0.58, 0.73, -0.12, -0.44, 0.81, 0.25, -0.38]
  },
  {
    id: 8,
    category: "Appointments",
    title: "New Patient Registration Requirements",
    content: "New patients should arrive 15 minutes before their scheduled appointment time to complete registration. Please bring a government-issued photo ID, your insurance card, and any relevant medical records or current medication bottles. Registration forms can also be downloaded and filled out online via our website prior to arrival.",
    source: "Clinic Policy Handbook",
    page: 1,
    vector: [-0.59, 0.25, 0.44, -0.71, 0.38, 0.08, -0.63, 0.67]
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
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

// Instantiate search engine
const searchEngine = new MedicalSearchEngine(MEDICAL_FAQ_DATABASE);
console.log("MediGraph Search Engine initialized with", MEDICAL_FAQ_DATABASE.length, "documents.");
