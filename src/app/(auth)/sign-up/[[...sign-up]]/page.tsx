import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <SignUp
                appearance={{
                    elements: {
                        formButtonPrimary: 'bg-primary hover:bg-primary/90',
                        card: 'bg-background border border-border shadow-xl',
                    }
                }}
            />
        </div>
    );
}
