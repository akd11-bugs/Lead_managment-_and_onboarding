// Seed 25 realistic B2B leads across the 7-stage pipeline, with activities.
// Designed so dashboard alerts can fire (some leads with no activity past N days).

import { PrismaClient } from '@prisma/client'
import { clearAllLeadData } from './seed-helpers'

const prisma = new PrismaClient()

const STAGES = ['new', 'contacted', 'follow_up', 'qualified', 'proposal', 'onboarding', 'lost'] as const

const SOURCES = ['website', 'referral', 'linkedin', 'cold_outreach', 'event', 'other'] as const
const QUALITY_LEVELS = ['low', 'medium', 'high'] as const

const FIRST_NAMES = ['Ravi', 'Priya', 'Arjun', 'Anika', 'Vikram', 'Sneha', 'Rohit', 'Meera', 'Karan', 'Ishita']
const LAST_NAMES = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Das', 'Mehta']
const COMPANIES = [
  'CloudStack Labs', 'NovaTech Systems', 'Bharat Logistics', 'Indus Fintech',
  'GreenLeaf SaaS', 'Orion Analytics', 'Zenith Manufacturing', 'Maya EdTech',
  'Himalaya BPO', 'Kerala Spice Co', 'Mumbai Realty Group', 'Delhi Design House',
  'Namma Auto Parts', 'Tata Tier Suppliers', 'Wipro Spin-off', 'Infosys Alumni',
  'PixelCraft Studios', 'BlueDart Integrators', 'Reliance Marketing Arm',
  'Adani Solar Solutions',
]
const TITLES = ['CEO', 'CTO', 'Head of Sales', 'VP Marketing', 'Director Ops', 'Founder', 'Procurement Lead', 'Head of IT']
const INDUSTRIES = ['Fashion', 'Apparel', 'F&B', 'Electronics', 'Logistics', 'SaaS', 'Manufacturing', 'EdTech']
const BUSINESS_TYPES = ['b2b', 'b2c'] as const

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]
}

function assertSafeToSeedDestructively() {
  const url = process.env.DATABASE_URL ?? ''
  const looksLocal = /localhost|127\.0\.0\.1/.test(url)
  if (!looksLocal && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    console.error(
      '❌ Refusing to run: DATABASE_URL does not look like a local database.\n' +
      '   This script deletes ALL leads, activities, and skill runs before reseeding.\n' +
      '   If you really want to run this against this database, re-run with:\n' +
      '   ALLOW_DESTRUCTIVE_SEED=true npm run db:seed'
    )
    process.exit(1)
  }
}

