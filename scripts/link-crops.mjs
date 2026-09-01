import { readFileSync, writeFileSync } from 'node:fs'

const crops = JSON.parse(readFileSync('scripts/crops.json', 'utf8'))
const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))

let applied = 0, cleared = 0
for (const e of entities) {
  const c = crops[e.id]
  if (c) { e.crop = c; applied++ }
  else if (e.crop) { delete e.crop; cleared++ }
}

writeFileSync('src/data/entities.json', JSON.stringify(entities, null, 2) + '\n')
console.log(`قصّات مطبَّقة ${applied} · محذوفة ${cleared}`)
