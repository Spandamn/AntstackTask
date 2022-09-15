const aws = require('aws-sdk');
const config = {
    region: "us-east-1",
};
const lambda = new aws.Lambda(config);
const s3 = new aws.S3();
const dynamodb = new aws.DynamoDB(config);

exports.handler = async (event) => {
    console.log("Inside Lambda Function - Triggered by S3 bucket");
    let bucket = event['Records'][0]['s3']['bucket']['name'];
    let file  = event['Records'][0]['s3']['object']['key'];
    let params = {
        Bucket: bucket,
        Key: file
    };
    if (!params.Key.endsWith(".json")) return;
    const jsonData = JSON.parse(((await s3.getObject(params).promise()).Body || "").toString());
    params = {
        FunctionName: process.env.createEntry, // the lambda function we are going to invoke
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify(jsonData)
    };
    console.log(params);
    const lambdaResult = await lambda.invoke(params).promise();
    let data = JSON.parse(lambdaResult.Payload);
        console.log(data);
    try {
        let resp = await dynamodb.putItem({
            TableName: process.env.detailTable,
            Item: { ...data }
        }).promise();
        console.log(resp);
    } catch (e) {
        console.log(e);
    }
};
