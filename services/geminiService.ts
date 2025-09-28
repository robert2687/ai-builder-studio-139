import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemPrompt = () => `You are an expert web developer creating a complete, single-file HTML application.
CRITICAL INSTRUCTIONS:
1. ALL code (HTML, CSS, JS) MUST be in one .html file. This means NO external JS files or dependencies besides the provided Tailwind and Inter font CDNs. NO ES module imports for external libraries (e.g., 'import React from "react"' is forbidden).
2. You MUST use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>.
3. The code must be fully functional and runnable in a browser with vanilla JavaScript. Do not use React or any other framework in the generated code itself.
4. Your entire response MUST BE ONLY the raw HTML code. Do not include any explanations, comments, or markdown formatting like \`\`\`html.
5. Create a visually appealing, modern, responsive UI using the 'Inter' font via Google Fonts CDN. For icons, you MUST use inline SVGs within the HTML.
6. Implement the user's core functionality requested.`;

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
) => `You are an expert pair programmer AI, providing code completions within a single-file web application. The application uses vanilla JavaScript and Tailwind CSS for styling.

CURRENT CONTEXT: The user is editing ${languageContext}.

CRITICAL INSTRUCTIONS:
1.  Your response MUST be ONLY the raw code snippet for completion. Do NOT include explanations, comments, or markdown formatting like \`\`\`.
2.  Provide a concise, idiomatic, and efficient code completion that seamlessly fits between the user's existing code.
3.  Do NOT repeat any code the user has already typed (from the "CODE BEFORE CURSOR" or "CODE AFTER CURSOR" sections).
4.  If the context is HTML or JavaScript, you MUST use Tailwind CSS classes for styling. Do not use inline styles or create CSS in a <style> tag unless the context is explicitly 'CSS within a <style> tag'.
5.  If providing a multi-line snippet, keep it short and logical (e.g., completing a function block, an HTML element with children, or a CSS rule).

CODE BEFORE CURSOR:
\`\`\`
${codeBefore}
\`\`\`

CODE AFTER CURSOR:
\`\`\`
${codeAfter}
\`\`\`

Your suggested code completion:`;

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
