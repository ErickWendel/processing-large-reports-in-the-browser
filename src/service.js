export default class Service {

  processFile({ query, file, onOcurrenceUpdate, onProgress }) {
    const linesLength = { counter: 0 }

    file.stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(this.#updateProgressbar({ onProgress, fileSize: file.size }))
      .pipeThrough(this.#csvToJSON())
      .pipeThrough(this.#countBytes(linesLength))
      .pipeThrough(this.#findOcurrencies(query))
      .pipeTo(this.#notifyProgress({ onOcurrenceUpdate, linesLength }))
    // .pipeTo(new WritableStream({
    //   write(chunk) {
    // console.log('chunk', chunk)
    //   }
    // }))
  }

  #updateProgressbar({ onProgress, fileSize }) {
    let totalUploaded = 0
    onProgress(0)
    const progressFn = (chunkLength) => {
      totalUploaded += chunkLength
      const total = 100 / fileSize * totalUploaded
      onProgress(total)
    }

    return new TransformStream({
      transform(chunk, controller) {
        progressFn(chunk.length)
        controller.enqueue(chunk)
      }
    })
  }

  #notifyProgress({ onOcurrenceUpdate, linesLength }) {
    const startedAt = performance.now()
    const elapsed = () => `${((performance.now() - startedAt) / 1000).toFixed(2)} secs`
    return new WritableStream({
      write(found) {
        onOcurrenceUpdate({
          found,
          took: elapsed(),
          linesLength: linesLength.counter
        })
      },
    })
  }

  #countBytes(linesLength) {
    return new TransformStream({
      transform(chunk, controller) {
        linesLength.counter++

        controller.enqueue(chunk)
      }
    })
  }

  #csvToJSON() {
    // it'll ensure if we got a chunk that is not completed and doesn't have a breakline
    // will concat in memory and try concating with the next chunk
    let _buffer = ''
    let _delimiter = ','
    let _columns = ''
    const INDEX_NOT_FOUND = -1
    const BREAK_LINE_SYMBOL = '\n'
    return new TransformStream({
      transform(chunk, controller) {

        // it'll ensure if we got a chunk that is not completed 
        // and doesnt have a breakline 
        // will concat with the previous read chunk
        // 1st time = 01,
        // 2st time = ,erick,adreress\n
        // try parsing and returning data!
        _buffer = _buffer.concat(chunk)

        let breaklineIndex = 0
        while (breaklineIndex !== INDEX_NOT_FOUND) {
          breaklineIndex = _buffer.indexOf(BREAK_LINE_SYMBOL)
          if (breaklineIndex === INDEX_NOT_FOUND) break

          const lineData = consumeLineData(breaklineIndex)

          // first line is the column
          if (!_columns.length) {
            _columns = lineData.split(_delimiter)
            continue
          }
          // ignore this line if it's an empty line
          if (lineData === BREAK_LINE_SYMBOL) continue

          const result = getJSONLine(lineData)
          if (!result) continue

          controller.enqueue(result)
        }
      }
    })

    function consumeLineData(breaklineIndex) {
      const lineToProcessIndex = breaklineIndex + BREAK_LINE_SYMBOL.length
      const line = _buffer.slice(0, lineToProcessIndex)
      // I'll remove from the main buffer the data
      // we already processed!
      _buffer = _buffer.slice(lineToProcessIndex)

      return line
    }

    function getJSONLine(lineData) {
      const removeBreakLine = (text) => text.replace(BREAK_LINE_SYMBOL, "")
      const JSONStr = []
      const headers = Array.from(_columns)
      for (const lineValue of lineData.split(_delimiter)) {
        const key = removeBreakLine(headers.shift())
        const value = removeBreakLine(lineValue)
        if (key === value) break

        const finalValue = value.trimEnd().replace(/"/g, '')
        JSONStr.push(`"${key}":"${finalValue}"`)
      }

      if (!JSONStr.length) return null

      const data = JSONStr.join(',')
      return JSON.parse('{'.concat(data).concat('}'))
    }
  }

  #findOcurrencies(query) {
    const queryKeys = Object.keys(query)
    let found = {}

    return new TransformStream({
      transform(item, controller) {
        for (const keyIndex in queryKeys) {
          const key = queryKeys[keyIndex]
          const queryValue = query[key]
          found[queryValue] = found[queryValue] ?? 0
          if (queryValue.test(item[key])) {
            found[queryValue]++
          }

          controller.enqueue(found)
        }
      },
    })
  }

}