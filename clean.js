var script = "ry MongoDB today with Atlas, the global cloud database service that runs on AWS, Azure and Google Cloud. Configure, deploy and connect to your database in just a few minutes. Check it out at mongodb.com/atlas. That's mongodb.com/atlas. Thank you to MongoDB for being a sponsor of Software Engineering Daily.[END] © 2019 Software Engineering Daily"

var script2 = '© 2019 Software Engineering Daily'
var re = /©(.*?)Transcript/

var clean_re = /©(.*?)Software Engineering Daily\d$/

var cr_re = /© \d{4} Software Engineering Daily\d/gi
var page_re = /SED \d{3}/

const cleaned = script.replace(cr_re,'') //.replace(page_re,'').replace('Transcript','')
console.log(cleaned)