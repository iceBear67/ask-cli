import {AxiosInstance} from "axios"
import axiosRetry from "axios-retry"
import axios from "axios"

export interface ChatMessage {
    role: string,
    content: string
}

export function createUserMessage(message: string) {
    return {
        role: "user",
        content: message,
    }
}

export function createSystemMessage(message: string) {
    return {
        role: "system",
        content: message,
    }
}

export class OpenAIClient {
    private api: AxiosInstance
    private context: Array<ChatMessage> = new Array<ChatMessage>()

    constructor(
        private endpoint: string,
        token: string,
        private model: string,
        private prompt: string = "",
        private dedicatedContext: boolean
    ) {
        console.log(`Dedicated! ${dedicatedContext}`)
        if (prompt) this.context.push({role: "system", content: prompt})
        this.api = axios.create({
            baseURL: endpoint,
            headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "ask/1.0.0",
                "Content-Type": "application/json"
            }
        })
    }

    public async generate(chatMessage: ChatMessage): Promise<ChatMessage> {
        if (this.dedicatedContext) {
            return this.chatComplete(new Array(chatMessage))
        } else {
            this.context.push(chatMessage)
            const result = await this.chatComplete(this.context)
            this.context.push(result)
            return result
        }

    }

    private async chatComplete(context: ChatMessage[]): Promise<ChatMessage> {
        let payload = {
            model: this.model,
            messages: context
        }
        try {
            let result = await this.api.post("/chat/completions", payload)
            if (result.status != 200) {
                throw new Error(`Cannot fetch model. server returned an ${result.status}`)
            }
            return result.data.choices[0].message as ChatMessage
        }catch(e){
            throw new Error(`Cannot fetch model. ${e.message}`)
        }
    }

}