import Controller from "./controller.js"
import Service from "./service.js"
import View from "./view.js"

// worker modules só funciona no chrome por enquanto
// ou seja worker funciona, mas import/export nao
const worker = new Worker('./src/worker.js', {
  type: "module"
})


Controller.init({
  view: new View(),
  service: new Service(),
  worker
})