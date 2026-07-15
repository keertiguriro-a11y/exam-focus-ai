// Live backend API URL on Vercel
const BACKEND_URL = 'https://exam-focus-ai-backend.vercel.app';

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const focusOption = document.getElementById('focusOption').value;
    const resultDiv = document.getElementById('result');
    const statusText = document.getElementById('statusText');

    if (!fileInput.files[0]) {
        alert('Please select a file to upload!');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Reset and show progress
    statusText.innerText = "Reading and parsing your file...";
    resultDiv.innerText = "";
    resultDiv.style.display = "none";

    try {
        // Step 1: Upload file and extract text
        const uploadResponse = await fetch(`${BACKEND_URL}/upload-file`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Failed to parse file');
        }

        const uploadData = await uploadResponse.json();
        const extractedText = uploadData.text;

        statusText.innerText = "Analyzing text and generating your study guide with AI...";

        // Step 2: Send extracted text to Groq API via backend
        const generateResponse = await fetch(`${BACKEND_URL}/generate-study-guide`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: extractedText,
                focusOption: focusOption
            })
        });

        if (!generateResponse.ok) {
            const errorData = await generateResponse.json();
            throw new Error(errorData.error || 'Failed to generate study guide');
        }

        const generateData = await generateResponse.json();

        // Step 3: Render the markdown output safely
        statusText.innerText = "Study Guide Generated Successfully!";
        resultDiv.style.display = "block";
        
        // Check if marked.js library is loaded for gorgeous formatting, otherwise fall back to raw text
        if (typeof marked !== 'undefined') {
            resultDiv.innerHTML = marked.parse(generateData.result);
        } else {
            resultDiv.innerText = generateData.result;
        }

    } catch (error) {
        console.error('Error:', error);
        statusText.innerText = "An error occurred!";
        resultDiv.style.display = "block";
        resultDiv.innerHTML = `<p style="color: #ff4d4d; font-weight: bold;">Error: ${error.message}</p>`;
    }
});