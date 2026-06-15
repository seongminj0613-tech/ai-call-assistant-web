import boto3
client = boto3.client('apigateway', region_name='ap-northeast-2')

client.put_method_response(
    restApiId='avrq2kzfp9',
    resourceId='wjwqgq',
    httpMethod='OPTIONS',
    statusCode='200',
    responseParameters={
        'method.response.header.Access-Control-Allow-Headers': False,
        'method.response.header.Access-Control-Allow-Methods': False,
        'method.response.header.Access-Control-Allow-Origin': False,
    }
)

client.put_integration_response(
    restApiId='avrq2kzfp9',
    resourceId='wjwqgq',
    httpMethod='OPTIONS',
    statusCode='200',
    responseParameters={
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'method.response.header.Access-Control-Allow-Methods': "'DELETE,OPTIONS'",
        'method.response.header.Access-Control-Allow-Origin': "'https://dk1k75g0ji3vw.cloudfront.net'",
    }
)

client.create_deployment(restApiId='avrq2kzfp9', stageName='prod')
print('완료!')