async function main() {
  assertSafeToSeedDestructively()

  console.log('🧹 Clearing existing data...')
  await clearAllLeadData(prisma)

  console.log('🌱 Seeding 25 leads...')
  const now = new Date()
  const leads = []

  for (let i = 0; i < 25; i++) {
    const stageIdx = Math.min(STAGES.length - 1, Math.floor(i / 3.5))
    const stage = STAGES[stageIdx]
    const source = pick(SOURCES, i)
    const firstName = pick(FIRST_NAMES, i)
    const lastName = pick(LAST_NAMES, i + 3)
    const company = pick(COMPANIES, i)
    const title = pick(TITLES, i + 1)

    // Some leads are stale to trigger skill alerts
    let daysSinceActivity = Math.floor(Math.random() * 60) + 1
    if (i % 7 === 0) daysSinceActivity = 75   // very stale — triggers ghosted-after-the-demo
    if (i % 11 === 0) daysSinceActivity = 120 // ancient — triggers hygiene audit

    const createdAt = new Date(now.getTime() - (60 + i * 2) * 86400000)
    const lastActivityAt = new Date(now.getTime() - daysSinceActivity * 86400000)

    // ₹5L–₹1Cr per deal — realistic scale for the BD "expected volume in Cr" reporting
    const estimatedVolume = stage === 'lost' ? 0 : Math.round((500000 + Math.random() * 9500000) / 10000) * 10000

    const type: 'partner' | 'merchant' = i % 5 === 0 ? 'partner' : 'merchant'

    const PROPOSAL_SUB_STAGES = ['commercial_agreed', 'agreement_shared', 'agreement_done'] as const
    const proposalSubStage = stage === 'proposal' ? pick(PROPOSAL_SUB_STAGES, i) : null

    const ONBOARDING_SUB_STAGES = [
      'document_submission',
      'document_verification',
      'psp_verification',
      'final_onboarded',
    ] as const
    const onboardingSubStage = stage === 'onboarding' ? pick(ONBOARDING_SUB_STAGES, i) : null

    // Onboarding leads: some have completed the full sub-pipeline, some are
    // still mid-way — that gap is the whole point of tracking onboardedAt
    // separately from stage. Pinned to a day within the current month (not
    // "N days ago") so the BD summary's "this month" tiles have something to count.
    const onboardedAt =
      stage === 'onboarding' && onboardingSubStage === 'final_onboarded'
        ? new Date(now.getFullYear(), now.getMonth(), 1 + (i % 20))
        : null

    // Leads still in play get a forecast date — split across this month and next,
    // so "expected to onboard by month end" has something real to count.
    const expectedCloseDate =
      stage === 'qualified' || stage === 'proposal'
        ? new Date(now.getFullYear(), now.getMonth() + (i % 3 === 0 ? 1 : 0), 5 + (i % 20))
        : null

    const lead = await prisma.lead.create({
      data: {
        poc: `${firstName} ${lastName}`,
        company,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.split(' ')[0].toLowerCase()}.com`,
        phone: `+91-9${(100000000 + i * 1234567).toString().slice(0, 9)}`,
        website: `https://${company.split(' ')[0].toLowerCase()}.com`,
        industry: pick(INDUSTRIES, i),
        businessType: pick(BUSINESS_TYPES, i),
        source,
        stage,
        estimatedVolume,
        ownerName: i % 3 === 0 ? 'You' : i % 3 === 1 ? 'Aarav' : 'Diya',
        ownerId: i % 3 === 0 ? 'self' : i % 3 === 1 ? 'aarav' : 'diya',
        effort: pick(QUALITY_LEVELS, i + 2),
        quality: pick(QUALITY_LEVELS, i),
        type,
        onboardedAt,
        expectedCloseDate,
        proposalSubStage,
        onboardingSubStage,
        painPoints: i % 2 === 0 ? 'Current vendor has slow settlement times and poor support SLAs.' : '',
        whatTheyWant: i % 2 === 0 ? 'Faster payouts and a dedicated account manager.' : '',
        notes:
          stage === 'proposal'
            ? 'Sent SOW on Monday. Waiting for legal review. Their CFO signed off on budget.'
            : stage === 'qualified'
              ? 'Confirmed budget cycle in Q3. They are comparing us with one competitor. Decision in 3 weeks.'
              : stage === 'follow_up'
                ? 'Positive second call. Asked for customer references in fintech vertical.'
                : stage === 'contacted'
                  ? 'Replied to cold outreach. Wants a 15-min intro call next Tuesday.'
                  : stage === 'onboarding'
                    ? 'Signed 12-month contract at ₹40L ARR. Onboarding kicked off.'
                    : stage === 'lost'
                      ? 'Chose competitor on price. Keep warm for next year renewal cycle.'
                      : 'Imported via website form. Has not been contacted yet.',
        createdAt,
        updatedAt: lastActivityAt,
        lastActivityAt,
        position: i,
      },
    })
    leads.push(lead)

    // Add 2–5 activities per lead
    const actCount = 2 + (i % 4)
    for (let j = 0; j < actCount; j++) {
      const activityDate = new Date(now.getTime() - (j * 7 + 5) * 86400000)
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: pick(['call', 'email', 'meeting', 'note'] as const, j + i),
          description:
            j === 0
              ? 'Discovery call. Discussed current pain points, decision timeline.'
              : j === 1
                ? 'Sent follow-up email with case study matching their vertical.'
                : j === 2
                  ? 'Internal note — they reminded us of Q3 budget cycle'
                  : 'Quick check-in to keep the relationship warm.',
          authorName: lead.ownerName,
          date: activityDate,
        },
      })
    }
  }

  console.log(`✅ Seeded ${leads.length} leads with activities.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })