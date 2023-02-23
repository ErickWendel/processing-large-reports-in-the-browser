export default class Service {

  #setupProgress(totalBytes, onProgress) {
    let totalUploaded = 0
    onProgress(0)
    return (chunkLength) => {
      totalUploaded += chunkLength
      const total = 100 / totalBytes * totalUploaded
      onProgress(total)
    }
  }

  processFile({ query, file, onOcurrenceUpdate, onProgress }) {
    const startedAt = performance.now()
    const elapsed = () => `${(Math.round(performance.now() - startedAt) / 1000)} secs`
    const progressFn = this.#setupProgress(file.size, onProgress)
    const linesLength = { counter: 0 }
    const onUpdate = () => {
      return (found) => {
        onOcurrenceUpdate({
          found,
          took: elapsed(),
          linesLength: linesLength.counter,
        })
      }
    }

    file.stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(this.#csvToJSON({ progressFn, linesLength }))
      .pipeTo(this.#findOcurrencies({ query, onUpdate: onUpdate() }))
  }

  #findOcurrencies({ query, onUpdate }) {
    const queryKeys = Object.keys(query)
    let found = {}

    return new WritableStream({
      write(chunk) {

        for (const keyIndex in queryKeys) {
          const key = queryKeys[keyIndex]
          const queryValue = query[key]
          found[queryValue] = found[queryValue] ?? 0
          if (queryValue.test(chunk[key])) {
            found[queryValue]++
            onUpdate(found)
          }
        }
      },

      close: () => onUpdate(found)
    })
  }

  #csvToJSON({ linesLength, progressFn }) {
    let columns = []
    return new TransformStream({
      transform(chunk, controller) {
        progressFn(chunk.length)
        const lines = chunk.split('\n')
        linesLength.counter += lines.length -1

        if (!columns.length) {
          const firstLine = lines.shift()
          columns = firstLine.split(',')
          linesLength.counter--
        }

        for (const line of lines) {
          if (!line.length) continue

          const currentColumns = line.split(',')
          let currentItem = {}
          for (const columIndex in currentColumns) {
            const columnItem = currentColumns[columIndex]
            currentItem[columns[columIndex]] = columnItem.trimEnd()
          }

          controller.enqueue(currentItem)
          controller.desiredSize
        }
      },
    })
  }
}