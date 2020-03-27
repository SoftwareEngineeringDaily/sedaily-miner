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
      reject(err)
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
        console.log('pdf reader error: ' + err)
        return resolve()
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
        return resolve(pdftxt)
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

        return resolve(pdftxt)
      }
    })
  })
}

async function index(url) {
  const INVALID_STRINGS = [
    '[INTRODUCTION]',
    '[SPONSOR MESSAGE]',
    '[INTERVIEW]',
    '[INTERVIEW CONTINUED]',
    '[INTERVIEW CONTINUED ]',
    '[END OF INTERVIEW]'
  ]

  let buffer = await bufferize(url)
  let lines = await readlines(buffer, 1)
  let transcriptHtml = ''
  let isSponsor = false
  let isEnd = false

  lines = await JSON.parse(JSON.stringify(lines))
  lines.forEach(_page => {
    const page = flatten(_page)
    page.forEach((p, i) => {
      if (p.search(/\[SPONSOR MESSAGE\]/ig) >= 0) {
        isSponsor = true
      }

      if (isSponsor && p.search(/\[INTERVIEW/ig) >= 0) {
        isSponsor = false
      }

      const regExpStrong = /\[[0-9]+?:[0-9]+?:[0-9]+?.+:/g
      const isValid = (
        p &&
        !isSponsor &&
        p !== 'Transcript' &&
        INVALID_STRINGS.indexOf(p) < 0 &&
        p.search(/([A-Z])\w+\s[0-9]/g) < 0 &&
        p.search(/\\[a-z]\d+/g) < 0
      )

      isEnd = (p.trim() === '[END]' || isEnd)

      // Handle speaker title
      p = p.replace(regExpStrong, txt => {
        return `</p><p><strong>${txt}</strong>`
      })

      if (isValid && !isEnd) {
        transcriptHtml += p
      }
    })
  })

  // Removes page footers
  transcriptHtml = transcriptHtml.replace(/©\s20(\d+) Software Engineering Daily\0?\d+/g, '')

  // Separate paragraphs
  transcriptHtml = transcriptHtml.replace(/.\.[a-zA-Z]/g, txt => {
    return txt.replace(/\./, '.</p><p>')
  })

  // Closes transcript HTML
  transcriptHtml += `${transcriptHtml}</p><br />`

  return transcriptHtml
}

module.exports = index
