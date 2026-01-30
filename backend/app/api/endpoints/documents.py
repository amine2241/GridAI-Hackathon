from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from loguru import logger

from ...core import auth
from ...core.database import SessionLocal, User, KnowledgeDocument
from ...services.rag_service import get_rag_service
from docling.document_converter import DocumentConverter

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DocumentCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "General"

@router.post("/upload", tags=["knowledge base"])
async def upload_document(
    title: str = Form(...),
    category: str = Form("General"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.check_admin_role)
):
    content = ""
    
    if file.content_type == "text/plain":
        content = (await file.read()).decode("utf-8")
    elif file.content_type in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
                                "application/vnd.openxmlformats-officedocument.presentationml.presentation"]:
        try:
            import tempfile
            import os
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name
            
            converter = DocumentConverter()
            result = converter.convert(tmp_path)
            
            content = result.document.export_to_markdown()
            
            os.unlink(tmp_path)
            
        except Exception as e:
            logger.error(f"Docling processing error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to process document: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, PPTX, or TXT.")

    if not content.strip():
        raise HTTPException(status_code=400, detail="No text content could be extracted from the file.")

    doc_id = str(uuid.uuid4())
    new_doc = KnowledgeDocument(
        id=doc_id,
        title=title,
        content=content,
        category=category
    )
    db.add(new_doc)
    db.commit()
    
    try:
        rs = get_rag_service()
        if rs:
            rs.add_documents([content], [{"id": doc_id, "title": title, "category": category}])
    except Exception as e:
        logger.error(f"Failed to sync with RAG: {e}")
    
    return {"id": doc_id, "title": title, "category": category, "status": "indexed"}

@router.get("", tags=["knowledge base"])
async def get_documents(db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    docs = db.query(KnowledgeDocument).all()
    return docs

@router.post("", tags=["knowledge base"])
async def create_document(doc: DocumentCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    doc_id = str(uuid.uuid4())
    new_doc = KnowledgeDocument(
        id=doc_id,
        title=doc.title,
        content=doc.content,
        category=doc.category
    )
    db.add(new_doc)
    db.commit()
    
    try:
        rs = get_rag_service()
        if rs:
            rs.add_documents([doc.content], [{"id": doc_id, "title": doc.title, "category": doc.category}])
    except Exception as e:
        logger.error(f"Failed to sync with RAG: {e}")
    
    return new_doc

@router.delete("/{doc_id}", tags=["knowledge base"])
async def delete_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(doc)
    db.commit()
    return {"status": "success"}

@router.post("/sync", tags=["knowledge base"])
async def sync_documents_to_rag(current_user: User = Depends(auth.check_admin_role)):
    """Synchronize all documents from database to RAG vector store."""
    try:
        rs = get_rag_service()
        if not rs:
            raise HTTPException(status_code=503, detail="RAG service not available")
        
        result = rs.sync_all_from_db()
        
        if result.get("success"):
            return {
                "status": "success",
                "synced": result.get("synced", 0),
                "message": result.get("message", f"Successfully synced {result.get('synced', 0)} documents")
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Sync failed"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
