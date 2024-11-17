import AWS from 'aws-sdk';

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
});

// Initialize SQS
const sqs = new AWS.SQS();

// SQS Queue URL from environment variable
const QUEUE_URL = process.env.SQS_QUEUE_URL;

// Helper function to receive messages
async function receiveMessages(maxMessages = 10) {
  const params = {
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 20, // Long polling
    VisibilityTimeout: 60 // 1 minute timeout
  };

  try {
    const data = await sqs.receiveMessage(params).promise();
    return data.Messages || [];
  } catch (error) {
    console.error('Error receiving messages:', error);
    throw error;
  }
}

// Helper function to delete a message after processing
async function deleteMessage(receiptHandle) {
  const params = {
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle
  };

  try {
    await sqs.deleteMessage(params).promise();
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

export { sqs, receiveMessages, deleteMessage };