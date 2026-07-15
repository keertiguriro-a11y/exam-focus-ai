import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { getDocumentProxy, extractText } from 'unpdf';

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS for local development and Vercel frontends
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Set up Multer memory storage for incoming files (keeps them out of serverless storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
    res.json({ status: "Exam Focus AI Backend is Live and Running!" });
});

// --- FILE UPLOAD AND TEXT EXTRACTION ROUTE ---
app.post('/upload-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let extractedText = '';

        if (req.file.mimetype === 'application/pdf') {
            // Unpdf needs a Uint8Array to parse safely in serverless environments
            const pdfBuffer = new Uint8Array(req.file.buffer);
            const pdfProxy = await getDocumentProxy(pdfBuffer);
            
            // Extract the text and merge the pages into a single string
            const parsed = await extractText(pdfProxy, { mergePages: true });
            extractedText = parsed.text;
        } else {
            // Handle standard plain text files
            extractedText = req.file.buffer.toString('utf-8');
        }

        if (!extractedText || extractedText.trim() === '') {
            return res.status(400).json({ error: 'Could not extract text from the file' });
        }

        res.json({ text: extractedText });

    } catch (error) {
        console.error('File parsing error:', error);
        res.status(500).json({ error: 'Failed to parse file: ' + error.message });
    }
});

// --- AI GENERATION ROUTE ---
app.post('/generate-study-guide', async (req, res) => {
    const { text, focusOption } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'No text provided to generate a study guide' });
    }

    // Set up prompt based on selection
    let systemPrompt = "You are an expert academic educator helping students prepare for exams.";
    let userPrompt = "";

    if (focusOption === "concepts") {
        userPrompt = `Analyze the following study material and extract the absolute core terms, definitions, and major concepts. Provide clear, simple explanations for each:\n\n${text}`;
    } else if (focusOption === "questions") {
        userPrompt = `Generate a rigorous high-yield study guide consisting of multiple-choice and short-answer questions with an answer key based on this material:\n\n${text}`;
    } else {
        userPrompt = `Provide a comprehensive structured summary of the main points from the following study material:\n\n${text}`;
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
        });

        res.json({ result: chatCompletion.choices[0].message.content });

    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate study guide: ' + error.message });
    }
});

// --- SERVER INITIALIZATION ---
// Vercel handles server listening dynamically. We only use app.listen when running locally.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Local development server running on http://localhost:${PORT}`);
    });
}

// Crucial: Export the app for Vercel's Serverless environment
export default app;