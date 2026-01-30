import os
import threading
from typing import Optional, List, Dict
from loguru import logger
from qdrant_client import QdrantClient
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document

class RAGService:
    """Thread-safe RAG service for knowledge base management."""
    
    def __init__(self):
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.collection_name = "kb_documents"
        self.is_available = False
        
        try:
            self.client = QdrantClient(url=self.qdrant_url, timeout=5)
            
            provider = self._get_setting_value("llm_provider", "gemini").lower()
            
            if provider == "gemini" or provider == "google":
                api_key = self._get_setting_value("google_api_key", "")
                if api_key:
                    os.environ["GOOGLE_API_KEY"] = api_key
                self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
            else:  # openai
                api_key = self._get_setting_value("openai_api_key", "")
                if api_key:
                    os.environ["OPENAI_API_KEY"] = api_key
                self.embeddings = OpenAIEmbeddings()
            
            self._initialize_collection()
            self.is_available = True
            logger.info("RAG Service initialized successfully")
            
        except Exception as e:
            logger.error(f"RAG Service initialization failed: {e}")
            self.is_available = False
            raise
    
    def _initialize_collection(self):
        """Initialize or verify the Qdrant collection."""
        try:
            collection_info = self.client.get_collection(collection_name=self.collection_name)
            current_dim = collection_info.config.params.vectors.size
            
            dummy_vec = self.embeddings.embed_query("test")
            expected_dim = len(dummy_vec)
            
            if current_dim != expected_dim:
                logger.warning(f"Dimension mismatch (Existing: {current_dim}, New: {expected_dim}). Recreating collection...")
                self.client.delete_collection(collection_name=self.collection_name)
                raise ValueError("Dimension mismatch - collection deleted")
                
        except Exception:
            from qdrant_client.http import models
            
            dummy_vec = self.embeddings.embed_query("test")
            expected_dim = len(dummy_vec)
            
            logger.info(f"Creating collection '{self.collection_name}' with dimension {expected_dim}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=expected_dim, distance=models.Distance.COSINE),
            )
        
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=self.collection_name,
            embedding=self.embeddings,
        )
    
    def _get_setting_value(self, key: str, default: str = "") -> str:
        """Get setting value from database with fallback to environment variable."""
        try:
            from ..core.database import SessionLocal, SystemSetting
            db = SessionLocal()
            try:
                setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
                if setting and setting.value:
                    return setting.value
            finally:
                db.close()
        except Exception:
            pass
        
        env_map = {
            "llm_provider": "LLM_PROVIDER",
            "google_api_key": "GEMINI_API_KEY",
            "openai_api_key": "OPENAI_API_KEY"
        }
        env_key = env_map.get(key, key.upper())
        return os.getenv(env_key, default)

    def search(self, query: str, k: int = 5) -> List[Document]:
        """Search the knowledge base."""
        if not self.is_available:
            logger.warning("RAG Service not available for search")
            return []
        
        try:
            return self.vector_store.similarity_search(query, k=k)
        except Exception as e:
            logger.error(f"RAG search failed: {e}")
            return []

    def add_documents(self, texts: List[str], metadatas: Optional[List[Dict]] = None) -> bool:
        """Add documents to the vector store."""
        if not self.is_available:
            logger.warning("RAG Service not available for adding documents")
            return False
        
        try:
            docs = [
                Document(page_content=text, metadata=meta or {}) 
                for text, meta in zip(texts, metadatas or [{}] * len(texts))
            ]
            self.vector_store.add_documents(docs)
            logger.info(f"Added {len(docs)} documents to RAG")
            return True
        except Exception as e:
            logger.error(f"Failed to add documents to RAG: {e}")
            return False

    def delete_document(self, doc_id: str) -> bool:
        """Delete document from the vector store by metadata ID."""
        if not self.is_available:
            logger.warning("RAG Service not available for deletion")
            return False
        
        try:
            from qdrant_client.http import models
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="metadata.id",
                                match=models.MatchValue(value=doc_id),
                            )
                        ]
                    )
                ),
            )
            logger.info(f"Deleted document {doc_id} from RAG")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id} from RAG: {e}")
            return False
    
    def sync_all_from_db(self) -> Dict[str, any]:
        """Synchronize all documents from database to vector store."""
        if not self.is_available:
            logger.warning("RAG Service not available for sync")
            return {"success": False, "error": "RAG service not available"}
        
        try:
            from ..core.database import SessionLocal, KnowledgeDocument
            
            db = SessionLocal()
            try:
                logger.info("Clearing existing RAG collection...")
                self.client.delete_collection(collection_name=self.collection_name)
                self._initialize_collection()
                
                docs = db.query(KnowledgeDocument).all()
                
                if not docs:
                    logger.info("No documents found in database to sync")
                    return {"success": True, "synced": 0, "message": "No documents to sync"}
                
                texts = [doc.content for doc in docs]
                metadatas = [
                    {"id": doc.id, "title": doc.title, "category": doc.category or "General"}
                    for doc in docs
                ]
                
                success = self.add_documents(texts, metadatas)
                
                if success:
                    logger.info(f"Successfully synced {len(docs)} documents to RAG")
                    return {"success": True, "synced": len(docs)}
                else:
                    return {"success": False, "error": "Failed to add documents to vector store"}
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to sync documents from DB: {e}")
            return {"success": False, "error": str(e)}


_rag_service: Optional[RAGService] = None
_rag_init_failed = False
_rag_lock = threading.Lock()

def get_rag_service() -> Optional[RAGService]:
    """Get the singleton RAG service instance (thread-safe)."""
    global _rag_service, _rag_init_failed
    
    if _rag_init_failed:
        return None
    
    if _rag_service is None:
        with _rag_lock:
            if _rag_service is None:
                try:
                    _rag_service = RAGService()
                except Exception as e:
                    logger.error(f"FAILED TO INITIALIZE RAG SERVICE: {e}")
                    _rag_init_failed = True
                    return None
    
    return _rag_service 
