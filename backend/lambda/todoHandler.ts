import AWS = require("aws-sdk");
import AWSLambda = require("aws-lambda");
import {v4 as uuid} from "uuid";

// the table name that we get from an env variable
const tableName = process.env.TABLE_NAME || "";
// for interacting with dynamoDB from JavaScript / nodeJS
const dynamo = new AWS.DynamoDB.DocumentClient();


const createResponse = (
    body: string | AWS.DynamoDB.DocumentClient.ItemList,
    statusCode = 200
) => {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,DELETE"
        },
        body: JSON.stringify(body, null, 2)
    };
};

// DynamoDB Scan operation scans and returns all of the items in the db
const getAllTodos = async () => {
    return await dynamo
        .scan({
            TableName: tableName
        })
        .promise();
};

const addTodoItem = async (data: { todo: string, id: string }) => {
    const {id, todo} = data;

    if (todo && todo !== "") {
        await dynamo.put({
            TableName: tableName,
            Item: {
                id: id || uuid(),
                todo
            }
        }).promise();
    }
    return todo;
}

async function deleteTodoItem(data: {id: string}) {
    const {id} = data;

    if (id && id !== "") {
        await dynamo.delete({
            TableName: tableName,
            Key: { id }
        }).promise();
    }

    return id;
}

// async function that responds to apiGateway events
exports.handler = async function(event: AWSLambda.APIGatewayEvent) {
    try {
        const { httpMethod, body: requestBody } = event;

        if (httpMethod === "OPTIONS") {
            return createResponse('ok')
        }

        // GET request
        if (httpMethod === "GET") {
            const response = await getAllTodos();

            return createResponse(response.Items || []);
        }

        if (!requestBody) {
            return createResponse("Missing request body", 500)
        }

        const data = JSON.parse(requestBody);

        if (httpMethod === 'POST') {
            const todo = await addTodoItem(data);
            return todo
                ? createResponse(`${todo} added to the database`)
                : createResponse("Todo is missing", 500);
        }

        if (httpMethod === 'DELETE') {
            const id = await deleteTodoItem(data);
            return id
                ? createResponse(
                    `Todo item with an id of ${id} deleted`
                  )
                : createResponse("ID is missing", 500)
        }

        return createResponse(
            `We only accept GET requests for now, not ${httpMethod}`,
            500
        );
    } catch (error) {
        console.log(error);
        return createResponse(error, 500);
    }
};
