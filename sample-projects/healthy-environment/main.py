from fastapi import FastAPI

app = FastAPI(title="Acme Enterprise Knowledge Service", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/v1/documents")
def list_documents():
    return [{"id": "doc-1", "title": "Corporate AI Guidelines"}]
