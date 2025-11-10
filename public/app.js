const express = require('express');
// CRITICAL FIX: Changed import to resolve 'GoogleGenerativeAI is not a constructor' error
const GoogleGenerativeAI = require('@google/genai').GoogleGenerativeAI;
const cors = require('cors');
const multer = require('multer');

// --- Initialization ---

// ... (Lines 1-11 are fine)
// 1. Initialize the Gemini AI client
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null; // Safer key handling
const ai = new GoogleGenerativeAI(apiKey);

const app = express();
const port = process.env.PORT || 8080;

// 2. Configure CORS
// CRITICAL: MUST be set to the exact domain where your GoDaddy frontend is hosted!
const allowedOrigin = 'https://site-jmqhaxxba.godaddysites.com';

app.use(cors({
    origin: allowedOrigin,
    methods: ['POST'],
}));

// 3. Configure Multer (Store files in memory)
const upload = multer({ storage: multer.memoryStorage() });

// --- Helper Function: File Formatting ---

/**
 * Converts a Multer file object buffer into the Part object required by the Gemini API.
 * This is the critical function where we fix the empty base64 string issue.
 */
const formatFileForGemini = (file) => {
    // FIX: Using file.buffer.toString('base64') is the standard, 
    // but we rely on the fact that file.buffer is the correct Node.js Buffer object.
    const base64Data = file.buffer.toString('base64');
    
    return {
        inlineData: {
            data: base64Data, // The Base64 string (should now be populated)
            mimeType: file.mimetype,
        },
    };
};

// --- API Route ---

app.post('/api/compliance-check', upload.fields([
    { name: 'rfq', maxCount: 1 },
    { name: 'proposal', maxCount: 1 }
]), async (req, res) => {
    try {
        // 1. Validate Upload and Extract Files
        if (!req.files || !req.files.rfq || !req.files.proposal) {
            return res.status(400).json({ success: false, error: 'Both RFQ and Proposal files are required.' });
        }
        
        // This syntax accesses the first file in the array for each field
        const rfqFile = req.files.rfq[0];
        const proposalFile = req.files.proposal[0];

        // 2. Format Files for Gemini
        const rfqContent = formatFileForGemini(rfqFile);
        const proposalContent = formatFileForGemini(proposalFile);

        // --- DEBUGGING LOGS (Confirm the Fix) ---
        // This will print to your Cloud Run Container Logs
        console.log('--- DEBUG START ---');
        console.log('RFQ File Size:', rfqFile.size);
        console.log('Proposal File Size:', proposalFile.size);
        // Expecting these lengths to be > 10 now!
        console.log('RFQ Content Data Length:', rfqContent.inlineData.data.length);
        console.log('Proposal Content Data Length:', proposalContent.inlineData.data.length);
        console.log('--- DEBUG END ---');
        // --- END DEBUGGING ---

        // 3. Construct the Prompt with Files
        const systemInstruction = `You are a strict compliance checker. Your task is to analyze the provided Request for Quote (RFQ) and the corresponding Proposal document.

**INSTRUCTIONS:**
1.  **Compliance Score (0-100):** Assign a single numerical score based on how well the Proposal meets ALL requirements in the RFQ.
2.  **Compliance Summary:** List all requirements from the RFQ and explicitly state whether the Proposal is COMPLIANT, PARTIALLY COMPLIANT, or NON-COMPLIANT for each.
3.  **Actionable Improvements:** For any non-compliant or partially compliant areas, provide a concise, actionable instruction for the proposal team to fix it.

**FORMATTING:** Respond using Markdown only.`;

        const promptParts = [
            rfqContent,
            proposalContent,
            "Document 1 (RFQ) is the set of rules. Document 2 (Proposal) is the response. Analyze Document 2 based on Document 1. Provide the analysis structured exactly as described in the System Instructions.",
        ];

        // 4. Call the Gemini API
        const result = await ai.models.generateContent({
            model: model,
            contents: promptParts,
            config: {
                systemInstruction: systemInstruction,
                timeout: 60000 
            }
        });

        // 5. Send Success Response
        res.json({ success: true, result: result.text });

    } catch (error) {
        // Send a generic 500 error to the client
        res.status(500).json({ 
            success: false, 
            error: 'An internal server error occurred during the compliance check. Check file formats and server logs.' 
        });
        
        // Log the detailed error to the Cloud Run console
        console.error('Compliance Check Error:', error);

    }
});

// --- Start Server ---
// CRITICAL FIX: The server MUST listen on '0.0.0.0' for Cloud Run
const host = '0.0.0.0'; 
app.listen(port, host, () => {
    console.log(`Server listening on ${host}:${port}`);
});
