export default {
  TableName: "score",
  KeySchema: [
    {
      AttributeName: "id",
      KeyType: "HASH"
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: "id",
      AttributeType: "S"
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  }
};
