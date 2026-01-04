/**
 * Script to update test user password in Clerk
 * Run with: npx tsx scripts/update-test-user-password.ts
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const USER_ID = 'user_37mlu1zbnZPixsfVoVhNPHfT3p4'
const NEW_PASSWORD = 'E2eTestPassword123'

if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY environment variable is required')
    process.exit(1)
}

async function updatePassword() {
    console.log('🔧 Updating test user password in Clerk...')

    try {
        const response = await fetch(`https://api.clerk.com/v1/users/${USER_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: NEW_PASSWORD,
                skip_password_checks: true,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to update password: ${JSON.stringify(error)}`)
        }

        console.log('✅ Password updated successfully!')
        console.log(`   New Password: ${NEW_PASSWORD}`)
    } catch (error) {
        console.error('❌ Error updating password:', error)
        process.exit(1)
    }
}

updatePassword()
