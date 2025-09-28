

import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemPrompt = () => `You are an expert web developer and UI/UX designer, tasked with creating a complete, single-file HTML application.

CRITICAL INSTRUCTIONS:
1.  **Single File Structure:** ALL code (HTML, CSS, JS) MUST be in one .html file. This means NO external JS files or dependencies besides the provided Tailwind and Inter font CDNs. NO ES module imports for external libraries (e.g., 'import React from "react"' is forbidden).
2.  **Tailwind CSS Mastery:**
    *   You MUST use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>.
    *   Implement a visually appealing, modern, and responsive UI. It MUST look great on all screen sizes, from mobile to desktop. Use responsive prefixes like 'md:' and 'lg:'.
    *   Default to a professional dark theme with good contrast. Use a palette of dark grays/charcoals and a primary accent color (like indigo or purple) for interactive elements.
    *   Ensure consistent spacing and padding throughout the application for a clean, uncluttered layout.
    *   **Style all form inputs** (text, password, email, etc.) to be modern and consistent with the dark theme. They should have clear borders (e.g., \`border-gray-600\`), appropriate padding (e.g., \`px-3 py-2\`), a subtle background color (e.g., \`bg-gray-700\`), and a distinct focus state (e.g., \`focus:ring-2 focus:ring-indigo-500 focus:border-transparent\`).
3.  **Vanilla JavaScript:** The code must be fully functional and runnable in a browser with vanilla JavaScript. Do not use React or any other framework.
4.  **Code-Only Output:** Your entire response MUST BE ONLY the raw HTML code. Do not include any explanations, comments, or markdown formatting like \`\`\`html.
5.  **Typography & Icons:**
    *   Use the 'Inter' font via Google Fonts CDN for clean, readable text.
    *   For icons, you MUST use inline SVGs within the HTML to maintain the single-file structure.
6.  **Functionality:** Implement the user's core requested functionality completely.
7.  **Polished User Experience:**
    *   Incorporate subtle, tasteful animations and transitions to enhance the UI. All interactive elements like buttons and links MUST have a smooth hover effect, such as a slight scale-up (\`hover:scale-105\`), a gentle lift (\`hover:-translate-y-1\`), or a background color shift. Use utilities like \`transition-transform\` and \`duration-300\` to ensure animations are fluid.
    *   All interactive elements (buttons, inputs) MUST have clear hover, focus, and active states.
8.  **Accessibility (A11y):**
    *   Use semantic HTML5 tags (e.g., <main>, <header>, <section>).
    *   Ensure all interactive elements are accessible via keyboard.
    *   Use ARIA attributes where appropriate to improve screen reader compatibility.
    *   Maintain sufficient color contrast to meet WCAG AA guidelines.`;

const getRefinementSystemPrompt = (originalPrompt: string, currentCode: string, refinementRequest: string) => `You are an expert web developer modifying an existing single-file HTML application.
The user's original goal was: "${originalPrompt}".
You will receive the CURRENT HTML code and a new modification request. Your task is to apply the requested modification to the code and return the COMPLETE, new version of the single-file HTML application.

CRITICAL INSTRUCTIONS:
1. Your response MUST be ONLY the full, raw HTML code for the updated application. Do not include any explanations, comments, or markdown formatting like \`\`\`html.
2. Ensure the final code is still a complete, runnable, single file using Tailwind CSS from the CDN.
3. The code must be fully functional with vanilla JavaScript. Do not introduce external libraries, frameworks (like React), or ES module imports. For any new icons, you MUST use inline SVGs.

HERE IS THE CURRENT CODE:
${currentCode}

**Modification Request:** "${refinementRequest}"`;

