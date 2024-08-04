import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from 'path'
import {promises as fs} from 'fs'
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const app = new Hono()

    const getTextFile = async () : Promise<string> => {
        const filePath = path.join(__dirname, '../data/text.txt')
        const data:string = await fs.readFile(filePath, 'utf-8');
        return data;

    }

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/loadTextEmbeddings', async(c) => {
    return c.text('Hello Hono!')
})

const port = 3002
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
