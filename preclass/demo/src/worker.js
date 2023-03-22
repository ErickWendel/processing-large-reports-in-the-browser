import Service from './service.js'
const service = new Service()

console.log(`I'm alive!`)
postMessage({ eventType: 'alive' })

onmessage = ({ data }) => {
  const { query, file } = data
  service.processFile({
    query,
    file,
    onProgress: (total) => postMessage({ eventType: 'progress', total }),
    onOcurrenceUpdate: (args) => {
      postMessage({ eventType: 'ocurrenceUpdate', ...args })
    }
  })
}