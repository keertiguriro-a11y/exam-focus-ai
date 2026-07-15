import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Create a require function to cleanly import CommonJS modules in ESM
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Groq SDK with API Key
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Configure Multer for PDF file buffer uploads in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF documents are supported.'), false);
        }
    }
});

app.use(cors());
app.use(express.json());

/**
 * Route: POST /upload-file
 * Handles optional file upload and/or raw text inputs, compiles them, 
 * passes them to Groq Llama, and sends back structured study material JSON.
 */
app.post('/upload-file', upload.single('studyFile'), async (req, res) => {
    try {
        let extractedPdfText = '';
        const pastedNotes = req.body.pastedNotes || '';

        // If a file was uploaded, parse its text content
        if (req.file) {
            try {
                const pdfData = await pdfParse(req.file.buffer);
                extractedPdfText = pdfData.text;
            } catch (pdfErr) {
                console.error('PDF parsing error:', pdfErr);
                return res.status(400).json({ error: 'Failed to process and parse the uploaded PDF file.' });
            }
        }

        // Combine inputs
        const finalCleanText = `${extractedPdfText}\n\n${pastedNotes}`.trim();

        if (!finalCleanText) {
            return res.status(400).json({ error: 'No readable text was provided. Please paste notes or upload a valid PDF.' });
        }

        // Call Groq API with the updated, high-yield structured system prompt
        const chatCompletion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
            messages: [
                { 
                    role: "system", 
                    content: `You are an elite academic tutor who specializes in extracting high-yield exam material. 
                    Analyze the material and respond strictly using valid JSON format containing exactly two keys: "mustStudy" and "keywords". 
                    
                    Rules for "mustStudy":
                    - Start with '## 🎯 The Core Takeaway' followed by a crisp 2-sentence summary of the most critical exam concept.
                    - Use '## 🚨 HIGH PRIORITY (60% of Exam)' and '## ⚖️ MEDIUM PRIORITY' as headings.
                    - Provide short, highly actionable bullet points that contain ACTUAL facts, rules, or core details from the text (do not just say "Study X", explain "What X actually is in one sentence").
                    
                    Rules for "keywords":
                    - Provide a list of terms formatted strictly as: "- Term: Definition"
                    - Keep definitions to a single crisp, easy-to-memorize sentence.
                    
                    Structure:
                    {
                        "mustStudy": "## 🎯 The Core Takeaway\\nThis chapter focuses on X which is defined by Y...\\n\\n## 🚨 HIGH PRIORITY (60% of Exam)\\n- Fact A: Explain what it actually does here.\\n- Fact B: Detail why this is critical.\\n\\n## ⚖️ MEDIUM PRIORITY\\n- Fact C: Key details.",
                        "keywords": "- Term 1: Short definition here.\\n- Term 2: Short definition here."
                    }`
                },
                { 
                    role: "user", 
                    content: `Break down this study text:\n\n${finalCleanText}` 
                }
            ],
            temperature: 0.3
        });

        // Parse and return the JSON payload
        const resultPayload = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(resultPayload);

    } catch (error) {
        console.error('Core generation error:', error);
        res.status(500).json({ error: 'Internal system error processing your request.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Exam Focus AI Server listening on port: ${PORT}`);
});
export default app;