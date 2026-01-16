import pytest
from flask import Flask
# ✅ 1. (แก้ไข) เปลี่ยน 'your_email_module' เป็น 'email_utils'
from email_service import mail, send_notification_email 
from flask_mail import Message

# (Setup App จำลองสำหรับเทส)
@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['MAIL_SENDER'] = 'test@sender.com'
    mail.init_app(app)
    return app

def test_send_notification_email(app, mocker):
    """
    เทสว่าฟังก์ชัน send_notification_email
    เรียก mail.send ด้วย Message ที่ถูกต้อง
    """
    
    # ✅ 2. (แก้ไข) เปลี่ยน 'your_email_module' เป็น 'email_utils'
    mock_send = mocker.patch('email_service.mail.send')

    # (โค้ดส่วนที่เหลือเหมือนเดิม)
    with app.app_context():
        send_notification_email(
            subject="วิชาฟิสิกส์",
            recipient_email="67310003@go.buu.ac.th"
        )

    mock_send.assert_called_once()
    sent_msg = mock_send.call_args[0][0] 
    assert isinstance(sent_msg, Message)
    assert sent_msg.subject == "🔔 แจ้งเตือน: ได้เวลาอ่าน วิชาฟิสิกส์ แล้ว!"
    assert sent_msg.recipients == ["67310003@go.buu.ac.th"]
    assert "วิชาฟิสิกส์" in sent_msg.body