export default class View {
  #debugElement = document.getElementById('debug')
  #fileSizeElement = document.getElementById('file-size')
  #processingProgress = document.getElementById('progress')
  #csvFile = document.querySelector('#csv-file')
  #form = document.querySelector('#form')
  #workerChecker = document.querySelector('#worker')

  configureOnFileChange(fn) {
    this.#csvFile.addEventListener('change', e => {
      fn(e.target.files[0])
    })
  }
  setFileSize(size) {
    this.#fileSizeElement.innerText = `File size: ${size}\n`
  }
  isWorkerEnabled() {
    return this.#workerChecker.checked
  }
  updateProgress(value) {
    this.#processingProgress.value = value
  }
  
  configureOnFormSubmit(fn) {
    this.#form.reset()
    this.#form.addEventListener('submit', (e) => {
      e.preventDefault()
      const file = this.#csvFile.files[0]
      if (!file) {
        alert('Please select a file')
        return
      }

      this.updateDebugLog("")

      const form = new FormData(e.currentTarget)
      const description = form.get('description')

      fn({ description, file })

    })
  }

  updateDebugLog(text, reset = true) {
    if (reset) {
      this.#debugElement.innerText = text
      return
    }

    this.#debugElement.innerText += text
  }

}