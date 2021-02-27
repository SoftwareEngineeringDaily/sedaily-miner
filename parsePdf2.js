let fs = require('fs'),
PDFParser = require("pdf2json");
const https = require('https');
const { resolve } = require('url');




const getTranscript = async(url) => {
    let buffer = await bufferize(url);
    let transcript = await parsePdf(buffer);
    return transcript;
}

async function parsePdf(buffer){
    const INVALID_STRINGS = [
        '[INTRODUCTION]',
        '[SPONSOR MESSAGE]',
        '[INTERVIEW]',
        '[INTERVIEW CONTINUED]',
        '[INTERVIEW CONTINUED ]',
        '[END OF INTERVIEW]'
      ]
    const regExpStrong = /\[[0-9]+?:[0-9]+?:[0-9]+?.+:/g
    let pdfParser = new PDFParser(this,1);
    let transcriptHtml = ''

    return new Promise((resoive, reject) => {
        pdfParser.parseBuffer(buffer);
        pdfParser.on("pdfParser_dataError", errData => {
            resolve('<p></p>')
        });
        pdfParser.on("pdfParser_dataReady", pdfData => {
            arrayOfLines = pdfParser.getRawTextContent().match(/[^\n]+/g);
            let isSponsor = false
            let isEnd = false
            arrayOfLines.forEach(line => {

                if (line.search(/\[SPONSOR MESSAGE\]/ig) >= 0) {
                    isSponsor = true
                }
                if (isSponsor && line.search(/\[INTERVIEW/ig) >= 0) {
                    isSponsor = false
                }
                line = line.replace(/\r/g, '');
                line = line.trim();

                const isValid = (
                    !isSponsor &&
                    line !== 'Transcript' &&
                    INVALID_STRINGS.indexOf(line) < 0 &&
                    line.search(/([A-Z])\w+\s[0-9]/g) < 0 &&
                    line.search(/\\[a-z]\d+/g) < 0
                )


                
                isEnd = (line === '[END]' || isEnd)
                
                line = line.replace(regExpStrong, txt => {
                    return `</p><p><strong>${txt}</strong>`
                })
                line = line.replace(/©\s20(\d+) Software Engineering Daily\0?\d+/g, '')
                line = line.replace(/-+Page \(\d+\) Break-+/gm, '')
                if (isValid && !isEnd) {
                    if(line === '' && transcriptHtml !== ''){
                        transcriptHtml += '</p><p>'
                    }else if(line !== ''){
                        transcriptHtml += line
                        transcriptHtml += ' ';
                    }
                }
            });
            transcriptHtml = `<p>${transcriptHtml}</p>`;
            resoive(transcriptHtml);
        });
    })
}

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

module.exports = getTranscript
