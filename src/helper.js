const AWS = require('aws-sdk')
const chalk = require('chalk')
const R = require('ramda')

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

  const template = serverless.service.provider.compiledCloudFormationTemplate

  await Promise.all(Object.keys(template["Resources"]).filter(key => {
    return !!~template["Resources"][key].Type.search('AWS::ApiGateway::UsagePlanKey')
  }).map(async key => {
    const usagePlanKey = template["Resources"][key]
    const apiKeyName = usagePlanKey.Properties ? usagePlanKey.Properties.KeyName : null

    if (!apiKeyName) serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.red(`API key name not found.`)}`)
    
    serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.yellow(`find API key id using the API key name...`)}`)
    const provider = serverless.getProvider('aws')
    const awsCredentials = provider.getCredentials()
    const region = provider.getRegion()
    const apiGateway = new AWS.APIGateway({ credentials: awsCredentials.credentials, region })
    const apiKey = await getApiKey(apiKeyName, apiGateway, serverless.cli)

    if (apiKey) {
      template["Resources"][key].Properties.KeyId = apiKey.id
      serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.yellow(`API key id found successfully. KeyName(${apiKeyName}) apiKeyId(${apiKey.id})`)}`)
    } else {
      serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.red(`API key not found.`)}`)
    }
    delete template["Resources"][key].Properties.KeyName
  }))
}

module.exports = {
  getApiKey,
  getApiKeyId
}