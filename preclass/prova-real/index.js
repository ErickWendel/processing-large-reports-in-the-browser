import { createReadStream } from 'node:fs'
import csvtojson from 'csvtojson'
import { pipeline } from 'node:stream/promises'
import { Writable } from 'node:stream'
let lines = 0
let ocurrences = 0
const word = process.argv[2]?.trim()
console.time('search')
console.log('searching for...', word)
await pipeline(
  createReadStream('./database.csv'),
  csvtojson(),
  new Writable({
    write(chunk, enc, cb) {
      lines++
      if (new RegExp(word, 'i').test(JSON.parse(chunk)['call description'])) {
        ocurrences++
      }
      cb()
    }
  })
)

console.log({ lines, ocurrences })

console.timeEnd('search')