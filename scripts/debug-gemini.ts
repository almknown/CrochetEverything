
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('GEMINI_API_KEY not found in environment');
        return;
    }

    console.log('Testing Gemini API with key:', key.substring(0, 10) + '...');

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const resp = await fetch(url);
        if (!resp.ok) {
            console.error('Failed to list models:', resp.status, resp.statusText);
            console.error(await resp.text());
        } else {
            const data = await resp.json();
            console.log('Available Models:');
            const models = (data.models || []).map((m: any) => m.name);
            console.log(models);

            console.log('\nChecking for gemini-1.5-flash...');
            if (models.some((m: string) => m.includes('gemini-1.5-flash'))) {
                console.log('✅ gemini-1.5-flash is available.');
            } else {
                console.log('❌ gemini-1.5-flash is NOT in the list.');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
