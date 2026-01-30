from fastapi.responses import StreamingResponse
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

@router.get("/reports/incidents/analysis")
async def generate_incident_report(
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth.check_admin_role)
):
    try:
        from ...services.servicenow_service import servicenow_service
       
        incidents = await servicenow_service.get_incidents(limit=100)
        
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 24)
        p.drawString(50, height - 50, "Incident Analysis Report")
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 70, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        y = height - 120
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "Executive Summary")
        y -= 25
        p.setFont("Helvetica", 12)
        total = len(incidents)
        critical = sum(1 for i in incidents if i.get('priority') == '1')
        resolved = sum(1 for i in incidents if i.get('state') in ['6', '7'])
        
        p.drawString(50, y, f"Total Incidents Analysis: {total}")
        y -= 20
        p.drawString(50, y, f"Critical Severity: {critical}")
        y -= 20
        p.drawString(50, y, f"Resolved Incidents: {resolved}")
        y -= 20
        efficiency = int((resolved/total)*100) if total > 0 else 0
        p.drawString(50, y, f"Resolution Efficiency: {efficiency}%")
        
        y -= 40
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "AI Detected Insights")
        y -= 25
        p.setFont("Helvetica", 10)
        
        insights = []
        if critical > 5: insights.append("- CRITICAL SPIKE detected in incident flow.")
        elif critical > 0: insights.append("- Critical incidents present. Immediate attention advised.")
        
        if efficiency < 50: insights.append("- LOW RESOLUTION rate observed. Agent augmentation recommended.")
        else: insights.append("- Healthy resolution rate maintained by AI/Human workforce.")
        
        from collections import Counter
        cats = [i.get('category', 'unknown') for i in incidents]
        if cats:
            top = Counter(cats).most_common(1)[0]
            insights.append(f"- Dominant Incident Category: {top[0]} ({top[1]} tickets)")

        for ins in insights:
            p.drawString(60, y, ins)
            y -= 15
            
        y -= 40
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "Recent Critical/High Incidents")
        y -= 25
        
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "ID")
        p.drawString(120, y, "Summary")
        p.drawString(450, y, "Status")
        y -= 5
        p.line(50, y, 550, y)
        y -= 15
        
        p.setFont("Helvetica", 9)
        high_prio = [i for i in incidents if i.get('priority') in ['1', '2']][:15]
        
        if not high_prio:
            p.drawString(50, y, "No recent high priority incidents found.")
        
        for inc in high_prio:
            id_ = inc.get('number', 'N/A')
            desc = inc.get('short_description', 'No description')[:60] + "..."
            state_map = {"1": "New", "2": "In Progress", "6": "Resolved"}
            st = state_map.get(inc.get('state', '1'), "Other")
            
            p.drawString(50, y, id_)
            p.drawString(120, y, desc)
            p.drawString(450, y, st)
            y -= 15
            
            if y < 50: # Page break
                p.showPage()
                y = height - 50
                p.setFont("Helvetica", 9)
                
        p.showPage()
        p.save()
        
        buffer.seek(0)
        return StreamingResponse(
            buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": "attachment; filename=incident_analysis.pdf"}
        )

    except Exception as e:
        logger.error(f"Report Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")
