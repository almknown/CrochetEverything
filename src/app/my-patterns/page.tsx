'use client';

import dynamic from 'next/dynamic';

// Dynamically import with SSR disabled to avoid Clerk hooks during static generation
const MyPatternsContent = dynamic(
    () => import('./MyPatternsContent'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-slate-600 border-t-pink-500 rounded-full animate-spin" />
            </div>
        ),
    }
);

export default function MyPatternsPage() {
    return <MyPatternsContent />;
}
