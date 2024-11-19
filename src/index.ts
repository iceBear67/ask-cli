import {OpenAIClient, ChatMessage, createUserMessage} from "./openai"
import fs from "node:fs"
import * as readline from "node:readline";

const {parseArgs} = require("@choksheak/parse-args");

const DEFAULT_CONFIG_PATH = `${require('os').homedir()}/.config/ask-cli/config.json`

interface AskConfig {
    apiKey: string,
    defaultModel: string,
    endpointUrl: string,
    systemPrompt: string
}

function initConfig(path: string | null) {
    const configPath = path ?? DEFAULT_CONFIG_PATH
    if (!fs.existsSync(configPath)) {
        console.error(`Configuration file at ${configPath} does not exist!`)
        return
    }
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as AskConfig
}

async function readAllAndFeed(api: OpenAIClient) {
    let stdInBuffer = fs.readFileSync(0).toString("utf-8")
    let message = await api.generate(createUserMessage(stdInBuffer))
    console.log(message.content)
}

async function startEvalLoop(api: OpenAIClient) {
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    rl.pause()
    rl.on("line", async (line) => {
        let resp = await api.generate(createUserMessage(line))
        console.log(resp.content)
    })
    rl.resume()
}

async function askDirectly(api: OpenAIClient, question: string, session: boolean) {
    let message = await api.generate(createUserMessage(question))
    console.log(message.content)
    if (session) await startEvalLoop(api)
}

async function main() {
    const args = parseArgs({
        line: {
            alias: "l", description: "Feed your input to LLM line by line",
            type: "boolean"
        },
        dedicated: {
            alias: "d", description: "Use dedicated context for each input",
            type: "boolean"
        },
        config: {
            alias: "c", description: "Use config at specified path",
            type: "string"
        },
        model: {
            alias: "m", description: "Model to use. This overrides your configuration",
            type: "string"
        },
        systemPrompt: {
            alias: "p", description: "System prompt to use. This overrides your configuration",
            type: "string"
        },
        _help: true
    })
    if (args.help) return
    const config = initConfig(args.config)
    config.defaultModel = args.model ?? config.defaultModel
    config.systemPrompt = args.systemPrompt ?? config.systemPrompt
    const api = new OpenAIClient(
        config.endpointUrl,
        config.apiKey,
        config.defaultModel,
        config.systemPrompt,
        args.dedicated as boolean
    )
    if (args.nonOptions) {
        await askDirectly(api, args.nonOptions.join(" "), args.line as boolean)
    } else {
        if (args.line) {
            await startEvalLoop(api)
        } else {
            await readAllAndFeed(api)
        }
    }
}

main().then()