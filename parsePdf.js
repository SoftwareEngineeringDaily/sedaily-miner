const https = require('https')
const flatten = require('lodash/flatten')
const pdfreader = require('pdfreader')

async function bufferize(url) {
  let location = url.substring(url.search("//") + 2)
  let hostname = location.substring(0, location.search("/"))
  let path = location.substring(location.search("/"))
  let buff = new Buffer.alloc(0)

  const options = {
    hostname,
    port: 443,
    path,
    method: 'GET',
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      res.on('data', d => {
        buff = Buffer.concat([ buff, d ])
      })
      res.on('end', () => {
        resolve(buff)
      })
    })

    req.on('error', err => {
      console.error('https request error: ' + err)
    })

    req.end()
  })
}

/**
 * if second param is set then a space ' ' inserted whenever text
 * chunks are separated by more than xwidth
 * this helps in situations where words appear separated but
 * this is because of x coords (there are no spaces between words)
 * each page is a different array element
 */
async function readlines(buffer, xwidth) {
  return new Promise((resolve, reject) => {
    let pdftxt = new Array()
    let pg = 0

    new pdfreader.PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        return console.log('pdf reader error: ' + err)
      }

      if (!item) {
        pdftxt.forEach((a, idx) => {
          pdftxt[idx].forEach((v, i) => {
            pdftxt[idx][i].splice(1, 2)
          })
        })

        return resolve(pdftxt)
      }

      if (item && item.page) {
        pg = item.page - 1
        pdftxt[pg] = []
        return
      }

      if (item.text) {
        var t = 0
        var sp = ''

        pdftxt[pg].forEach((val, idx) => {
          if (val[1] == item.y) {
            if (xwidth && item.x - val[2] > xwidth) {
              sp += ' '
            } else {
              sp = ''
            }
            pdftxt[pg][idx][0] += sp + item.text
            t = 1
          }
        })

        if (t == 0) {
          pdftxt[pg].push([ item.text, item.y, item.x ])
        }
      }
    })
  })
}

async function index(url) {
  let buffer = await bufferize(url)
  let lines = await readlines(buffer)
  let transcriptHtml = ''
  let isEnd = false

  lines = await JSON.parse(JSON.stringify(lines))
  lines.forEach(page => {
    flatten(page).forEach(p => {
      let regExpStrong = /\[[0-9]+?:[0-9]+?:[0-9]+?.+:/g
      let isValid = (
        p !== 'Transcript' &&
        p !== '© 2017 Software Engineering Daily' &&
        p.search(/([A-Z])\w+\s[0-9]/g) < 0 &&
        p.search(/\\[a-z]\d+/g) < 0
      )

      isEnd = (p.trim() === '[END]' || isEnd)

      p = p.replace(regExpStrong, txt => {
        return `</p><p><strong>${txt}</strong>`
      })

      if (p.trim() === '[INTRODUCTION]') {
        p = `<p>${p.trim()}`
      }

      if ([ '[SPONSOR MESSAGE]', '[INTERVIEW]', '[INTERVIEW CONTINUED]', '[END OF INTERVIEW]' ].indexOf(p) >= 0) {
        p = `</p><p>${p.trim()}`
      }

      if (isValid && !isEnd) {
        transcriptHtml += p
      }
    })
  })

  transcriptHtml += `${transcriptHtml}</p><br />`

  return transcriptHtml
}

module.exports = index
