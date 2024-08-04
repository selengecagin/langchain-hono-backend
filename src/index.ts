// Importing required modules and libraries
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from "path";
import { promises as fs } from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import {PromptTemplate} from "@langchain/core/prompts";
import {createStuffDocumentsChain} from "langchain/chains/combine_documents";
import {Ollama} from "@langchain/community/llms/ollama";
import {createRetrievalChain} from "langchain/chains/retrieval";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// Creating the Hono application
const app = new Hono()

// Configuring the Ollama LLM
const ollama = new Ollama({
    baseUrl: "http://localhost:11434", // Default value
    model: "gemma2:27b", // Model to use
});

// Configuring the embedding model
const embeddings = new OllamaEmbeddings({
    model: "gemma2:27b",
    baseUrl: "http://localhost:11434",
    requestOptions: {
        useMMap: true,
        numThread: 6,
        numGpu: 1,
    },
});

// Function to read a text file
const getTextFile = async () => {
    // Defining the file path
    const filePath = path.join(__dirname, "../data/wsj.txt");

    // Reading the file and returning its content
    const data = await fs.readFile(filePath, "utf-8");
    return data;
}

// Function to read a PDF file
const loadPdfFile = async () => {
    // Defining the file path
    const filePath = path.join(__dirname, "../data/burak-pdf.pdf");

    const loader = new PDFLoader(filePath);

    return await loader.load();
}

// Simple response for the root path
app.get('/', (c) => {
    return c.text('Hello Hono!')
})

// Global variable for the vector database
let vectorStore : MemoryVectorStore;

// Endpoint to load text embeddings
app.get('/loadTextEmbeddings', async (c) => {
    // Reading the text file
    const text = await getTextFile();

    // Configuring text splitting settings
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        separators:['\n\n', '\n', ' ', '', '###'],
        chunkOverlap: 50
    });

    // Splitting the text and creating documents
    const output = await splitter.createDocuments([text])

    // Creating the vector database
    vectorStore = await MemoryVectorStore.fromDocuments(output, embeddings);

    // Returning success message
    const response = {message: "Text embeddings loaded successfully."};
    return c.json(response);
})

// Endpoint to load PDF embeddings
app.get('/loadPdfEmbeddings', async (c) => {
    // Reading the PDF file
    const documents = await loadPdfFile();

    // Creating the vector database
    vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

    // Returning success message
    const response = {message: "Text embeddings loaded successfully."};
    return c.json(response);
})

// Endpoint to ask a question
app.post('/ask', async (c) => {
    // Getting the incoming question
    const { question } = await c.req.json();

    // Checking if the vector database is loaded
    if(!vectorStore){
        return c.json({message: "Text embeddings not loaded yet."});
    }

    // Creating the prompt template for question-answering
    const prompt = PromptTemplate.fromTemplate(`You are a helpful AI assistant. Answer the following question based only on the provided context. If the answer cannot be derived from the context, say "I don't have enough information to answer that question." If I like your results I'll tip you $1000!

Context: {context}

Question: {question}

Answer: 
  `);

    // Creating the document merging chain
    const documentChain = await createStuffDocumentsChain({
        llm: ollama,
        prompt,
    });

    // Creating the retrieval chain
    const retrievalChain = await createRetrievalChain({
        combineDocsChain: documentChain,
        retriever:vectorStore.asRetriever({
            k:3 // Retrieving the top 3 most similar documents
        })
    });

    // Processing the question and getting the answer
    const response = await retrievalChain.invoke({
        question:question,
        input:""
    });

    // Returning the answer in JSON format
    return c.json({answer: response.answer});
});

// Server port number
const port = 3002
console.log(`Server is running on port ${port}`)

// Starting the server
serve({
    fetch: app.fetch,
    port
})
