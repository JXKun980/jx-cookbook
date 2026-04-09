import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = 'JXKun980'
const REPO_NAME = 'Obsidian-Vault'
const NOTES_PATH = 'JX-universe/📃Notes'

async function fetchFileList() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(NOTES_PATH)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) throw new Error(`Failed to fetch file list: ${res.status} ${res.statusText}`)
  const files = await res.json()
  return files.filter((f) => f.name.endsWith('.md'))
}

async function fetchFileContent(file) {
  const res = await fetch(file.download_url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${file.name}: ${res.status}`)
  return res.text()
}

function parseRecipe(filename, content) {
  const { data: frontmatter, content: body } = matter(content)

  // Check if it's a recipe
  const upField = frontmatter.Up || frontmatter.up || []
  const isRecipe = upField.some((u) => u.includes('MOC Recipe'))
  if (!isRecipe) return null

  const title = filename.replace('.md', '')
  const flavour_profile = frontmatter.flavour_profile || frontmatter.flavor_profile || []

  // Parse sections from body
  const sections = {}
  let currentSection = null
  const lines = body.split('\n')

  for (const line of lines) {
    const h1Match = line.match(/^# (.+)/)
    if (h1Match) {
      currentSection = h1Match[1].trim()
      sections[currentSection] = { subsections: {}, lines: [] }
      continue
    }
    if (currentSection && sections[currentSection]) {
      sections[currentSection].lines.push(line)
    }
  }

  // Parse description
  const descSection = sections['Description']
  const description = descSection
    ? descSection.lines.filter((l) => l.trim()).join(' ').trim()
    : ''

  // Parse ingredients
  const ingSection = sections['Ingredients']
  const ingredients = {}
  if (ingSection) {
    let currentGroup = '_default'
    for (const line of ingSection.lines) {
      const h2Match = line.match(/^## (.+)/)
      if (h2Match) {
        currentGroup = h2Match[1].trim()
        continue
      }
      const ingMatch = line.match(/^- (.+)\|(.+)$/)
      if (ingMatch) {
        if (!ingredients[currentGroup]) ingredients[currentGroup] = []
        ingredients[currentGroup].push({
          name: ingMatch[1].trim(),
          qty: ingMatch[2].trim(),
        })
      }
    }
  }

  // Parse steps
  const stepsSection = sections['Steps']
  const steps = stepsSection
    ? stepsSection.lines
        .filter((l) => l.trim() && !l.startsWith('```'))
        .join('\n')
        .trim()
    : ''

  return { title, description, flavour_profile, ingredients, steps }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.log('⚠ No GITHUB_TOKEN set — using mock data')
    return
  }

  console.log('📡 Fetching recipes from GitHub...')

  const files = await fetchFileList()
  console.log(`📄 Found ${files.length} markdown files`)

  const recipes = []
  for (const file of files) {
    const content = await fetchFileContent(file)
    const recipe = parseRecipe(file.name, content)
    if (recipe) {
      recipes.push(recipe)
      console.log(`  ✓ ${recipe.title}`)
    }
  }

  console.log(`\n🍳 Parsed ${recipes.length} recipes`)

  const outPath = path.join(process.cwd(), 'src', 'data', 'dishes.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(recipes, null, 2))
  console.log(`💾 Saved to ${outPath}`)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
