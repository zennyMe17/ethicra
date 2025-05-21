// app/api/evaluate-transcript/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai'; // Import the OpenAI library

// Initialize OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Assumes OPENAI_API_KEY is in .env.local
});

export async function POST(request: Request) {
    const { transcript } = await request.json();
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!transcript) {
        return NextResponse.json({ error: 'Transcript is required for evaluation.' }, { status: 400 });
    }

    if (!openaiApiKey) {
        console.error("OPENAI_API_KEY is not set in environment variables.");
        return NextResponse.json({ error: 'Server configuration error: OpenAI API Key missing.' }, { status: 500 });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // You can choose "gpt-3.5-turbo" for faster, cheaper results
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
                    content: `Interview Transcript:\n"""\n${transcript}\n"""`
                }
            ],
            temperature: 0.2, // Lower temperature for more consistent scoring
            max_tokens: 200 // Adjust as needed for the evaluation length
        });

        const evaluationResult = completion.choices[0].message.content;

        if (evaluationResult) {
            return NextResponse.json({ evaluation: evaluationResult });
        } else {
            return NextResponse.json({ error: 'Failed to get evaluation from OpenAI.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Error calling OpenAI API:", error.response ? error.response.data : error.message);
        return NextResponse.json({ error: `Internal server error: ${error.message || 'Failed to communicate with OpenAI API.'}` }, { status: 500 });
    }
}