/**
 * Script to create a test user in Clerk for E2E testing
 * Uses Clerk's test mode with +clerk_test email suffix for automatic OTP bypass
 * Run with: npx ts-node scripts/create-test-user.ts
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY environment variable is required')
    process.exit(1)
}

// Use Clerk's test mode email format: any email with +clerk_test bypass gets OTP code 424242
const TEST_USER = {
    email: 'crochetai+clerk_test@gmail.com',
    username: 'e2e_test_user_v2',
    phoneNumber: '+15555550100',
    password: 'E2eTestPassword123',
    firstName: 'E2E',
    lastName: 'TestUser',
}

async function createTestUser() {
    console.log('🔧 Creating test user in Clerk...')

    try {
        // First, check if user already exists
        const searchResponse = await fetch(
            `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(TEST_USER.email)}`,
            {
                headers: {
                    'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        )

        const existingUsers = await searchResponse.json()

        if (existingUsers.length > 0) {
            console.log('✅ Test user already exists!')
            console.log(`   Email: ${TEST_USER.email}`)
            console.log(`   User ID: ${existingUsers[0].id}`)
            console.log(`   OTP Code: 424242 (Clerk test mode)`)
            return existingUsers[0]
        }

        // Create new user
        const createResponse = await fetch('https://api.clerk.com/v1/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email_address: [TEST_USER.email],
                username: TEST_USER.username,
                phone_number: [TEST_USER.phoneNumber],
                password: TEST_USER.password,
                first_name: TEST_USER.firstName,
                last_name: TEST_USER.lastName,
                skip_password_checks: true,
                skip_password_requirement: false,
            }),
        })

        if (!createResponse.ok) {
            const error = await createResponse.json()
            throw new Error(`Failed to create user: ${JSON.stringify(error)}`)
        }

        const newUser = await createResponse.json()
        console.log('✅ Test user created successfully!')
        console.log(`   Email: ${TEST_USER.email}`)
        console.log(`   Password: ${TEST_USER.password}`)
        console.log(`   User ID: ${newUser.id}`)
        console.log(`   OTP Code: 424242 (Clerk test mode)`)

        return newUser
    } catch (error) {
        console.error('❌ Error creating test user:', error)
        process.exit(1)
    }
}

createTestUser()
