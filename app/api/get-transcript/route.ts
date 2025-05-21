// app/api/get-transcript/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    // CORRECTED: Use VAPI_SECRET_KEY as per your .env
    const vapiSecretKey = process.env.VAPI_SECRET_KEY; 

    if (!callId) {
        return NextResponse.json({ error: 'Call ID is required.' }, { status: 400 });
    }

    if (!vapiSecretKey) {
        console.error("VAPI_SECRET_KEY is not set in environment variables.");
        return NextResponse.json({ error: 'Server configuration error: Vapi API Key missing.' }, { status: 500 });
    }

    const url = `https://api.vapi.ai/call/${callId}`;
    const headers = {
        "Authorization": `Bearer ${vapiSecretKey}`, // Use the corrected variable here
        "Content-Type": "application/json"
    };

    try {
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error from Vapi API' }));
            console.error(`Error fetching call details from Vapi: ${response.status} - ${errorData.message || response.statusText}`);
            return NextResponse.json({ error: `Failed to fetch transcript: ${errorData.message || response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        
        if (data && 'transcript' in data) {
            return NextResponse.json({ transcript: data.transcript });
        } else {
            return NextResponse.json({ transcript: 'Transcript not found for this call ID.' });
        }

    } catch (error: any) {
        console.error("Network or parsing error when calling Vapi:", error);
        return NextResponse.json({ error: `Internal server error: ${error.message || 'Failed to connect to Vapi API.'}` }, { status: 500 });
    }
}