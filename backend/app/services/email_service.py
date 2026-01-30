import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from loguru import logger
from typing import Optional, Dict, Any

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.email_from = os.getenv("EMAIL_FROM")

    def send_email(self, to_email: str, subject: str, html_body: str, text_body: str):
        if not all([self.smtp_user, self.smtp_password, self.email_from]):
            logger.error("SMTP credentials not fully configured. Skipping email.")
            return False

        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Team 31 Support <{self.email_from}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            text = msg.as_string()
            server.sendmail(self.email_from, to_email, text)
            server.quit()
            logger.info(f"HTML Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def get_html_template(self, ticket_id: str, subject: str, description: str, priority: str, is_urgent: bool) -> str:
        urgency_banner = ""
        if is_urgent:
            urgency_banner = """
            <div style="background-color: #ff4d4d; color: white; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 20px; font-weight: bold; border: 2px solid #cc0000;">
                🚨 URGENT SETUP REQUIRED: This IoT incident requires immediate attention.
            </div>
            """

        priority_color = "#4CAF50" 
        if priority.lower() == "high":
            priority_color = "#ff9800" 
        if is_urgent:
            priority_color = "#f44336" 

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #e0e0e0; background-color: #121212; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border: 1px solid #333; }}
                .header {{ background: linear-gradient(135deg, #2c3e50, #000000); color: white; padding: 30px 20px; text-align: center; }}
                .content {{ padding: 30px; }}
                .footer {{ background-color: #181818; color: #888; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #333; }}
                .ticket-card {{ background-color: #252525; border-left: 4px solid {priority_color}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px; }}
                .label {{ color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }}
                .value {{ font-size: 18px; color: #ffffff; margin-bottom: 15px; font-weight: 500; }}
                .description-box {{ background-color: #2d2d2d; padding: 15px; border-radius: 8px; color: #cccccc; white-space: pre-wrap; font-size: 14px; border: 1px solid #444; }}
                .team-badge {{ display: inline-block; background-color: #3d3d3d; color: #00d2ff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="team-badge">TEAM 31</div>
                    <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Support Notification</h1>
                </div>
                <div class="content">
                    {urgency_banner}
                    
                    <p style="font-size: 16px; color: #ffffff;">Hello,</p>
                    <p>A new support incident has been registered in the <strong>Team 31</strong> ecosystem.</p>
                    
                    <div class="ticket-card">
                        <div class="label">Incident Number</div>
                        <div class="value">{ticket_id}</div>
                        
                        <div class="label">Priority</div>
                        <div style="color: {priority_color}; font-weight: bold; font-size: 18px; margin-bottom: 15px; text-transform: uppercase;">{priority}</div>
                        
                        <div class="label">Subject</div>
                        <div class="value">{subject}</div>
                    </div>
                    
                    <div class="label">Technical Description</div>
                    <div class="description-box">{description}</div>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 20px;">
                        <p style="font-size: 14px; color: #a0a0a0;">
                            Our automated AI agents are currently analyzing this issue. You will receive further updates as progress is made.
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Team 31 - Advanced Utility AI System</p>
                    <p>Confidential Support Communication</p>
                </div>
            </div>
        </body>
        </html>
        """

    async def send_ticket_notification(
        self, 
        to_email: str, 
        ticket_id: str, 
        subject: str, 
        description: str, 
        priority: str,
        is_urgent_iot: bool = False
    ):
        email_subject = f"[{ticket_id}] {subject}"
        
        if is_urgent_iot:
            email_subject = f"🚨 URGENT SETUP: {email_subject}"

        html_body = self.get_html_template(ticket_id, subject, description, priority, is_urgent_iot)
        
        text_body = f"""
TEAM 31 SUPPORT
----------------
Ticket ID: {ticket_id}
Priority: {priority}
Subject: {subject}
Description: {description}
"""
        
        if is_urgent_iot:
            text_body += "\n\n🚨 URGENT IOT SETUP REQUEST 🚨\nAttend to this immediately."

        text_body += "\n\nBest regards,\nTeam 31"

        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.send_email, to_email, email_subject, html_body, text_body)

email_service = EmailService()
