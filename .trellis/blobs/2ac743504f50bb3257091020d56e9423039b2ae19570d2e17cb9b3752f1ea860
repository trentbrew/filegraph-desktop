import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEMO_DIR = path.join(__dirname, '../src/data/demo-files')

// Migration mappings: old ID -> { namespace, slug }
const ID_MIGRATIONS = {
  // Accounts
  'acc-001': { ns: 'acc', slug: 'checking' },
  'acc-002': { ns: 'acc', slug: 'savings' },
  'acc-003': { ns: 'acc', slug: 'investment' },
  'acc-004': { ns: 'acc', slug: 'retirement' },
  'acc-005': { ns: 'acc', slug: 'credit' },

  // Goals
  'goal-emergency': { ns: 'goal', slug: 'emergency' },
  'goal-vacation': { ns: 'goal', slug: 'vacation' },
  'goal-car': { ns: 'goal', slug: 'car' },
  'goal-debt': { ns: 'goal', slug: 'debt' },
  'goal-retirement': { ns: 'goal', slug: 'retirement' },

  // Bills - recurring
  'bill-rent': { ns: 'bill', slug: 'rent' },
  'bill-electric': { ns: 'bill', slug: 'electric' },
  'bill-gas': { ns: 'bill', slug: 'gas' },
  'bill-internet': { ns: 'bill', slug: 'internet' },
  'bill-phone': { ns: 'bill', slug: 'phone' },
  'bill-insurance-car': { ns: 'bill', slug: 'insurance-car' },
  'bill-insurance-health': { ns: 'bill', slug: 'insurance-health' },
  'bill-insurance-renters': { ns: 'bill', slug: 'insurance-renters' },
  'bill-gym': { ns: 'bill', slug: 'gym' },
  'bill-credit': { ns: 'bill', slug: 'credit-payment' },

  // Bills - subscriptions
  'sub-netflix': { ns: 'sub', slug: 'netflix' },
  'sub-spotify': { ns: 'sub', slug: 'spotify' },
  'sub-icloud': { ns: 'sub', slug: 'icloud' },
  'sub-1password': { ns: 'sub', slug: '1password' },
  'sub-youtube': { ns: 'sub', slug: 'youtube' },
  'sub-chatgpt': { ns: 'sub', slug: 'chatgpt' },
  'sub-nytimes': { ns: 'sub', slug: 'nytimes' },
  'sub-github': { ns: 'sub', slug: 'github' },

  // Bills - annual
  'annual-domain1': { ns: 'annual', slug: 'domain-com' },
  'annual-domain2': { ns: 'annual', slug: 'domain-io' },
  'annual-amazon': { ns: 'annual', slug: 'amazon-prime' },
  'annual-costco': { ns: 'annual', slug: 'costco' },
  'annual-aaa': { ns: 'annual', slug: 'aaa' },
  'annual-dmv': { ns: 'annual', slug: 'vehicle-reg' },
  'annual-professional': { ns: 'annual', slug: 'pro-license' },

  // Expenses categories
  'cat-housing': { ns: 'cat', slug: 'housing' },
  'cat-utilities': { ns: 'cat', slug: 'utilities' },
  'cat-food': { ns: 'cat', slug: 'food' },
  'cat-transport': { ns: 'cat', slug: 'transport' },
  'cat-health': { ns: 'cat', slug: 'health' },
  'cat-savings': { ns: 'cat', slug: 'savings' },
  'cat-personal': { ns: 'cat', slug: 'personal' },
  'cat-entertainment': { ns: 'cat', slug: 'entertainment' },

  // Income
  'inc-salary': { ns: 'inc', slug: 'salary' },
  'inc-freelance': { ns: 'inc', slug: 'freelance' },
  'inc-dividends': { ns: 'inc', slug: 'dividends' },
  'inc-interest': { ns: 'inc', slug: 'interest' },

  // Insurance
  'ins-health': { ns: 'ins', slug: 'health' },
  'ins-dental': { ns: 'ins', slug: 'dental' },
  'ins-vision': { ns: 'ins', slug: 'vision' },
  'ins-auto': { ns: 'ins', slug: 'auto' },
  'ins-renters': { ns: 'ins', slug: 'renters' },
  'ins-life': { ns: 'ins', slug: 'life' },
  'ins-umbrella': { ns: 'ins', slug: 'umbrella' },

  // Transactions (tx-1 through tx-15)
  ...Object.fromEntries(
    Array.from({ length: 15 }, (_, i) => [`tx-${i + 1}`, { ns: 'tx', slug: `txn-${String(i + 1).padStart(2, '0')}` }]),
  ),

  // Milestones
  'ms-discovery': { ns: 'ms', slug: 'discovery' },
  'ms-design': { ns: 'ms', slug: 'design' },
  'ms-mvp': { ns: 'ms', slug: 'mvp' },
  'ms-content': { ns: 'ms', slug: 'content' },
  'ms-launch': { ns: 'ms', slug: 'launch' },

  // Organizations
  'org-creative-agency': { ns: 'org', slug: 'creative-agency' },
  'org-techstart': { ns: 'org', slug: 'techstart' },

  // People
  'person-sarah': { ns: 'person', slug: 'sarah' },
  'person-marcus': { ns: 'person', slug: 'marcus' },
  'person-emma': { ns: 'person', slug: 'emma' },
  'person-alex': { ns: 'person', slug: 'alex' },

  // Projects
  'proj-portfolio-001': { ns: 'proj', slug: 'portfolio-website' },

  // Tasks
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [
      `task-${String(i + 1).padStart(3, '0')}`,
      { ns: 'task', slug: `task-${String(i + 1).padStart(2, '0')}` },
    ]),
  ),
}

// Build new ID from migration info
function buildNewId(oldId) {
  const migration = ID_MIGRATIONS[oldId]
  if (!migration) return null
  return `${migration.ns}:${migration.slug}:001`
}

// Get slug from migration
function getSlug(oldId) {
  const migration = ID_MIGRATIONS[oldId]
  return migration ? migration.slug : null
}

// Recursively get all .data files
function getFiles(dir) {
  const subdirs = fs.readdirSync(dir)
  const files = subdirs.map((subdir) => {
    const res = path.resolve(dir, subdir)
    return fs.statSync(res).isDirectory() ? getFiles(res) : res
  })
  return files.reduce((a, f) => a.concat(f), []).filter((f) => f.endsWith('.data'))
}

// Transform object recursively
function transformObject(obj) {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => transformObject(item))
  }

  const result = {}

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' && typeof value === 'string') {
      const newId = buildNewId(value)
      if (newId) {
        result.id = newId
        result.slug = getSlug(value)
      } else {
        result.id = value
      }
    } else if (typeof value === 'string') {
      // Check if this is a reference to an old ID
      const newId = buildNewId(value)
      result[key] = newId || value
    } else if (typeof value === 'object') {
      result[key] = transformObject(value)
    } else {
      result[key] = value
    }
  }

  return result
}

// Main migration
function migrate() {
  const files = getFiles(DEMO_DIR)
  console.log(`\n🔄 Migrating ${files.length} demo files...\n`)

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, 'utf8')
      const data = JSON.parse(content)
      const relativePath = path.relative(DEMO_DIR, file)

      const transformed = transformObject(data)

      // Write back with pretty formatting
      const output = JSON.stringify(transformed, null, 2)
      fs.writeFileSync(file, output + '\n')

      console.log(`✅ Migrated: ${relativePath}`)
    } catch (err) {
      console.error(`❌ Error migrating ${file}: ${err.message}`)
    }
  })

  console.log('\n🎉 Migration complete! Run validator to check.')
}

migrate()
