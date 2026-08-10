import 'virtual:svg-icons-register'

import { addCollection } from '@iconify/vue'
import epIcons from '@iconify/json/json/ep.json'
import faIcons from '@iconify/json/json/fa.json'
import faSolidIcons from '@iconify/json/json/fa-solid.json'

addCollection(epIcons)
addCollection(faIcons)
addCollection(faSolidIcons)

// Keep menu icons that are stored in the database local so a blocked Iconify API
// request cannot turn a route switch into a page-level rendering error.
addCollection({
  prefix: 'simple-icons',
  width: 24,
  height: 24,
  icons: {
    civicrm: {
      body: '<path fill="currentColor" d="M22.565 9.054c.248-.477.45-1.125.235-1.786c-.25-.766-.939-1.275-2.051-1.511l-7.052-1.5L6.496.405C6.418.363 5.717 0 4.951 0C4.38 0 3.888.198 3.527.571c-.337.349-.539.834-.603 1.444a3 3 0 0 0-.199-.006c-1.089 0-1.648.456-1.926.839C.369 3.44.315 4.241.638 5.23l2.649 8.118l.251 7.033c.044 1.222.719 2.536 2.098 2.537q.396 0 .82-.15c.328.556.92 1.232 1.864 1.232c.666 0 1.324-.357 1.956-1.063l5.11-5.697l6.783-4.283c.147-.094 1.444-.95 1.398-2.229c-.022-.642-.362-1.202-1.002-1.674M7.396 20.166l-2.328-7.134l-.316-8.847l8.326 1.771l6.771 3.622l-5.63 6.279zM20.377 7.51c.545.116.709.279.72.313c.021.063-.017.196-.087.344l-1.623-.868zM4.951 1.792c.269 0 .607.145.7.193l1.738.929l-2.693-.573c.013-.323.08-.484.12-.526c.012-.011.062-.023.135-.023m-2.61 2.882c-.195-.595-.093-.773-.092-.774c.019-.026.167-.099.476-.099q.126.001.221.011l.109 3.05zm2.988 15.642l-.029-.798l.514 1.574a.7.7 0 0 1-.178.034c-.146 0-.293-.5-.307-.81m3.614 1.424c-.414.463-.62.468-.622.468c-.058 0-.185-.132-.301-.317l1.818-1.148zm12.27-10.299l-1.445.913l1.695-1.89c.249.174.313.298.314.329c.006.133-.287.468-.564.648"/>'
    },
    erpnext: {
      body: '<path fill="currentColor" d="M2.88 0A2.88 2.88 0 0 0 0 2.88v18.24A2.88 2.88 0 0 0 2.88 24h18.24A2.88 2.88 0 0 0 24 21.12V2.88A2.88 2.88 0 0 0 21.12 0Zm5.04 5.76h8.254v2.146H7.92Zm0 5.033h7.85v2.146h-5.233v2.954h5.703v2.146H7.92Z"/>'
    }
  }
})
