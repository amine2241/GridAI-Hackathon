import os
import json
import pysnow
from loguru import logger
from typing import Dict, Any, Optional, List
import asyncio
from datetime import datetime
from app.services.email_service import email_service
from app.core.database import SessionLocal, User


SERVICENOW_INSTANCE = os.getenv("SERVICENOW_INSTANCE", "dev269222")
instance_name = SERVICENOW_INSTANCE.replace("https://", "").replace(".service-now.com", "")
SERVICENOW_USER = os.getenv("SERVICENOW_USER", "admin")
SERVICENOW_PASSWORD = os.getenv("SERVICENOW_PASSWORD")
if not SERVICENOW_PASSWORD:
    logger.warning("SERVICENOW_PASSWORD not found in environment.")

class ServiceNowService:
    """
    Service for direct interaction with ServiceNow Table API using pysnow.
    Runs in-process to avoid subprocess issues.
    """
    
    def __init__(self):
        try:
            self.client = pysnow.Client(
                instance=instance_name,
                user=SERVICENOW_USER,
                password=SERVICENOW_PASSWORD
            )
            logger.info(f"ServiceNowService initialized for instance: {instance_name}")
        except Exception as e:
            logger.error(f"Failed to initialize ServiceNow client: {e}")
            self.client = None

    def _get_resource(self, table: str = 'incident'):
        if not self.client:
            raise Exception("ServiceNow client not initialized")
        return self.client.resource(api_path=f'/table/{table}')

    def _parse_response(self, result: Any) -> Any:
        """Helper to parse pysnow results robustly."""
        if result is None:
            return None
        
        if isinstance(result, dict):
            return result
        
        try:
            if hasattr(result, 'all'):
                items = list(result.all())
                return items[0] if items else None
            elif hasattr(result, 'first'):
                return result.first()
        except Exception as e:
            try:
                if hasattr(result, '_response'):
                    resp = getattr(result, '_response')
                    body = resp.text
                    if "Instance Hibernating" in body or "refresh" in body:
                        logger.error("❌ SERVICENOW ERROR: Your instance is HIBERNATING. Please wake it up at https://developer.servicenow.com/")
                    else:
                        logger.error(f"ServiceNow API failure (Status {resp.status_code}): {body[:200]}")
            except:
                pass
            logger.warning(f"Error parsing pysnow response: {e}")
            
        return None

    async def get_or_create_user(self, user_name: str, email: str = None, create: bool = True, full_name: Optional[str] = None) -> Optional[str]:
        """
        Get a user's sys_id if exists, otherwise create the user if create=True.
        """
        loop = asyncio.get_event_loop()
        try:
            user_resource = self._get_resource('sys_user')
            
            if email:
                query = f'email={email}'
                response = await loop.run_in_executor(None, lambda: user_resource.get(query=query, limit=1))
                user = self._parse_response(response)
                if user and isinstance(user, dict):
                    return user.get('sys_id')

            query = f'user_name={user_name}'
            response = await loop.run_in_executor(None, lambda: user_resource.get(query=query, limit=1))
            user = self._parse_response(response)
            if user and isinstance(user, dict):
                return user.get('sys_id')

            if not create:
                return None

            data = {
                "user_name": user_name,
                "name": full_name or user_name,
                "email": email or "abdo.elgharbaoui3@gmail.com",
                "password": "TempPass123!"
            }
            logger.info(f"User {user_name} not found, creating new user in ServiceNow...")
            result = await loop.run_in_executor(None, lambda: user_resource.create(payload=data))
            new_user = self._parse_response(result)
            if new_user and isinstance(new_user, dict):
                return new_user.get('sys_id')
            return None
        except Exception as e:
            logger.error(f"Error in get_or_create_user for {user_name}: {e}")
            raise

    async def create_incident(self, short_description: str, description: str, impact: str = "medium", email: Optional[str] = None, caller_name: Optional[str] = None, category: Optional[str] = "inquiry", contact_type: str = "Virtual Agent") -> Dict[str, Any]:
        """Crée un incident ServiceNow à partir d'un problème utilisateur."""
        impact_mapping = {
            "low": {"impact": "3", "urgency": "2"},
            "medium": {"impact": "2", "urgency": "2"},
            "high": {"impact": "1", "urgency": "1"}
        }
        
        actual_email = email
        c_name = caller_name or (actual_email.split('@')[0] if actual_email else "admin")
        
        caller_sys_id = await self.get_or_create_user(c_name, actual_email, full_name=caller_name)
        
        mapping = impact_mapping.get(impact.lower(), impact_mapping["medium"])
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_description = f"Created on: {timestamp}\n\n{description}"
        
        payload = {
            "short_description": short_description,
            "description": full_description,
            "impact": mapping["impact"],
            "urgency": mapping["urgency"],
            "contact_type": contact_type,
            "category": category or "inquiry"
        }
        
        if caller_sys_id:
            payload["caller_id"] = caller_sys_id

        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            result = await loop.run_in_executor(None, lambda: resource.create(payload=payload))
            parsed = self._parse_response(result)
            
            incident_num = "Unknown"
            if isinstance(parsed, dict):
                incident_num = parsed.get('number', 'Unknown')
                
            logger.info(f"ServiceNow created incident: {incident_num}")
            
            try:
                is_urgent_iot = (contact_type.lower() == "iot" and impact.lower() == "high")
                
                asyncio.create_task(email_service.send_ticket_notification(
                    to_email=actual_email,
                    ticket_id=incident_num,
                    subject=short_description,
                    description=description,
                    priority=impact,
                    is_urgent_iot=is_urgent_iot
                ))
            except Exception as mail_err:
                logger.error(f"Failed to trigger email notification: {mail_err}")

            return parsed
        except Exception as e:
            logger.error(f"ServiceNow create_incident error: {e}")
            raise

    async def get_incident(self, number: str) -> Optional[Dict[str, Any]]:
        """Récupère un incident par son numéro (INCxxxx)."""
        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            query = f'number={number}'
            response = await loop.run_in_executor(None, lambda: resource.get(query=query, limit=1))
            return self._parse_response(response)
        except Exception as e:
            logger.error(f"ServiceNow get_incident error: {e}")
            raise

    async def get_incidents(self, status: Optional[str] = None, priority: Optional[str] = None, search_query: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Récupère une liste d'incidents avec filtres optionnels."""
        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            
            base_parts = []
            if status:
                if "=" in status:
                    base_parts.append(status)
                else:
                    base_parts.append(f"state={status}")
            if priority:
                if "," in priority:
                    base_parts.append(f"priorityIN{priority}")
                else:
                    base_parts.append(f"priority={priority}")
            
            base_query = "^".join(base_parts)
            
            if search_query:
                q1 = f"{base_query}^short_descriptionLIKE{search_query}" if base_query else f"short_descriptionLIKE{search_query}"
                q2 = f"{base_query}^descriptionLIKE{search_query}" if base_query else f"descriptionLIKE{search_query}"
                q3 = f"{base_query}^numberLIKE{search_query}" if base_query else f"numberLIKE{search_query}"
                query = f"({q1}^OR{q2}^OR{q3})^ORDERBYDESCsys_created_on"
            else:
                query = f"{base_query}^ORDERBYDESCsys_created_on" if base_parts else "ORDERBYDESCsys_created_on"
                
            response = await loop.run_in_executor(None, lambda: resource.get(query=query, limit=limit))
            return list(response.all())
        except Exception as e:
            logger.error(f"ServiceNow get_incidents error: {e}")
            raise

    async def get_user_incidents(self, email: str, status: Optional[str] = None, priority: Optional[str] = None, search_query: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Récupère les incidents d'un utilisateur par son email avec filtres optionnels."""
        incidents = []
        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            
            sys_id = await self.get_or_create_user(email.split('@')[0] if email else "admin", email, create=False)
            
            base_filter = ""
            if status: 
                if "=" in status:
                    base_filter += f"^{status}"
                else:
                    base_filter += f"^state={status}"
            if priority: 
                if "," in priority:
                    base_filter += f"^priorityIN{priority}"
                else:
                    base_filter += f"^priority={priority}"

            def build_full_query(prefix):
                sort_suffix = "^ORDERBYDESCsys_created_on"
                if not search_query:
                    return f"{prefix}{base_filter}{sort_suffix}"
            
                q1 = f"{prefix}{base_filter}^short_descriptionLIKE{search_query}"
                q2 = f"{prefix}{base_filter}^descriptionLIKE{search_query}"
                q3 = f"{prefix}{base_filter}^numberLIKE{search_query}"
                return f"({q1}^OR{q2}^OR{q3}){sort_suffix}"

            if sys_id:
                query = build_full_query(f"caller_id={sys_id}")
                try:
                    response = await loop.run_in_executor(None, lambda: resource.get(query=query, limit=limit))
                    incidents = list(response.all())
                    logger.info(f"Found {len(incidents)} incidents for {email} via sys_id with filters")
                except Exception as e:
                    logger.warning(f"Error fetching incidents by sys_id for {email}: {e}")

            if len(incidents) < limit:
                logger.debug(f"Searching description for {email} as fallback/supplement...")
                query = build_full_query(f"descriptionLIKE{email}^ORshort_descriptionLIKE{email}")
                try:
                    response = await loop.run_in_executor(None, lambda: resource.get(query=query, limit=limit))
                    text_results = list(response.all())
                    
                    existing_numbers = {i['number'] for i in incidents}
                    for res in text_results:
                        if res['number'] not in existing_numbers:
                            incidents.append(res)
                            if len(incidents) >= limit: break
                            
                    logger.info(f"Total {len(incidents)} incidents for {email} after text search supplement")
                except Exception as e:
                    logger.warning(f"Error fetching incidents by text search for {email}: {e}")
                
            return incidents[:limit]
        except Exception as e:
            logger.error(f"ServiceNow get_user_incidents error: {e}")
            raise

    async def update_incident(self, number: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an incident by its number with arbitrary data."""
        logger.info(f"Attempting to update incident {number} with data: {list(data.keys())}")
        incident = await self.get_incident(number)
        if not incident:
            logger.error(f"Incident {number} not found for update")
            raise ValueError(f"Incident {number} introuvable")

        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            result = await loop.run_in_executor(
                None, 
                lambda: resource.update(query={'sys_id': incident['sys_id']}, payload=data)
            )
            
            if hasattr(result, 'status_code'):
                logger.info(f"ServiceNow update status for {number}: {result.status_code}")
                if result.status_code not in [200, 201]:
                    logger.error(f"Update failed with status {result.status_code}")
            elif isinstance(result, dict):
                logger.info(f"ServiceNow update response for {number}: {result.get('number')}")
            else:
                logger.info(f"ServiceNow update completed for {number}")
                
            return result
        except Exception as e:
            logger.error(f"ServiceNow update_incident error for {number}: {e}")
            raise

    async def resolve_incident(self, number: str, resolution_note: str) -> Dict[str, Any]:
        """Résout un incident ServiceNow."""
        incident = await self.get_incident(number)
        if not incident:
            raise ValueError(f"Incident {number} introuvable")

        payload = {
            "state": "6",  # Resolved
            "close_notes": resolution_note
        }
        
        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            result = await loop.run_in_executor(
                None, 
                lambda: resource.update(query={'sys_id': incident['sys_id']}, payload=payload)
            )
            return result
        except Exception as e:
            logger.error(f"ServiceNow resolve_incident error: {e}")
            raise

    async def delete_incident(self, number: str) -> Dict[str, Any]:
        """Supprime un incident ServiceNow."""
        incident = await self.get_incident(number)
        if not incident:
            raise ValueError(f"Incident {number} introuvable")

        loop = asyncio.get_event_loop()
        try:
            resource = self._get_resource('incident')
            await loop.run_in_executor(
                None, 
                lambda: resource.delete(query={'sys_id': incident['sys_id']})
            )
            return {"status": "deleted", "number": number}
        except Exception as e:
            logger.error(f"ServiceNow delete_incident error: {e}")
            raise

    async def add_incident_note(self, incident_number: str, text: str, is_work_note: bool = False) -> Dict[str, Any]:
        """Ajoute un commentaire ou une note de travail à un incident."""
        loop = asyncio.get_event_loop()
        try:
            incident = await self.get_incident(incident_number)
            if not incident:
                raise Exception(f"Incident {incident_number} not found")
            
            sys_id = incident.get('sys_id')
            resource = self._get_resource('incident')
            
            update_data = {
                'work_notes' if is_work_note else 'comments': text
            }
            
            response = await loop.run_in_executor(None, lambda: resource.update(query={'sys_id': sys_id}, payload=update_data))
            return response
        except Exception as e:
            logger.error(f"ServiceNow add_incident_note error: {e}")
            raise

    async def get_incident_history(self, incident_number: str) -> List[Dict[str, Any]]:
        """Récupère l'historique des activités (journal) d'un incident."""
        loop = asyncio.get_event_loop()
        try:
            incident = await self.get_incident(incident_number)
            if not incident:
                return []
            
            incident_sys_id = incident.get('sys_id')
            
            journal_resource = self._get_resource('sys_journal_field')
            query = f"element_id={incident_sys_id}"
            
            response = await loop.run_in_executor(None, lambda: journal_resource.get(query=query))
            entries = list(response.all())
            
            entries.sort(key=lambda x: x.get('sys_created_on', ''))
            
            history = []
            for entry in entries:
                history.append({
                    "sys_id": entry.get('sys_id'),
                    "type": entry.get('element'),
                    "text": entry.get('value'),
                    "user": entry.get('sys_created_by'),
                    "timestamp": entry.get('sys_created_on', '').replace(' ', 'T') + "Z" if entry.get('sys_created_on') else None
                })
                
            return history
        except Exception as e:
            logger.error(f"ServiceNow get_incident_history error: {e}")
            return []

servicenow_service = ServiceNowService()

if __name__ == "__main__":
    import asyncio
    async def test():
        print("Testing ServiceNow integration with pysnow...")
        try:
            res = await servicenow_service.create_incident("Test incident from pysnow service", "low")
            num = res.get('number')
            print(f"Created: {num}")
            
            inc = await servicenow_service.get_incident(num)
            print(f"Fetched: {inc.get('number')} - {inc.get('short_description')}")
            
            inics = await servicenow_service.get_incidents(priority="3", limit=2)
            print(f"Listed {len(inics)} incidents")
            
        except Exception as e:
            print(f"Test failed: {e}")

    asyncio.run(test())
