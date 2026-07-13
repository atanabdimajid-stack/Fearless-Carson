const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
    // It automatically picks up the GEMINI_API_KEY environment variable.
});

/**
 * Generates a personalized response to a customer review using Gemini.
 * @param {string} customerName 
 * @param {string} reviewText 
 * @param {number} rating 
 * @returns {Promise<string>} The generated response text.
 */
const generateReviewResponse = async (customerName, reviewText, rating) => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('[AI] GEMINI_API_KEY is not set. Generating fallback response.');
        return `Thank you so much for your review, ${customerName}! We really appreciate your business.`;
    }

    const prompt = `
    You are the owner of a local home services business called ABC Roofing. 
    A customer named ${customerName} just left you a ${rating}-star Google Review.
    
    Their review text: "${reviewText}"

    Write a brief, professional, and highly personalized response to this review.
    - DO NOT sound like a robot.
    - Address the specific things they mentioned in their review text.
    - Keep it under 3 sentences.
    - Sign off as "Mike from ABC Roofing".
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        return response.text;
    } catch (error) {
        console.error('[AI] Error generating response from Gemini:', error);
        return `Thank you for your feedback, ${customerName}! We appreciate it.`;
    }
};

module.exports = {
    generateReviewResponse
};
