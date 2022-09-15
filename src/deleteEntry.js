const aws = require('aws-sdk');
const config = {
    apiVersion: "2012-08-10",
    region: "us-east-1",
};
const dynamodb = new aws.DynamoDB(config);

exports.handler = async (event) => {
    console.log("Inside Lambda Function - DELETE");
    let data = JSON.parse(event.body);

    // First, delete data from academic table. studentid is the primary key, while assesment is the sort key
    let params = {
        'RequestItems': {}
    };
    const assesments = ['Assement1', 'Assement2', 'Assement3', 'Assement4', 'Assement5', 'Assement6', 'mid-term', 'Finalexam'];
    params['RequestItems'][process.env.academicTable] = [];
    for (let asses of assesments) {
        let item = {
            DeleteRequest: {
                Key: {
                    "studentid": {S: data.id},
                    "assesment": {S: asses},
                },
            },
        };
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
    console.log("OK ---- DELETED DATA FROM ACADEMIC TABLE!!!");

    // Secondly, delete data from attendance table. studentid is the primary key, while month is the sort key.
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    params = {
        'RequestItems': {}
    };
    params['RequestItems'][process.env.attendanceTable] = [];
    for (let month of months) {
        let item = {
            DeleteRequest: {
                Key: {
                    "studentid": {S: data.id},
                    "month": {S: month},
                },
            },
        };
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
    console.log("OK ---- DELETED DATA FROM ATTENDANCE TABLE!!!");

    // Thirdly, delete item from StudentDeets table.
    try {
        let resp = await dynamodb.deleteItem({
            TableName: process.env.detailTable,
            Key: {
                "studentid": {
                    S: data.id
                }
            },
            ConditionExpression: "attribute_exists(studentid)"
        }).promise();
        console.log(resp);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
    return {
        statusCode: 200,
        body: "SUCCESS - DATA DELETED FROM DATABASES!"
    }
};
