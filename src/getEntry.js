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
    console.log(event);
    let data = (event.body && typeof event.body === 'string') ? JSON.parse(event.body) : event;
    console.log(data);
    let details = data.details;
    let studentid = data.id;
    let reportType = data.type;
    data = {};
    // Fetch data from detail table
    try {
        data = await dynamodb.getItem({
            "TableName": process.env.detailTable,
            "Key": {
                studentid: {
                    S: studentid
                }
            }
        }).promise();
    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
    data = data.Item;
    console.log(data);
    Object.keys(data).forEach(key => {
        data[key] = Object.values(data[key])[0];
    });

    // Fetch data from academics table
    const subjects = ['social', 'kannada', 'english', 'science', 'maths', 'hindi'];
    let assesments = ['Assement1', 'Assement2', 'Assement3', 'Assement4', 'Assement5', 'Assement6', 'mid-term', 'Finalexam'];
    if (reportType === 'semester') {
        if (details === 'sem1') {
            assesments = ['Assement1', 'Assement2', 'Assement3', 'mid-term'];
        } else if (details === 'sem2') {
            assesments = ['Assement4', 'Assement5', 'Assement6', 'Finalexam'];
        }
    } else if (reportType === 'assessment') {
        if (event.details.startsWith('assessment')) {
            const assesmentNo = event.details.split('assessment')[1];
            assesments = [`Assement${assesmentNo}`];
        } else {
            assesments = [event.details];
        }
    }
    let keys = [];
    assesments.forEach(asses => {
        keys.push({
            "studentid": {
                S: data.studentid
            },
            "assesment": {
                S: asses
            }
        });
    });
    let params = {
        RequestItems: {}
    };
    params.RequestItems[process.env.academicTable] = {
        Keys: keys
    };
    try {
        data.marks = await dynamodb.batchGetItem(params).promise();
        data.marks = data.marks.Responses[process.env.academicTable];
    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        };
    }
    let Marks = {};
    data.marks.forEach(asses => {
        let newAsses = {};
        subjects.forEach(sub => {
            newAsses[sub] = {
                marks: parseInt(asses[sub].N),
                grade: getGrade(parseInt(asses[sub].N))
            }
        });
        Marks[asses['assesment'].S] = newAsses;
    })
    data.marks = Marks;
    data.percent = getPercentage(Object.values(Marks));
    data.grade = getGrade(data.percent);
    

    // Fetch data from attendance table
    params = {
        ExpressionAttributeValues: {
            ':s': {S: data.studentid},
        },
        KeyConditionExpression: 'studentid = :s',
        TableName: process.env.attendanceTable
    };
    try {
        data.attendance = await dynamodb.query(params).promise();
    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
    let newAtt = {
    };
    console.log(data.attendance.Items);
    data.attendance.Items.forEach(month => {
        newAtt[month.month.S] = {
        };
        subjects.forEach(sub => {
            newAtt[month.month.S][sub] = (parseInt(month[sub].N) / parseInt(month.totalEach.N)) * 100;
        })
    })
    data.attendance = newAtt;
    return {
        statusCode: 200,
        body: JSON.stringify(data)
    };
};