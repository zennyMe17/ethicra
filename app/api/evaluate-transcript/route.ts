// app/api/evaluate-transcript/route.ts
import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with your API key
// Ensure OPENAI_API_KEY is securely set in your .env.local file for Next.js
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    let transcript: string; // Declare transcript outside try-catch for broader scope

    try {
        const body = await request.json();
        transcript = body.transcript;
    } catch (error) {
        console.error("Error parsing request body:", error);
        return NextResponse.json({ error: 'Invalid request body. Expected JSON.' }, { status: 400 });
    }

    // Validate if the transcript is provided
    if (!transcript || typeof transcript !== 'string') {
        return NextResponse.json({ error: 'Transcript (string) is required for evaluation.' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Validate if the OpenAI API key is set
    if (!openaiApiKey) {
        console.error("Server configuration error: OPENAI_API_KEY is not set in environment variables.");
        return NextResponse.json({ error: 'Server configuration error: OpenAI API Key missing.' }, { status: 500 });
    }

    try {
        // Call the OpenAI Chat Completions API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using gpt-4o-mini as per your Python code.
            messages: [
                {
                    role: "system",
                    content: `You are an expert HR interviewer and evaluator. Your task is to evaluate a job candidate's interview performance based on the provided transcript.
                    Provide a concise evaluation summary (2-3 sentences) focusing on strengths and weaknesses related to their communication, problem-solving (if applicable), and overall fit.
                    Then, provide a score out of 10.
                    Format your response strictly as:
                    Evaluation: [Your concise evaluation]
                    Score: [Score]/10`
                },
                {
                    role: "user",
                    content: `Interview Transcript:\n"""\n${transcript.trim()}\n"""` // Use .trim() for consistency
                }
            ],
            temperature: 0.2, // Lower temperature for more consistent scoring
            max_tokens: 300 // Increased max_tokens as in your Python code
        });

        // Extract the evaluation result from the OpenAI response
        const evaluationResult = completion.choices[0].message.content;

        // Return the evaluation if successful, otherwise an error
        if (evaluationResult) {
            return NextResponse.json({ evaluation: evaluationResult });
        } else {
            return NextResponse.json({ error: 'Failed to get evaluation from OpenAI. Response content was empty.' }, { status: 500 });
        }

    } catch (error: any) {
        // Log the error details for debugging
        console.error("Error calling OpenAI API:", error.response?.data || error.message);
        // Return a server error response
        return NextResponse.json({ error: `Internal server error: ${error.message || 'Failed to communicate with OpenAI API.'}` }, { status: 500 });
    }
}