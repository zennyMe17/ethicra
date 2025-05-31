// app/interview/page.tsx
// This file is a Server Component by default, no "use client" here.

import { Suspense } from 'react';
import InterviewLoading from '@/components/InterviewLoading'; // Your loading component
import VapiInterviewBotClient from '@/app/interview/VapiInterviewBotClient'; // Import the new client component

export default function InterviewPage() {
  return (
    // Wrap the Client Component in Suspense
    <Suspense fallback={<InterviewLoading />}>
      <VapiInterviewBotClient />
    </Suspense>
  );
}