const getCompletionSystemPrompt = (
    languageContext: string, 
    codeBefore: string, 
    codeAfter: string
) => `You are an expert AI pair programmer specialized in single-file web applications using vanilla JavaScript and Tailwind CSS. The user is working in an editor and needs a code completion. Your suggestions must be flawless, concise, and immediately useful.

The application context is a single HTML file. It uses vanilla JavaScript and Tailwind CSS for styling, loaded via CDN. No other libraries or frameworks (like React, Vue, etc.) are available.

The user is currently editing code in this context: **${languageContext}**.

You will be given the code immediately before and after the user's cursor. Your task is to provide ONLY the code snippet that should be inserted at the cursor's position.

**RULES:**
1.  **Code only:** Your entire response must be ONLY the raw code snippet. Do NOT include explanations, markdown (like \`\`\`), or apologies.
2.  **No repetition:** Do not include any code that is already present in the "CODE BEFORE" or "CODE AFTER" sections.
3.  **Tailwind for styling:** All styling must use Tailwind CSS classes, unless the context is explicitly 'CSS within a <style> tag'. Do not use inline \`style\` attributes.
4.  **Context-aware:** Your suggestion must be syntactically correct for the given context (${languageContext}).
5.  **Concise and logical:** Keep snippets short and focused on completing the current thought or block.

CODE BEFORE CURSOR:
\`\`\`
${codeBefore}
\`\`\`

CODE AFTER CURSOR:
\`\`\`
${codeAfter}
\`\`\`

YOUR COMPLETION:`;

const callApi = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Use a lower temperature for more predictable code generation
                temperature: 0.2,
            },
        });
        
        const candidate = response.candidates?.[0];

        if (!candidate) {
            throw new Error("The API returned no candidates in the response.");
        }

        // Check for safety blocks or other non-OK finish reasons.
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            switch (candidate.finishReason) {
                case 'SAFETY':
                    throw new Error("The request was blocked for safety reasons. Please modify your prompt and try again.");
                case 'RECITATION':
                     throw new Error("The request was blocked due to potential recitation issues.");
                case 'MAX_TOKENS':
                    throw new Error("The response was stopped because it reached the maximum token limit.");
                default:
                    throw new Error(`Generation stopped for an unexpected reason: ${candidate.finishReason}`);
            }
        }
        
        const code = response.text;
        
        if (!code) {
             throw new Error("The API returned an empty response.");
        }
        
        // Clean up potential markdown formatting just in case
        return code.replace(/^```[a-z]*\s*|```\s*$/g, '').trim();

    } catch (error) {
        console.error("Gemini API Error:", error);
        
        // Check for specific error messages to provide better user feedback
        if (error instanceof Error) {
             const errorMessage = error.message.toLowerCase();
             if (errorMessage.includes('api key not valid')) {
                 throw new Error("API Key not valid. Please check your configuration.");
             }
             if (errorMessage.includes('quota')) {
                 throw new Error("You have exceeded your API quota. Please check your account status.");
             }
             if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
                 throw new Error("Network error. Please check your internet connection and try again.");
             }
             // Re-throw the original error if it's already specific enough (e.g., from the finishReason check)
             throw error;
        }

        throw new Error("An unknown error occurred while contacting the Gemini API.");
    }
}

export const generateApp = async (userPrompt: string): Promise<string> => {
    const systemPrompt = getSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\n**User's Request:** "${userPrompt}"`;
    return callApi(fullPrompt);
};

export const refineApp = async (originalPrompt: string, currentCode: string, refinementRequest: string): Promise<string> => {
    const fullPrompt = getRefinementSystemPrompt(originalPrompt, currentCode, refinementRequest);
    return callApi(fullPrompt);
};

export const getCodeCompletion = async (languageContext: string, codeBefore: string, codeAfter: string): Promise<string> => {
    const prompt = getCompletionSystemPrompt(languageContext, codeBefore, codeAfter);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 100,
                thinkingConfig: { thinkingBudget: 20 },
            },
        });
        const code = response.text;
        if (!code) {
            return '';
        }
        return code.replace(/^```[a-z]*\s*|```\s*$/g, '').trim();
    } catch (error) {
        console.error("Gemini Code Completion Error:", error);
        // Don't throw here, just fail gracefully so the editor doesn't crash
        return '';
    }
};