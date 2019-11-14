const AWS = require('aws-sdk')
const chalk = require('chalk')
const R = require('ramda')
const BbPromise = require('bluebird')

/**
 * Get api key by name.
 * @param {string} key Api Key name.
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @returns {Object} Api key info.
 */
const getApiKey = async (name, apigateway, cli) => {
  try {
    const getAllApiKeys = async (position = null, keys = []) => {
      const options = position ? { position } : null
      const res = await apigateway.getApiKeys(options).promise()
      keys = keys.concat(res.items)
      return res.position ? getAllApiKeys(res.position, keys) : Promise.resolve(keys)
    }
    const findApiKey = (_name) => (keys) => keys.find(k => k.name === _name)
    const getApiKey = (_name) => R.pipeP(getAllApiKeys, findApiKey(_name))()

    return getApiKey(name)

  } catch (error) {
    if (error.code === 'NotFoundException') return undefined
    cli.consoleLog(`EasyUsagePlanKey: ${chalk.red(`Failed to check if key already exists. Error ${error.message || error}`)}`)
    throw error
  }
}

/**
 * Main function that gets api key id by name.
 * @param {Object} serverless Serverless object
 */
const getApiKeyId = async (serverless) => {

  const resources = serverless.service.provider.compiledCloudFormationTemplate["Resources"]
  const cliLog = (msg) => serverless.cli.consoleLog(`EasyUsagePlanKey: ${msg}`)
  const isUsagePlanKey = (resource) => !!~resource.Type.search('AWS::ApiGateway::UsagePlanKey')
  const findApiKey = async (usagePlanKey) => {
    const apiKeyName = usagePlanKey.Properties ? usagePlanKey.Properties.KeyName : null

    if (!apiKeyName) cliLog(chalk.red(`API key name not found.`))
    
    cliLog(chalk.yellow(`find API key id using the API key name...`))
    const provider = serverless.getProvider('aws')
    const awsCredentials = provider.getCredentials()
    const region = provider.getRegion()
    const apiGateway = new AWS.APIGateway({ credentials: awsCredentials.credentials, region })
    const apiKey = await getApiKey(apiKeyName, apiGateway, serverless.cli)

    if (apiKey) {
      usagePlanKey.Properties.KeyId = apiKey.id
      const provider = serverless.service.provider
      if (!provider.apiKeys) provider.apiKeys = []
      provider.apiKeys.push(apiKey.name)
      cliLog(chalk.yellow(`API key id found successfully. KeyName(${apiKeyName}) apiKeyId(${apiKey.id})`))
    } else {
      cliLog(chalk.red(`API key not found.`))
    }
    delete usagePlanKey.Properties.KeyName

    return usagePlanKey
  }
  
  const run = R.pipe(R.filter(isUsagePlanKey), R.map(findApiKey), BbPromise.props)
  await run(resources)
}

const setParameterStoreApiKey = async (serverless) => {
  if (!serverless.service.custom.apiKeyParameter) return
  const cliLog = (msg) => serverless.cli.consoleLog(`EasyUsagePlanKey: ${msg}`)
  const provider = serverless.getProvider('aws')
  const awsCredentials = provider.getCredentials()
  const region = provider.getRegion()
  const ssm = new AWS.SSM({ credentials: awsCredentials.credentials, region })
  const parameters = serverless.service.custom.apiKeyParameter

  const putParameter = async (parameter) => {
    const awsInfo = serverless.pluginManager.plugins.find(p => p.constructor.name === 'AwsInfo')
    const findKey = (name) => awsInfo.gatheredData.info.apiKeys.find(item => item.name === name)
    const apiKey = findKey(parameter.apiName)
    const params = {
      Name: parameter.keyName,
      Type: "String",
      Value: apiKey.value,
      Overwrite: true,
      Tier: 'Standard'
    }
    const result = await ssm.putParameter(params).promise()
    if (result) cliLog(`API key put parameter: ${parameter.keyName}`)
    return result
  }
  const run = R.pipe(R.map(putParameter), BbPromise.props)
  await run(parameters)
}

module.exports = {
  getApiKeyId,
  setParameterStoreApiKey
}