const aws = require('aws-sdk');
const config = {
    apiVersion: "2012-08-10",
    region: "us-east-1",
};
const dynamodb = new aws.DynamoDB(config);

const getPercentage = function (assList) {
    let arr = assList;
    let totalMarks = 600 * assList.length;
    let scoredMarks = 0;
    arr.forEach(ass => {
        Object.keys(ass).forEach(sub => {
            scoredMarks += ass[sub].marks;
        });
    });
    return (scoredMarks / totalMarks) * 100;
}

const getGrade = function (marks) {
    if (marks <= 100 && marks >= 70) {
        return 'A';
    } else if (marks <= 69 && marks >= 50) {
        return 'B';
    } else if (marks <= 49 && marks >= 35) {
        return 'C';
    } else if (marks <= 34 && marks >= 0) {
        return 'D';
    }
}

exports.handler = async (event) => {
    console.log("Inside Lambda Function - PUT");
    console.log(event);
    let data = event;
    let percentage = getPercentage(Object.values(data.Marks));
    console.log(percentage);
    let grade = getGrade(percentage);
    console.log(grade);

    // First, put data in academic table. studentid is the primary key, while assesment is the sort key
    let marks = data.Marks;
    let params = {
        'RequestItems': {}
    };
    params['RequestItems'][process.env.academicTable] = [];
    for (let asses in marks) {
        let item = {
            PutRequest: {
                Item: {
                    "studentid": {S: data.id},
                    "assesment": {S: asses},
                },
            },
        };
        for (let subj in marks[asses]) {
            item['PutRequest'].Item[subj] = {N: `${marks[asses][subj].marks}`};
        }
        params['RequestItems'][process.env.academicTable].push(item);
    }
    try {
        let resp = await dynamodb.batchWriteItem(params).promise();
        console.log(resp);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
    console.log("OK ---- ADDED DATA TO ACADEMIC TABLE!!!");

    // Secondly, put data into attendance table. studentid is the primary key, while month is the sort key.
    let attendance = data.Attendance;
    params = {
        'RequestItems': {}
    };
    params['RequestItems'][process.env.attendanceTable] = [];
    for (let month in attendance) {
        let item = {
            PutRequest: {
                Item: {
                    "studentid": {S: data.id},
                    "month": {S: month},
                    "totalEach": {N: `${attendance[month]['social'].total}`}
                },
            },
        };
        for (let subj in attendance[month]) {
            item['PutRequest'].Item[subj] = {N: `${attendance[month][subj].attended}`};
        }
        params['RequestItems'][process.env.attendanceTable].push(item);
    }
    try {
        let resp = await dynamodb.batchWriteItem(params).promise();
        console.log(resp);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
    console.log("OK ---- ADDED DATA TO ATTENDANCE TABLE!!!");

    // Thirdly, return the student details to be put into the StudentDeets table
    return {
        'studentid': {S: data.id},
        'class': {S: data.Class},
        'name': {S: data.Name},
        'dob': {S: data.DOB},
        'percentage': {S: `${percentage}`},
        'grade': {S: grade},
        'father': {S: data.Father},
        'mother': {S: data.Mother},
        'contact': {S: `${data['Contact Number']}`},
        email: {S: data.Email}
    };
};
