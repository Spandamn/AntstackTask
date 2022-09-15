const aws = require('aws-sdk');
const config = {
    apiVersion: "2012-08-10",
    region: "us-east-1",
};
const dynamodb = new aws.DynamoDB(config);
const subjects = ['social', 'kannada', 'english', 'science', 'maths', 'hindi'];
const htmlToPdf = require('html-pdf-node');var AWS = require('aws-sdk');
const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

exports.handler = async (event) => {
    let htmlFile = "";
    const data = JSON.parse(event.body);
    htmlFile += `<h1>${data.name}</h1>`;
    htmlFile += '<br/><br/>'
    htmlFile += `Id: ${data.studentid}<br/>`;
    htmlFile += `Class: ${data.class}<br/>`;
    htmlFile += `DOB: ${data.dob}<br/>`;
    htmlFile += '<br/><br/>Result:<br/>'
    Object.keys(data.marks).forEach(asses => {
        htmlFile += `${asses}:<br/>`;
        let result = '';
        if (Object.values(data.marks[asses]).some(val => val.grade === 'D')) {
            result = 'Fail';
        } else {
            result = 'Pass';
        }
        htmlFile += `Result: ${result}<br/>`;
        let total = 0;
        Object.values(data.marks[asses]).forEach(sub => {
            total += sub.marks;
        });
        htmlFile += `Total: ${total}<br/>`;
        htmlFile += `Percentage: ${data.percent}<br/><br/>`
        htmlFile += `Details:<br/>`;
        subjects.forEach(sub => {
            htmlFile += `${sub[0].toUpperCase()}${sub.substring(1)}:<br/>`
            htmlFile += `Marks: ${data.marks[asses][sub].marks}<br/>`
            htmlFile += `Grade: ${data.marks[asses][sub].grade}<br/><br/>`
        });
    });
    htmlFile += '<br/><h2>Attendance Report</h2><br/>'
    for (let month in data.attendance) {
        htmlFile += `${month[0].toUpperCase()}${month.substring(1)}:<br/>`;
        subjects.forEach(sub => {
            htmlFile += `${sub[0].toUpperCase()}${sub.substring(1)}: ${data.attendance[month][sub]}<br/>`;
        });
        htmlFile += "<br/>";
    }
    htmlFile = `<html><body>${htmlFile}</html></body>`;
    let fileLink = '';
    htmlToPdf.generatePdf({content: htmlFile}, {format: "A4"}).then(pdfBuffer =>{ 
        let fileName = `${data.studentid}.pdf`;
        s3.upload({
            Bucket: process.env.bucketName,
            Key: fileName,
            Body: pdfBuffer
        }, (err, data) => {
            if (err) {
                return {
                    body: JSON.stringify(err)
                }
            }
            fileLink = data.Location;
        })
    });
    return {
        link: fileLink
    }
};