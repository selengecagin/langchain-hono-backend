import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from 'path'
import {promises as fs} from 'fs'
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import {MemoryVectorStore} from "langchain/vectorstores/memory"; // This is the default vector store, *db for vectors
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

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
    const text = await getTextFile();
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, // can be 500-800
        separators:['\n\n', '\n', ' ', '', '###'], //I have added ### as a separator to Titles in text.txt
        chunkOverlap: 50,
    });

    const output : Document<Record<string, any>>[] = await splitter.createDocuments([text]);

    return c.json({ output });
})

const port = 3002
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})


//http://localhost:3002/loadTextEmbeddings