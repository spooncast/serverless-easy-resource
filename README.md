# serverless-easy-usage-plan-key

main function
- You can get the ID of an AWS :: ApiGateway resource by name or other key.
- If you have an AWS :: ApiGateway :: deploy resource, add a timestamp to the logical ID value so you can deploy RestApi per serverless deployments.

## Installation
```bash
$ npm i serverless-easy-usage-plan-key --save
```

add the plugin to serverless.yml
```yaml
# serverless.yml
plugins:
  - serverless-easy-usage-plan-key
```

## Configuration

### Get Resource Id by Key
For each id value in the resource file:
- Variable.apiGateway.{ResourceType}.id

Supported resource items:
- 'AWS::ApiGateway::RestApi'
- 'AWS::ApiGateway::ApiKey'
- 'AWS::ApiGateway::Resource'

```yaml
Resources:
  #Api Key Id
  ApiGatewayUsagePlanKey:
    Type: AWS::ApiGateway::UsagePlanKey
    DependsOn:
      - ApiGatewayUsagePlan
    Properties:
      KeyId: Variable.apiGateway.ApiKey.id
      KeyType: API_KEY
      UsagePlanId: !Ref ApiGatewayUsagePlan
  #Rest Api and Root Resource Id
  ApiGatewayResourceOne:
    Type: 'AWS::ApiGateway::Resource'
    Properties:
      ParentId: Variable.apiGateway.Resource.id
      PathPart: One
      RestApiId: Variable.apiGateway.RestApi.id
```

```yaml
# custom.apiGateway.(ApiKey / RestApi / Resource).name
custom:
  apiGateway:
    RestApi:
      name: apiGatewayName
    ApiKey:
      name: apiKeyName
    Resource:
      name: / #Root Resource
```

### Add Timestamp to Deployment
Adding a timestamp to 'AWS::ApiGateway::Deployment' is automatically applied if you have a Deployment resource