import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from "path";
import { promises as fs } from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import {PromptTemplate} from "@langchain/core/prompts";
import {createStuffDocumentsChain} from "langchain/chains/combine_documents";

const app = new Hono()

const getTextFile = async () => {

    const filePath = path.join(__dirname, "../data/langchain-test.txt");
    const data = await fs.readFile(filePath, "utf-8");

    return data;
}

app.get('/', (c) => {
    return c.text('Hello Hono!')
})

// Vector Db
let vectorStore : MemoryVectorStore;

app.get('/loadTextEmbeddings', async (c) => {

    const text = await getTextFile();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        separators:['\n\n', '\n', ' ', '', '###'], //I have added ### as a separator to Titles in text.txt

        chunkOverlap: 50
    });

    const output = await splitter.createDocuments([text])

// https://js.langchain.com/v0.2/docs/integrations/text_embedding/ollama/
    const embeddings = new OllamaEmbeddings({
        model: "gemma2:2b",
        baseUrl: "http://localhost:11434",
        requestOptions: {
            useMMap: true, // use_mmap 1
            numThread: 6, // num_thread 6
            numGpu: 1, // num_gpu 1
        },
    });

    vectorStore = await MemoryVectorStore.fromDocuments(output, embeddings);

    return c.json({message: 'Text Embeddings Loaded'});
})

app.post('/ask', async (c) => {

    const { question } = await c.req.json();

    if(!vectorStore){
        return c.json({message: 'Text Embeddings not loaded'});
    }

    // prompt template
    const prompt = PromptTemplate.fromTemplate(`You are a helpful AI assistant. Answer the following question based only on the provided context. If the answer cannot be derived from the context, say "I don't have enough information to answer that question." If I like your results I'll tip you $1000!

Context: {context}

Question: {question}

Answer: 
  `)
});

const port = 3002
console.log(`Server is running on port ${port}`)

serve({
    fetch: app.fetch,
    port
})

//http://localhost:3002/loadTextEmbeddings
