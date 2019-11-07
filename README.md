# serverless-easy-usage-plan-key

If you already have an api key when you use the cloudformation resource to create an api usage plan,
you can create a usage plan key with the api key name and associate it with the api usage plan.

## Install
install package
```bash
$ npm i serverless-easy-usage-plan-key --save
```

add the plugin to serverless.yml
```yaml
# serverless.yml

plugins:
  - serverless-easy-usage-plan-key
```

## Setup
```yaml
UsagePlanKey:
    Type: AWS::ApiGateway::UsagePlanKey
    Properties:
        KeyName: my-api-key-name
        KeyType: API_KEY
```
If you have a resource of type AWS::ApiGateway::UsagePlanKey in Resources in the Serverless template,
look for {resourceName}.Properties.KeyName to look up the API key information.
If API key exists, get the API key id and put the value in {resourceName}.Properties.KeyId.