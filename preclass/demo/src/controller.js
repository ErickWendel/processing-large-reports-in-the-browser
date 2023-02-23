export default class Controller {
  #view
  #service
  #worker
  #events = {
    alive: () => { },
    ocurrenceUpdate: ({ found, linesLength, took }) => {
      const [[key, value]] = Object.entries(found)
      this.#view.updateDebugLog(`found ${value} ocurrencies of ${key} - over ${linesLength} lines - took: ${took}`)
    },
    progress: ({ total }) => {
      this.#view.updateProgress(total)
    }
  }

  constructor({ view, service, worker }) {
    this.#service = service
    this.#view = view
    this.#worker = this.#configureWorker(worker)

  }

  static init(deps) {
    const controller = new Controller(deps)
    return controller.init()
  }

  init() {
    this.#view.configureOnFileChange(this.#configureOnFileChange.bind(this))
    this.#view.configureOnFormSubmit(this.#configureOnFormSubmit.bind(this))
  }

  #configureWorker(worker) {
    worker.onmessage = ({ data }) => this.#events[data.eventType](data)
    return worker
  }

  #formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']

    let i = 0

    for (i; bytes >= 1024 && i < 4; i++) {
      bytes /= 1024
    }

    return `${bytes.toFixed(2)} ${units[i]}`
  }

  #configureOnFileChange(file) {
    const size = file.size
    this.#view.setFileSize(this.#formatBytes(size))
  }

  #configureOnFormSubmit({ description, file }) {
    const query = {}
    query["call description"] = new RegExp(description, 'i')
    if (this.#view.isWorkerEnabled()) {
      console.log('executing on worker thread!')
      this.#worker.postMessage({ query, file })
      return
    }

    console.log('executing on main thread!')
    // sem worker
    this.#service.processFile({
      query,
      file,
      onProgress: (total) => {
        this.#events.progress({ total })
      },
      onOcurrenceUpdate: (...args) => {
        this.#events.ocurrenceUpdate(...args)
      }
    })
  }
}